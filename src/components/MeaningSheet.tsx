import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lookupWord } from '../lib/api';
import type { MeaningInput } from '../lib/types';

interface Props {
  selectedText: string;
  /** Sentence around the selection, sent to Gemini so the meaning fits the context. */
  context: string;
  initialMeaning?: string;
  initialPronunciation?: string;
  /** Ask Gemini for a suggestion as soon as the sheet opens (used when adding a new meaning). */
  autoSuggest?: boolean;
  onSave: (input: MeaningInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

type SuggestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; partOfSpeech: string }
  | { status: 'error'; message: string };

/** Modal for typing a meaning. Bottom sheet on mobile, centered dialog on desktop. */
export default function MeaningSheet({
  selectedText,
  context,
  initialMeaning = '',
  initialPronunciation = '',
  autoSuggest = false,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [meaning, setMeaning] = useState(initialMeaning);
  const [pronunciation, setPronunciation] = useState(initialPronunciation);
  const [suggest, setSuggest] = useState<SuggestState>({
    status: autoSuggest ? 'loading' : 'idle',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      mounted.current = false;
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  /**
   * Fetches a suggestion. `replace` overwrites the fields; otherwise only empty ones are
   * filled, so a suggestion arriving late never overwrites what the user already typed.
   * Resolves to a function that applies the result to state.
   */
  const fetchSuggestion = useCallback(
    (replace: boolean) =>
      lookupWord(selectedText, context).then(
        (result) => () => {
          setMeaning((current) => (replace || !current.trim() ? result.meaning : current));
          setPronunciation((current) =>
            replace || !current.trim() ? result.pronunciation : current,
          );
          setSuggest({ status: 'done', partOfSpeech: result.partOfSpeech });
        },
        (err: unknown) => () =>
          setSuggest({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not get a suggestion',
          }),
      ),
    [selectedText, context],
  );

  useEffect(() => {
    if (!autoSuggest) return;
    let cancelled = false;
    fetchSuggestion(false).then((apply) => !cancelled && apply());
    return () => {
      cancelled = true;
    };
  }, [autoSuggest, fetchSuggestion]);

  function suggestAgain() {
    setSuggest({ status: 'loading' });
    fetchSuggestion(true).then((apply) => mounted.current && apply());
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  const canSave = meaning.trim().length > 0 && !busy;
  const save = () =>
    run(() => onSave({ meaning: meaning.trim(), pronunciation: pronunciation.trim() || null }));
  const loading = suggest.status === 'loading';

  return createPortal(
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) save();
        }}
      >
        <div className="sheet-handle" aria-hidden />
        <h2 id="sheet-title" className="sheet-title">
          {onDelete ? 'Edit meaning' : 'Add meaning'}
        </h2>
        <blockquote className="sheet-quote">
          {selectedText}
          {suggest.status === 'done' && suggest.partOfSpeech && (
            <span className="pos-chip">{suggest.partOfSpeech}</span>
          )}
        </blockquote>

        <div className="suggest-bar" aria-live="polite">
          {loading && <span className="suggest-status is-loading">Gemini is looking it up…</span>}
          {suggest.status === 'done' && (
            <span className="suggest-status">✨ Suggested by Gemini. Edit freely.</span>
          )}
          {suggest.status === 'error' && (
            <span className="suggest-status is-error">{suggest.message}</span>
          )}
          <button
            type="button"
            className="suggest-btn"
            disabled={loading || busy}
            onClick={suggestAgain}
          >
            ✨ {suggest.status === 'idle' ? 'Suggest' : 'Suggest again'}
          </button>
        </div>

        <label className="field">
          <span className="field-label">Meaning</span>
          <textarea
            ref={inputRef}
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSave) {
                e.preventDefault();
                save();
              }
            }}
            rows={3}
            maxLength={5000}
            placeholder={loading ? 'Waiting for a suggestion…' : 'Type the meaning, a translation, or a note…'}
          />
        </label>
        <label className="field">
          <span className="field-label">Pronunciation</span>
          <input
            className="ipa-input"
            value={pronunciation}
            onChange={(e) => setPronunciation(e.target.value)}
            maxLength={300}
            placeholder="/ˈfræɡmən.tɪd/"
            spellCheck={false}
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        <div className="sheet-actions">
          {onDelete && (
            <button
              type="button"
              className="btn btn-danger-ghost"
              disabled={busy}
              onClick={() => run(onDelete)}
            >
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
