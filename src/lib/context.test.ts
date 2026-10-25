import { describe, expect, it } from 'vitest';
import { sentenceAround } from './context';

function around(content: string, term: string) {
  const start = content.indexOf(term);
  return sentenceAround(content, start, start + term.length);
}

describe('sentenceAround', () => {
  const text =
    'The programme began on Friday. Kim Bình is characterised by rugged, fragmented terrain! ' +
    'Residents welcomed it.\n\nA new paragraph starts here.';

  it('returns the sentence that contains the selection', () => {
    expect(around(text, 'fragmented')).toBe(
      'Kim Bình is characterised by rugged, fragmented terrain!',
    );
  });

  it('works for the first sentence', () => {
    expect(around(text, 'programme')).toBe('The programme began on Friday.');
  });

  it('stops at paragraph breaks', () => {
    expect(around(text, 'paragraph')).toBe('A new paragraph starts here.');
    expect(around(text, 'welcomed')).toBe('Residents welcomed it.');
  });

  it('keeps a selection that spans two sentences whole', () => {
    expect(around(text, 'Friday. Kim')).toBe(
      'The programme began on Friday. Kim Bình is characterised by rugged, fragmented terrain!',
    );
  });

  it('trims a very long sentence to a window around the selection', () => {
    const long = `${'word '.repeat(200)}target ${'word '.repeat(200)}`;
    const result = around(long, 'target');
    expect(result).toContain('target');
    expect(result.length).toBeLessThanOrEqual(400);
  });
});
