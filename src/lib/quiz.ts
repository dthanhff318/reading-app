import type { QuizQuestion } from './types';

/** Chosen option index per question index. Unanswered questions are absent. */
export type QuizAnswers = Record<number, number>;

export function scoreQuiz(questions: QuizQuestion[], answers: QuizAnswers) {
  const correct = questions.filter((q, i) => answers[i] === q.answerIndex).length;
  return { correct, total: questions.length };
}
