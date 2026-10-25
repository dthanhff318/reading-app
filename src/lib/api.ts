import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type {
  Annotation,
  Article,
  ExtractedArticle,
  GeneratedStory,
  MeaningInput,
  NewAnnotation,
  StoryLevel,
  WordLookup,
} from './types';

function db() {
  if (!supabase) throw new Error('Supabase is not configured. Check your .env file.');
  return supabase;
}

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function listArticles(): Promise<Article[]> {
  return unwrap(
    await db().from('articles').select('*').order('created_at', { ascending: false }),
  );
}

export async function getArticle(id: string): Promise<Article> {
  return unwrap(await db().from('articles').select('*').eq('id', id).single());
}

export async function createArticle(input: {
  title: string;
  content: string;
  source_url?: string | null;
}): Promise<Article> {
  return unwrap(await db().from('articles').insert(input).select().single());
}

/** Calls an Edge Function. Our functions answer errors with { error: "<message for the user>" }. */
async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  fallbackError: string,
): Promise<T> {
  const { data, error } = await db().functions.invoke<T>(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload?.error) throw new Error(payload.error);
    }
    throw new Error(fallbackError);
  }
  if (!data) throw new Error(fallbackError);
  return data;
}

/** Asks the extract-article Edge Function to pull the title and text from a web page. */
export function extractArticleFromUrl(url: string): Promise<ExtractedArticle> {
  return invokeFunction(
    'extract-article',
    { url },
    'Could not import that link. Check your connection and try again.',
  );
}

/** Asks the lookup-word Edge Function (Gemini) for a meaning and pronunciation in context. */
export function lookupWord(text: string, context: string): Promise<WordLookup> {
  return invokeFunction('lookup-word', { text, context }, 'Could not get a suggestion right now.');
}

/**
 * Asks the generate-story Edge Function (Gemini) for an original story at a level and topic,
 * optionally steered by the reader's own idea.
 */
export function generateStory(
  level: StoryLevel,
  topic: string,
  prompt: string,
): Promise<GeneratedStory> {
  return invokeFunction(
    'generate-story',
    { level, topic, prompt },
    'Could not write a story right now. Try again in a moment.',
  );
}

export async function deleteArticle(id: string): Promise<void> {
  unwrap(await db().from('articles').delete().eq('id', id));
}

export async function listAnnotations(articleId: string): Promise<Annotation[]> {
  return unwrap(
    await db()
      .from('annotations')
      .select('*')
      .eq('article_id', articleId)
      .order('start_offset', { ascending: true }),
  );
}

export async function createAnnotation(input: NewAnnotation): Promise<Annotation> {
  return unwrap(await db().from('annotations').insert(input).select().single());
}

export async function updateAnnotation(id: string, input: MeaningInput): Promise<Annotation> {
  return unwrap(
    await db()
      .from('annotations')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),
  );
}

export async function deleteAnnotation(id: string): Promise<void> {
  unwrap(await db().from('annotations').delete().eq('id', id));
}
