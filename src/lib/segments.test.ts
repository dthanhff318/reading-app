import { describe, expect, it } from 'vitest';
import { buildParagraphs, findOverlap, trimRange } from './segments';

const ann = (id: string, start: number, end: number) => ({
  id,
  start_offset: start,
  end_offset: end,
});

describe('buildParagraphs', () => {
  it('splits content on newlines and keeps absolute offsets', () => {
    const content = 'Hello world.\n\nSecond line.';
    const paragraphs = buildParagraphs(content, []);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[1].start).toBe(14);
    expect(paragraphs[1].segments).toEqual([
      { start: 14, end: 26, text: 'Second line.', annotationId: null },
    ]);
  });

  it('marks annotated ranges inside a paragraph', () => {
    const content = 'The quick brown fox';
    const [p] = buildParagraphs(content, [ann('a', 4, 9)]);
    expect(p.segments.map((s) => [s.text, s.annotationId])).toEqual([
      ['The ', null],
      ['quick', 'a'],
      [' brown fox', null],
    ]);
  });

  it('splits an annotation that spans two paragraphs', () => {
    const content = 'one two\nthree four';
    const paragraphs = buildParagraphs(content, [ann('a', 4, 13)]);
    expect(paragraphs[0].segments.at(-1)).toMatchObject({ text: 'two', annotationId: 'a' });
    expect(paragraphs[1].segments[0]).toMatchObject({ text: 'three', annotationId: 'a' });
  });

  it('ignores annotations that overlap an earlier one', () => {
    const [p] = buildParagraphs('abcdefgh', [ann('a', 0, 4), ann('b', 2, 6)]);
    expect(p.segments.map((s) => s.annotationId)).toEqual(['a', null]);
  });
});

describe('trimRange', () => {
  it('drops surrounding whitespace', () => {
    expect(trimRange('  hello  ', 0, 9)).toEqual({ start: 2, end: 7 });
  });

  it('returns null for whitespace-only ranges', () => {
    expect(trimRange('a   b', 1, 4)).toBeNull();
  });
});

describe('findOverlap', () => {
  const list = [ann('a', 10, 20)];
  it('finds annotations that intersect the range', () => {
    expect(findOverlap(list, 15, 25)?.id).toBe('a');
  });
  it('treats touching ranges as non-overlapping', () => {
    expect(findOverlap(list, 20, 25)).toBeUndefined();
  });
});
