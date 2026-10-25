const MAX_TITLE_LENGTH = 300;

function squash(text: string) {
  return text.replace(/[\s ]+/g, ' ').trim();
}

/**
 * Turns extracted paragraph texts into the plain-text format the app stores:
 * one paragraph per block, separated by a blank line.
 */
export function joinParagraphs(paragraphs: string[]): string {
  const result: string[] = [];
  for (const raw of paragraphs) {
    const text = squash(raw);
    if (text && text !== result[result.length - 1]) result.push(text);
  }
  return result.join('\n\n');
}

export function cleanTitle(raw: string | null | undefined): string {
  return squash(raw ?? '').slice(0, MAX_TITLE_LENGTH) || 'Untitled';
}
