import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createArticle, extractArticleFromUrl, generateStory } from '../lib/api';
import type { StoryLevel } from '../lib/types';

type ImportMode = 'link' | 'paste' | 'story';

const MODES: { id: ImportMode; title: string; description: string; icon: ReactNode }[] = [
  {
    id: 'link',
    title: 'From a link',
    description: 'Paste a news article URL and we pull the text for you.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
        <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
      </svg>
    ),
  },
  {
    id: 'paste',
    title: 'Paste text',
    description: 'Copy a story or any text from anywhere and paste it in.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" />
        <path d="M16 5h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2" />
        <path d="M9 11h6M9 15h4" />
      </svg>
    ),
  },
  {
    id: 'story',
    title: 'AI story',
    description: 'Pick a level and a topic, and Gemini writes a fresh story for you.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3Z" />
        <path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2ZM5 15.5l.6 1.4 1.4.6-1.4.6L5 19.5l-.6-1.4L3 17.5l1.4-.6.6-1.4Z" />
      </svg>
    ),
  },
];

const LEVELS: { id: StoryLevel; hint: string }[] = [
  { id: 'B2', hint: 'Upper-intermediate' },
  { id: 'C1', hint: 'Advanced' },
  { id: 'C2', hint: 'Proficient' },
];

const TOPICS = ['Sci-fi', 'Comedy', 'New knowledge', 'Mystery', 'Adventure', 'Daily life'];

/** Normalizes pasted text: unify line endings and collapse runs of blank lines. */
function normalizeContent(raw: string) {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function ImportPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ImportMode | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [link, setLink] = useState('');
  const [fetching, setFetching] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [source, setSource] = useState<{ url: string; siteName: string } | null>(null);

  const [level, setLevel] = useState<StoryLevel>('B2');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [idea, setIdea] = useState('');
  const [generating, setGenerating] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [story, setStory] = useState<{ level: StoryLevel; topic: string } | null>(null);

  const canSave = title.trim() !== '' && content.trim() !== '' && !saving;
  const canFetch = link.trim() !== '' && !fetching;
  const canGenerate = !generating;
  // Link and story modes show the editor only once there is text to review.
  const showEditor =
    mode === 'paste' || (mode === 'link' && source !== null) || (mode === 'story' && story !== null);

  async function handleFetch(e: FormEvent) {
    e.preventDefault();
    if (!canFetch) return;
    if (content.trim() && !window.confirm('Replace the text you have already entered?')) return;

    setFetching(true);
    setLinkError(null);
    try {
      const article = await extractArticleFromUrl(link.trim());
      setTitle(article.title);
      setContent(article.content);
      setSource({
        url: article.sourceUrl,
        siteName: article.siteName ?? new URL(article.sourceUrl).hostname,
      });
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Could not import that link');
    } finally {
      setFetching(false);
    }
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!canGenerate) return;
    if (content.trim() && !window.confirm('Replace the text you have already entered?')) return;

    setGenerating(true);
    setStoryError(null);
    try {
      const result = await generateStory(level, topic, idea.trim());
      setTitle(result.title);
      setContent(result.content);
      setStory({ level, topic });
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : 'Could not write a story');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const article = await createArticle({
        title: title.trim(),
        content: normalizeContent(content),
        source_url: mode === 'link' ? (source?.url ?? null) : null,
      });
      navigate(`/read/${article.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the article');
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← Library
      </Link>
      <h1>Import article</h1>
      <p className="muted">How would you like to add something to read?</p>

      <div className="mode-picker" role="radiogroup" aria-label="Import method">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            className={`mode-card${mode === m.id ? ' is-selected' : ''}`}
            onClick={() => setMode(m.id)}
          >
            <span className="mode-icon">{m.icon}</span>
            <span className="mode-title">{m.title}</span>
            <span className="mode-desc">{m.description}</span>
          </button>
        ))}
      </div>

      {mode === 'link' && (
        <form className="link-form" onSubmit={handleFetch}>
          <label className="field">
            <span className="field-label">Article link</span>
            <div className="link-row">
              <input
                type="url"
                inputMode="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://vietnamnews.vn/…"
                disabled={fetching}
                autoFocus
              />
              <button type="submit" className="btn btn-primary" disabled={!canFetch}>
                {fetching ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
          </label>
          {linkError && (
            <p className="form-error">
              {linkError} You can copy the text from the page and use{' '}
              <button type="button" className="inline-link" onClick={() => setMode('paste')}>
                Paste text
              </button>{' '}
              instead.
            </p>
          )}
          {source && !linkError && (
            <p className="link-note">
              ✓ Imported from{' '}
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.siteName}
              </a>
              . Check the text below, then save.
            </p>
          )}
        </form>
      )}

      {mode === 'story' && (
        <form className="link-form story-form" onSubmit={handleGenerate}>
          <fieldset className="choice-group" disabled={generating}>
            <legend className="field-label">Level</legend>
            <div className="chips">
              {LEVELS.map((l) => (
                <label key={l.id} className="chip">
                  <input
                    type="radio"
                    name="level"
                    value={l.id}
                    checked={level === l.id}
                    onChange={() => setLevel(l.id)}
                  />
                  <span>
                    <strong>{l.id}</strong> {l.hint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice-group" disabled={generating}>
            <legend className="field-label">Topic</legend>
            <div className="chips">
              {TOPICS.map((t) => (
                <label key={t} className="chip">
                  <input
                    type="radio"
                    name="topic"
                    value={t}
                    checked={topic === t}
                    onChange={() => setTopic(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span className="field-label">
              Your idea <span className="field-optional">(optional)</span>
            </span>
            <textarea
              className="idea-input"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={generating}
              placeholder="e.g. A robot chef in Hanoi who secretly hates spicy food. Use lots of cooking verbs."
            />
            <span className="field-hint">{idea.length}/500</span>
          </label>

          <div className="story-actions">
            <button type="submit" className="btn btn-primary" disabled={!canGenerate}>
              {generating ? 'Writing your story…' : story ? '✨ Write another' : '✨ Generate story'}
            </button>
            {generating && <span className="link-note">This usually takes a few seconds.</span>}
          </div>

          {storyError && <p className="form-error">{storyError}</p>}
          {story && !storyError && !generating && (
            <p className="link-note">
              ✨ A {story.level} story about “{story.topic}” by Gemini. Edit anything below, then
              save.
            </p>
          )}
        </form>
      )}

      {showEditor && (
        <form className="import-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
              placeholder="e.g. The Little Prince – Chapter 1"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Content</span>
            <textarea
              className="content-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={200000}
              placeholder="Paste the text here…"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <Link to="/" className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={!canSave}>
              {saving ? 'Saving…' : 'Save & read'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
