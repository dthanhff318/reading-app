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

/** A short story written by the generate-story Edge Function. */
export interface GeneratedStory {
  title: string;
  content: string;
}
