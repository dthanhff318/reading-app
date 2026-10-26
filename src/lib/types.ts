export interface Article {
  id: string;
  title: string;
  content: string;
  source_url: string | null;
  created_at: string;
}

export interface Annotation {
  id: string;
  article_id: string;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  meaning: string;
  pronunciation: string | null;
  created_at: string;
  updated_at: string;
}

export type NewAnnotation = Pick<
  Annotation,
  'article_id' | 'start_offset' | 'end_offset' | 'selected_text' | 'meaning' | 'pronunciation'
>;

/** The parts of an annotation the user edits in the meaning sheet. */
export type MeaningInput = Pick<Annotation, 'meaning' | 'pronunciation'>;

/** A suggestion from the lookup-word Edge Function (Gemini). */
export interface WordLookup {
  meaning: string;
  pronunciation: string;
  partOfSpeech: string;
}

/** Title and text pulled from a web page by the extract-article Edge Function. */
export interface ExtractedArticle {
  title: string;
  content: string;
  siteName: string | null;
  sourceUrl: string;
}

export type StoryLevel = 'B2' | 'C1' | 'C2';

export type QuizSize = 5 | 10;
export type QuizDifficulty = 'standard' | 'hard';

/** One multiple-choice question from the generate-quiz Edge Function (Gemini). */
export interface QuizQuestion {
  question: string;
  options: string[];
  /** Index into `options` of the correct answer. */
  answerIndex: number;
  /** Why the answer is right, in Vietnamese. */
  explanation: string;
}

/** A short story written by the generate-story Edge Function. */
export interface GeneratedStory {
  title: string;
  content: string;
}
