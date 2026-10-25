/** An error whose message is safe to show to the user, with the HTTP status to answer with. */
export class StoryError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const LEVELS = ['B2', 'C1', 'C2'] as const;
export type Level = (typeof LEVELS)[number];

const MAX_TOPIC_LENGTH = 60;
const MAX_PROMPT_LENGTH = 500;
const MIN_PARAGRAPHS = 3;

export interface StoryInput {
  level: Level;
  topic: string;
  /** The reader's own idea for the story; empty when not given. */
  prompt: string;
}

export interface Story {
  title: string;
  content: string;
}

const squash = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Validates the request body: a CEFR level, a short topic and an optional free-text idea. */
export function parseStoryInput(body: unknown): StoryInput {
  const { level, topic, prompt } = (body ?? {}) as {
    level?: unknown;
    topic?: unknown;
    prompt?: unknown;
  };
  if (typeof level !== 'string' || !LEVELS.includes(level as Level)) {
    throw new StoryError(`Choose a level: ${LEVELS.join(', ')}.`);
  }
  if (typeof topic !== 'string' || !squash(topic)) {
    throw new StoryError('Choose a topic for the story.');
  }

  const cleanTopic = squash(topic);
  if (cleanTopic.length > MAX_TOPIC_LENGTH) {
    throw new StoryError(`Keep the topic under ${MAX_TOPIC_LENGTH} characters.`);
  }

  const cleanPrompt = typeof prompt === 'string' ? squash(prompt) : '';
  if (cleanPrompt.length > MAX_PROMPT_LENGTH) {
    throw new StoryError(`Keep your idea under ${MAX_PROMPT_LENGTH} characters.`);
  }
  return { level: level as Level, topic: cleanTopic, prompt: cleanPrompt };
}

/** Parses the JSON text Gemini returns into a title and plain text with blank lines between paragraphs. */
export function parseStoryResult(raw: string): Story {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new StoryError('Gemini returned an unexpected answer.', 502);
  }

  const { title, paragraphs } = (data ?? {}) as { title?: unknown; paragraphs?: unknown };
  const cleanTitle = typeof title === 'string' ? squash(title) : '';
  const cleanParagraphs = Array.isArray(paragraphs)
    ? paragraphs.filter((p): p is string => typeof p === 'string').map(squash).filter(Boolean)
    : [];

  if (!cleanTitle || cleanParagraphs.length < MIN_PARAGRAPHS) {
    throw new StoryError('Gemini could not write a full story. Try again.', 502);
  }
  return { title: cleanTitle, content: cleanParagraphs.join('\n\n') };
}
