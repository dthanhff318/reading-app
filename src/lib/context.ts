const MAX_CONTEXT_LENGTH = 400;

const isSentenceEnd = (ch: string | undefined) => ch === '.' || ch === '!' || ch === '?';
const isSpace = (ch: string | undefined) => ch !== undefined && /\s/.test(ch);

/**
 * Returns the sentence around content[start, end), so a word can be explained in context.
 * Sentences end at . ! ? followed by whitespace, or at a line break. Very long sentences
 * are cut to a window centred on the selection.
 */
export function sentenceAround(content: string, start: number, end: number): string {
  let from = start;
  while (from > 0) {
    const prev = content[from - 1];
    if (prev === '\n' || (isSpace(prev) && isSentenceEnd(content[from - 2]))) break;
    from--;
  }

  let to = end;
  while (to < content.length) {
    const ch = content[to];
    if (ch === '\n') break;
    to++;
    if (isSentenceEnd(ch) && (to === content.length || isSpace(content[to]))) break;
  }

  if (to - from > MAX_CONTEXT_LENGTH) {
    const pad = Math.max(0, Math.floor((MAX_CONTEXT_LENGTH - (end - start)) / 2));
    from = Math.max(from, start - pad);
    to = Math.min(to, end + pad);
  }
  return content.slice(from, to).trim();
}
