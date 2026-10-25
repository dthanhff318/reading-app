// Fetches a web page (e.g. a news article) and returns its title and main text as plain
// paragraphs, so the app can import articles from a link. Deployed with verify_jwt off:
// the new sb_publishable keys are not JWTs, and the function only reads public pages.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { Readability } from 'npm:@mozilla/readability@0.6';
import { parseHTML } from 'npm:linkedom@0.18';
import { cleanTitle, joinParagraphs } from './text.ts';
import { ExtractError, parseArticleUrl } from './url.ts';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const MAX_CONTENT_LENGTH = 200_000; // matches the articles.content check constraint

// Best-effort per-IP limit. State lives in one isolate, so it resets when the isolate is recycled.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

const BLOCK_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, pre';
const SKIP_SELECTOR = 'figure, figcaption, img, picture, video, table, script, style, noscript';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

/** Reads the body up to a byte limit and decodes it with the charset the server declared. */
async function readHtml(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new ExtractError('That page is too large to import.', 422);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const charset = res.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/** Fetches a page, following redirects by hand so every hop is checked against the SSRF guard. */
async function fetchPage(start: URL): Promise<{ html: string; url: URL }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ReadingRoomBot/1.0; +https://reading-app-beryl-three.vercel.app)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
      throw new ExtractError(
        timedOut ? 'The site took too long to respond.' : 'Could not reach that site.',
        502,
      );
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new ExtractError('The site sent a broken redirect.', 502);
      url = parseArticleUrl(new URL(location, url).href);
      continue;
    }
    if (!res.ok) throw new ExtractError(`The site responded with an error (${res.status}).`, 502);

    const type = res.headers.get('content-type') ?? '';
    if (!/html/i.test(type)) throw new ExtractError('That link is not a web page.', 422);

    return { html: await readHtml(res), url };
  }
  throw new ExtractError('The link redirects too many times.', 502);
}

function extractArticle(html: string) {
  const { document } = parseHTML(html);
  // Read before Readability runs, because it mutates the document.
  const metaTitle =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
    document.querySelector('title')?.textContent;

  const article = new Readability(document).parse();
  if (!article?.content) {
    throw new ExtractError('Could not find the article text on that page.', 422);
  }

  const { document: body } = parseHTML(`<!doctype html><html><body>${article.content}</body></html>`);
  for (const el of body.querySelectorAll(SKIP_SELECTOR)) el.remove();

  // Take only outermost blocks so text in e.g. <li><p>…</p></li> is not counted twice.
  const blocks = [...body.querySelectorAll(BLOCK_SELECTOR)].filter(
    (el) => !el.parentElement?.closest(BLOCK_SELECTOR),
  );
  const paragraphs = blocks.length
    ? blocks.map((el) => el.textContent ?? '')
    : (article.textContent ?? '').split(/\n+/);

  const content = joinParagraphs(paragraphs);
  if (!content) throw new ExtractError('Could not find the article text on that page.', 422);
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new ExtractError('That article is too long to import.', 422);
  }

  return {
    title: cleanTitle(metaTitle || article.title),
    content,
    siteName: article.siteName ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return json({ error: 'Too many imports in a short time. Please wait a minute.' }, 429);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const start = parseArticleUrl((body as { url?: unknown }).url);
    const { html, url } = await fetchPage(start);
    return json({ ...extractArticle(html), sourceUrl: url.href });
  } catch (err) {
    if (err instanceof ExtractError) return json({ error: err.message }, err.status);
    console.error(JSON.stringify({ msg: 'extract-article failed', error: String(err) }));
    return json({ error: 'Something went wrong while importing that link.' }, 500);
  }
});
