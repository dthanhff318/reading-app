/** An error whose message is safe to show to the user, with the HTTP status to answer with. */
export class LookupError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const MAX_TEXT_LENGTH = 200;
const MAX_CONTEXT_LENGTH = 600;

export interface LookupInput {
  text: string;
  context: string;
}

export interface LookupResult {
  meaning: string;
  pronunciation: string;
  partOfSpeech: string;
}

const squash = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Validates the request body: the selected word or phrase, and the sentence it is in. */
export function parseLookupInput(body: unknown): LookupInput {
  const { text, context } = (body ?? {}) as { text?: unknown; context?: unknown };
  if (typeof text !== 'string' || !text.trim()) {
    throw new LookupError('Select a word or phrase to look up.');
  }

  const cleanText = squash(text);
  if (cleanText.length > MAX_TEXT_LENGTH) {
    throw new LookupError('That selection is too long to look up. Pick a word or a short phrase.');
  }

  return {
    text: cleanText,
    context: typeof context === 'string' ? squash(context).slice(0, MAX_CONTEXT_LENGTH) : '',
  };
}

/** Parses the JSON text Gemini returns into a clean result, or throws if it is unusable. */
export function parseLookupResult(raw: string): LookupResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new LookupError('Gemini returned an unexpected answer.', 502);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new LookupError('Gemini returned an unexpected answer.', 502);
  }

  const { meaning, pronunciation, partOfSpeech } = data as Record<string, unknown>;
  const cleanMeaning = typeof meaning === 'string' ? meaning.trim() : '';
  if (!cleanMeaning) throw new LookupError('Gemini could not explain this selection.', 502);

  let ipa = typeof pronunciation === 'string' ? pronunciation.trim() : '';
  if (ipa && !/^[/[]/.test(ipa)) ipa = `/${ipa}/`;

  return {
    meaning: cleanMeaning,
    pronunciation: ipa,
    partOfSpeech: typeof partOfSpeech === 'string' ? partOfSpeech.trim() : '',
  };
}
