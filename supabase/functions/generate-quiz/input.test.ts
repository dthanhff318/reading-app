import { describe, expect, it } from 'vitest';
import { MAX_CONTENT_LENGTH, parseQuizInput, parseQuizResult } from './input.ts';

const question = (overrides: Record<string, unknown> = {}) => ({
  question: ' What is the  main idea? ',
  options: ['A cat', 'A dog', 'A bird', 'A fish'],
  answerIndex: 1,
  explanation: ' The text  is about a dog. ',
  ...overrides,
});

// Keeps options in their original order so answers are predictable in tests
const noShuffle = <T>(items: T[]) => items;

describe('parseQuizInput', () => {
  it('accepts a title, content, a question count and a difficulty', () => {
    expect(
      parseQuizInput({ title: ' The  Voyage ', content: 'Some text.', count: 10, difficulty: 'standard' }),
    ).toEqual({
      title: 'The Voyage',
      content: 'Some text.',
      count: 10,
      difficulty: 'standard',
    });
  });

  it('defaults to hard questions and rejects an unknown difficulty', () => {
    expect(parseQuizInput({ title: 'T', content: 'Text.' }).difficulty).toBe('hard');
    expect(() => parseQuizInput({ title: 'T', content: 'Text.', difficulty: 'insane' })).toThrow(
      /standard or hard/,
    );
  });

  it('defaults to 5 questions and rejects other counts', () => {
    expect(parseQuizInput({ title: 'T', content: 'Text.' }).count).toBe(5);
    expect(() => parseQuizInput({ title: 'T', content: 'Text.', count: 50 })).toThrow(/5 or 10/);
  });

  it('rejects missing content', () => {
    expect(() => parseQuizInput({ title: 'T', content: '   ' })).toThrow(/text/);
    expect(() => parseQuizInput(null)).toThrow();
  });

  it('trims very long articles instead of rejecting them', () => {
    const long = 'word '.repeat(MAX_CONTENT_LENGTH);
    expect(parseQuizInput({ title: 'T', content: long }).content.length).toBeLessThanOrEqual(
      MAX_CONTENT_LENGTH,
    );
  });
});

describe('parseQuizResult', () => {
  it('cleans up questions and keeps the right answer', () => {
    const raw = JSON.stringify({ questions: [question()] });
    expect(parseQuizResult(raw, noShuffle)).toEqual([
      {
        question: 'What is the main idea?',
        options: ['A cat', 'A dog', 'A bird', 'A fish'],
        answerIndex: 1,
        explanation: 'The text is about a dog.',
      },
    ]);
  });

  it('tracks the right answer after shuffling the options', () => {
    const reverse = <T>(items: T[]) => [...items].reverse();
    const [q] = parseQuizResult(JSON.stringify({ questions: [question()] }), reverse);
    expect(q.options).toEqual(['A fish', 'A bird', 'A dog', 'A cat']);
    expect(q.options[q.answerIndex]).toBe('A dog');
  });

  it('drops malformed questions but keeps the valid ones', () => {
    const raw = JSON.stringify({
      questions: [
        question(),
        question({ options: ['Only', 'three', 'options'] }),
        question({ answerIndex: 7 }),
        question({ question: '' }),
        question({ options: ['Same', 'Same', 'Other', 'Else'] }),
      ],
    });
    expect(parseQuizResult(raw, noShuffle)).toHaveLength(1);
  });

  it('rejects invalid JSON or an answer with no usable questions', () => {
    expect(() => parseQuizResult('not json', noShuffle)).toThrow(/unexpected/);
    expect(() => parseQuizResult(JSON.stringify({ questions: [] }), noShuffle)).toThrow();
  });
});
