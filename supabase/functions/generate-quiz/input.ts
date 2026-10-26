/** An error whose message is safe to show to the user, with the HTTP status to answer with. */
export class QuizError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const QUESTION_COUNTS = [5, 10] as const;
export type QuestionCount = (typeof QUESTION_COUNTS)[number];

export const DIFFICULTIES = ['standard', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// About 3,000 words: plenty for a reading test while keeping the Gemini request cheap.
export const MAX_CONTENT_LENGTH = 18_000;
const MAX_TITLE_LENGTH = 300;
const OPTION_COUNT = 4;

export interface QuizInput {
  title: string;
  content: string;
  count: QuestionCount;
  difficulty: Difficulty;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  /** Index into `options` of the correct answer. */
  answerIndex: number;
  explanation: string;
}

const squash = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Fisher-Yates shuffle that returns a new array. */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Validates the request body: the article title and text plus how many questions to write. */
export function parseQuizInput(body: unknown): QuizInput {
  const { title, content, count, difficulty } = (body ?? {}) as {
    title?: unknown;
    content?: unknown;
    count?: unknown;
    difficulty?: unknown;
  };

  if (typeof content !== 'string' || !content.trim()) {
    throw new QuizError('There is no text to make questions from.');
  }

  const cleanCount = count ?? 5;
  if (!QUESTION_COUNTS.includes(cleanCount as QuestionCount)) {
    throw new QuizError(`Choose ${QUESTION_COUNTS.join(' or ')} questions.`);
  }

  const cleanDifficulty = difficulty ?? 'hard';
  if (!DIFFICULTIES.includes(cleanDifficulty as Difficulty)) {
    throw new QuizError(`Choose a difficulty: ${DIFFICULTIES.join(' or ')}.`);
  }

  return {
    title: typeof title === 'string' ? squash(title).slice(0, MAX_TITLE_LENGTH) : '',
    // Long articles are cut rather than rejected; the quiz then covers the opening part.
    content: content.trim().slice(0, MAX_CONTENT_LENGTH),
    count: cleanCount as QuestionCount,
    difficulty: cleanDifficulty as Difficulty,
  };
}

/** Returns a clean question, or null when Gemini sent something unusable. */
function parseQuestion(item: unknown, shuffleFn: <T>(items: T[]) => T[]): QuizQuestion | null {
  const { question, options, answerIndex, explanation } = (item ?? {}) as Record<string, unknown>;
  if (typeof question !== 'string' || !squash(question)) return null;
  if (!Array.isArray(options) || options.length !== OPTION_COUNT) return null;

  const cleanOptions = options.map((o) => (typeof o === 'string' ? squash(o) : ''));
  if (cleanOptions.some((o) => !o) || new Set(cleanOptions).size !== OPTION_COUNT) return null;
  if (!Number.isInteger(answerIndex) || (answerIndex as number) < 0) return null;
  if ((answerIndex as number) >= OPTION_COUNT) return null;

  // Models favour some answer positions, so reshuffle and follow the correct option
  const correct = cleanOptions[answerIndex as number];
  const shuffled = shuffleFn(cleanOptions);
  return {
    question: squash(question),
    options: shuffled,
    answerIndex: shuffled.indexOf(correct),
    explanation: typeof explanation === 'string' ? squash(explanation) : '',
  };
}

/** Parses the JSON text Gemini returns into questions, skipping any malformed ones. */
export function parseQuizResult(
  raw: string,
  shuffleFn: <T>(items: T[]) => T[] = shuffle,
): QuizQuestion[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new QuizError('Gemini returned an unexpected answer.', 502);
  }

  const { questions } = (data ?? {}) as { questions?: unknown };
  const parsed = Array.isArray(questions)
    ? questions
        .map((q) => parseQuestion(q, shuffleFn))
        .filter((q): q is QuizQuestion => q !== null)
    : [];

  if (parsed.length === 0) {
    throw new QuizError('Gemini could not write questions for this text. Try again.', 502);
  }
  return parsed;
}
