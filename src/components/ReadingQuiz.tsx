import { useEffect, useRef, useState } from 'react';
import { generateQuiz } from '../lib/api';
import { scoreQuiz, type QuizAnswers } from '../lib/quiz';
import type { Article, QuizDifficulty, QuizQuestion, QuizSize } from '../lib/types';

type QuizState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; questions: QuizQuestion[] };

const SIZES: QuizSize[] = [5, 10];
const DIFFICULTIES: { value: QuizDifficulty; label: string; hint: string }[] = [
  { value: 'standard', label: 'Standard', hint: '~IELTS 6' },
  { value: 'hard', label: 'Hard', hint: '~IELTS 7.5+' },
];
const LETTERS = ['A', 'B', 'C', 'D'];

function scoreMessage(correct: number, total: number) {
  const ratio = total ? correct / total : 0;
  if (ratio === 1) return 'Perfect score!';
  if (ratio >= 0.8) return 'Great reading!';
  if (ratio >= 0.5) return 'Good effort. Check the explanations below.';
  return 'Read the text again and give it another go.';
}

/** Gemini-written multiple-choice reading test for one article. */
export default function ReadingQuiz({ article }: { article: Article }) {
  const [size, setSize] = useState<QuizSize>(5);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('hard');
  const [quiz, setQuiz] = useState<QuizState>({ status: 'idle' });
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [submitted, setSubmitted] = useState(false);
  const scoreRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (submitted) scoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [submitted]);

  async function generate() {
    setQuiz({ status: 'loading' });
    setAnswers({});
    setSubmitted(false);
    try {
      const questions = await generateQuiz(article, size, difficulty);
      if (mounted.current) setQuiz({ status: 'ready', questions });
    } catch (err) {
      if (!mounted.current) return;
      setQuiz({
        status: 'error',
        message: err instanceof Error ? err.message : 'Could not write questions right now.',
      });
    }
  }

  function retry() {
    setAnswers({});
    setSubmitted(false);
  }

  const questions = quiz.status === 'ready' ? quiz.questions : [];
  const answeredCount = Object.keys(answers).length;
  const score = scoreQuiz(questions, answers);

  return (
    <section className="quiz" id="reading-test" aria-labelledby="quiz-title">
      <div className="quiz-head">
        <div>
          <h2 id="quiz-title">Reading test</h2>
          <p className="muted">
            Multiple-choice questions about this text, written by Gemini. Explanations are in
            Vietnamese.
          </p>
        </div>
      </div>

      {quiz.status !== 'ready' && (
        <div className="quiz-start">
          <div className="chips" role="radiogroup" aria-label="Number of questions">
            {SIZES.map((n) => (
              <label key={n} className="chip">
                <input
                  type="radio"
                  name="quiz-size"
                  checked={size === n}
                  disabled={quiz.status === 'loading'}
                  onChange={() => setSize(n)}
                />
                <span>
                  <strong>{n}</strong> questions
                </span>
              </label>
            ))}
          </div>
          <div className="chips" role="radiogroup" aria-label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <label key={d.value} className="chip">
                <input
                  type="radio"
                  name="quiz-difficulty"
                  checked={difficulty === d.value}
                  disabled={quiz.status === 'loading'}
                  onChange={() => setDifficulty(d.value)}
                />
                <span>
                  <strong>{d.label}</strong> <span className="chip-hint">{d.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={quiz.status === 'loading'}
            onClick={generate}
          >
            {quiz.status === 'loading' ? 'Writing questions…' : '✨ Generate questions'}
          </button>
          <div aria-live="polite">
            {quiz.status === 'loading' && (
              <p className="suggest-status is-loading">
                Gemini is reading the text and writing {size}{' '}
                {difficulty === 'hard' ? 'hard ' : ''}questions…
              </p>
            )}
            {quiz.status === 'error' && <p className="form-error">{quiz.message}</p>}
          </div>
        </div>
      )}

      {quiz.status === 'ready' && (
        <>
          {submitted && (
            <div className="quiz-score" ref={scoreRef} role="status">
              <span className="quiz-score-value">
                {score.correct}/{score.total}
              </span>
              <span>{scoreMessage(score.correct, score.total)}</span>
            </div>
          )}

          <ol className="quiz-list">
            {questions.map((q, qi) => {
              const chosen = answers[qi];
              const isRight = chosen === q.answerIndex;
              return (
                <li key={qi} className="quiz-question">
                  <p className="quiz-prompt" id={`q-${qi}`}>
                    <span className="quiz-number">{qi + 1}.</span> {q.question}
                  </p>
                  <div className="quiz-options" role="radiogroup" aria-labelledby={`q-${qi}`}>
                    {q.options.map((option, oi) => {
                      const classes = ['quiz-option'];
                      if (chosen === oi) classes.push('is-chosen');
                      if (submitted && oi === q.answerIndex) classes.push('is-correct');
                      if (submitted && chosen === oi && !isRight) classes.push('is-wrong');
                      return (
                        <button
                          key={oi}
                          type="button"
                          role="radio"
                          aria-checked={chosen === oi}
                          className={classes.join(' ')}
                          disabled={submitted}
                          onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                        >
                          <span className="quiz-letter">{LETTERS[oi]}</span>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                  {submitted && (
                    <p className={isRight ? 'quiz-explain is-right' : 'quiz-explain'}>
                      <strong>
                        {isRight
                          ? 'Correct. '
                          : chosen === undefined
                            ? `Not answered. The answer is ${LETTERS[q.answerIndex]}. `
                            : `The answer is ${LETTERS[q.answerIndex]}. `}
                      </strong>
                      {q.explanation}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="quiz-actions">
            {submitted ? (
              <>
                <button type="button" className="btn btn-ghost" onClick={retry}>
                  Try again
                </button>
                <button type="button" className="btn btn-primary" onClick={generate}>
                  ✨ New questions
                </button>
              </>
            ) : (
              <>
                <span className="muted quiz-progress">
                  {answeredCount}/{questions.length} answered
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={answeredCount === 0}
                  onClick={() => setSubmitted(true)}
                >
                  Check answers
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
