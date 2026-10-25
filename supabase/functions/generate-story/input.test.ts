import { describe, expect, it } from 'vitest';
import { parseStoryInput, parseStoryResult } from './input.ts';

describe('parseStoryInput', () => {
  it('accepts a level and a topic', () => {
    expect(parseStoryInput({ level: 'C1', topic: '  sci-fi   on Mars ' })).toEqual({
      level: 'C1',
      topic: 'sci-fi on Mars',
      prompt: '',
    });
  });

  it('keeps the reader idea and rejects one that is too long', () => {
    expect(
      parseStoryInput({ level: 'B2', topic: 'Comedy', prompt: ' a cat who  runs a cafe ' }).prompt,
    ).toBe('a cat who runs a cafe');
    expect(() =>
      parseStoryInput({ level: 'B2', topic: 'Comedy', prompt: 'x'.repeat(501) }),
    ).toThrow(/500/);
  });

  it('rejects an unknown level', () => {
    expect(() => parseStoryInput({ level: 'A1', topic: 'comedy' })).toThrow(/level/);
  });

  it('rejects a missing or too long topic', () => {
    expect(() => parseStoryInput({ level: 'B2', topic: '  ' })).toThrow(/topic/);
    expect(() => parseStoryInput({ level: 'B2', topic: 'x'.repeat(61) })).toThrow(/60/);
  });

  it('rejects an empty body', () => {
    expect(() => parseStoryInput(null)).toThrow();
  });
});

describe('parseStoryResult', () => {
  it('joins paragraphs with blank lines', () => {
    const raw = JSON.stringify({
      title: ' The  Last Signal ',
      paragraphs: ['First  part.', '', 'Second part.', 'Third part.'],
    });
    expect(parseStoryResult(raw)).toEqual({
      title: 'The Last Signal',
      content: 'First part.\n\nSecond part.\n\nThird part.',
    });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseStoryResult('not json')).toThrow(/unexpected/);
  });

  it('rejects a story that is too short or untitled', () => {
    expect(() => parseStoryResult(JSON.stringify({ title: 'T', paragraphs: ['a'] }))).toThrow();
    expect(() =>
      parseStoryResult(JSON.stringify({ title: '', paragraphs: ['a', 'b', 'c'] })),
    ).toThrow();
  });
});
