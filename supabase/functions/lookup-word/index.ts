// Looks up a selected word or phrase with Gemini and returns its Vietnamese meaning in
// context plus its IPA pronunciation. The Gemini key stays server-side as the
// GEMINI_API_KEY secret. Deployed with verify_jwt off, like extract-article.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { LookupError, parseLookupInput, parseLookupResult } from './input.ts';

// A lite (cheapest) model is enough for a short translation plus IPA. With minimal thinking
// this alias answered in ~1s, while gemini-3.1-flash-lite took 5-12s.
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-lite-latest';
const GEMINI_TIMEOUT_MS = 15_000;

// Best-effort per-IP limit. State lives in one isolate, so it resets when the isolate is recycled.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

const SYSTEM_PROMPT = `You help Vietnamese learners read English texts.
Given an English word or phrase and the sentence it appears in, reply with:
- meaning: its meaning in Vietnamese for this exact context, short like a learner's dictionary
  (a few words, at most one sentence). If it is an idiom or phrasal verb, explain the whole phrase.
- pronunciation: IPA in slashes, American English. For a phrase, give the IPA of the whole phrase.
- partOfSpeech: a short English label such as noun, verb, adjective, adverb, phrase or idiom.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    meaning: { type: 'STRING' },
    pronunciation: { type: 'STRING' },
    partOfSpeech: { type: 'STRING' },
  },
  required: ['meaning', 'pronunciation', 'partOfSpeech'],
};

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

async function askGemini(text: string, context: string, apiKey: string) {
  const prompt = context
    ? `Word or phrase: ${text}\nSentence: ${context}`
    : `Word or phrase: ${text}`;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            // No reasoning needed for a dictionary lookup; keeps it fast and cheap.
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
        }),
      },
    );
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    throw new LookupError(timedOut ? 'Gemini took too long to answer.' : 'Could not reach Gemini.', 502);
  }

  if (!res.ok) {
    console.error(
      JSON.stringify({ msg: 'gemini request failed', status: res.status, body: await res.text() }),
    );
    if (res.status === 429) throw new LookupError('Gemini is busy right now. Try again shortly.', 429);
    throw new LookupError('Gemini could not answer right now.', 502);
  }

  const data = await res.json();
  const answer: string | undefined = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('');
  if (!answer) throw new LookupError('Gemini could not explain this selection.', 502);
  return parseLookupResult(answer);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return json({ error: 'Too many lookups in a short time. Please wait a minute.' }, 429);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error(JSON.stringify({ msg: 'GEMINI_API_KEY secret is not set' }));
    return json({ error: 'Meaning suggestions are not set up yet.' }, 503);
  }

  try {
    const { text, context } = parseLookupInput(await req.json().catch(() => null));
    return json(await askGemini(text, context, apiKey));
  } catch (err) {
    if (err instanceof LookupError) return json({ error: err.message }, err.status);
    console.error(JSON.stringify({ msg: 'lookup-word failed', error: String(err) }));
    return json({ error: 'Something went wrong while looking that up.' }, 500);
  }
});
