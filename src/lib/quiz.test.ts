import { describe, expect, it } from 'vitest';
import { scoreQuiz } from './quiz';
import type { QuizQuestion } from './types';

const q = (answerIndex: number): QuizQuestion => ({
  question: 'Q?',
  options: ['a', 'b', 'c', 'd'],
  answerIndex,
  explanation: '',
});

describe('scoreQuiz', () => {
  it('counts correct answers', () => {
    expect(scoreQuiz([q(0), q(1), q(2)], { 0: 0, 1: 3, 2: 2 })).toEqual({ correct: 2, total: 3 });
  });

  it('treats unanswered questions as wrong', () => {
    expect(scoreQuiz([q(0), q(1)], { 0: 0 })).toEqual({ correct: 1, total: 2 });
  });

  it('handles an empty quiz', () => {
    expect(scoreQuiz([], {})).toEqual({ correct: 0, total: 0 });
  });
});
