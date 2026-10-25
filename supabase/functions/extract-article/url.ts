/** An error whose message is safe to show to the user, with the HTTP status to answer with. */
export class ExtractError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal'];

/**
 * True when a hostname points at a loopback, private, link-local or otherwise internal
 * address. Used to stop the function from being used to probe internal networks (SSRF).
 * Expects a hostname as produced by the URL parser, which already normalises numeric
 * IPv4 forms (e.g. "2130706433" -> "127.0.0.1") and wraps IPv6 in brackets.
 */
export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (host === 'localhost' || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return true;

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast and reserved
    );
  }

  if (host.includes(':')) {
    return (
      host === '::' ||
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80') ||
      host.startsWith('::ffff:') // IPv4-mapped, could hide a private IPv4
    );
  }

  return false;
}

/** Validates user input and returns a URL that is safe to fetch, or throws an ExtractError. */
export function parseArticleUrl(raw: unknown): URL {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new ExtractError('Please enter a link.');
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ExtractError('That does not look like a valid link.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ExtractError('Only http and https links can be imported.');
  }
  if (url.username || url.password) {
    throw new ExtractError('Links with a username or password cannot be imported.');
  }
  if (isBlockedHost(url.hostname)) {
    throw new ExtractError('This link cannot be imported.');
  }
  return url;
}
