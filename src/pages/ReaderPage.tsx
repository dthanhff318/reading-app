import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import MeaningSheet from '../components/MeaningSheet';
import MeaningTooltip from '../components/MeaningTooltip';
import ReadingQuiz from '../components/ReadingQuiz';
import {
  createAnnotation,
  deleteAnnotation,
  getArticle,
  listAnnotations,
  updateAnnotation,
} from '../lib/api';
import { sentenceAround } from '../lib/context';
import { buildParagraphs, findOverlap, trimRange } from '../lib/segments';
import { isTouchDevice, readSelection, toPageRect, type PageRect } from '../lib/selection';
import type { Annotation, Article, MeaningInput } from '../lib/types';

type PendingSelection = { start: number; end: number; text: string; rect: PageRect };
type SheetState =
  | { mode: 'create'; start: number; end: number; text: string }
  | { mode: 'edit'; annotation: Annotation };
type TooltipState = { annotationId: string; anchor: PageRect; pinned: boolean };

const HIDE_DELAY_MS = 150;
const SELECTION_DEBOUNCE_MS = 200;

const byStart = (a: Annotation, b: Annotation) => a.start_offset - b.start_offset;

export default function ReaderPage() {
  const { id = '' } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getArticle(id), listAnnotations(id)])
      .then(([a, list]) => {
        if (cancelled) return;
        setArticle(a);
        setAnnotations(list);
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const paragraphs = useMemo(
    () => (article ? buildParagraphs(article.content, annotations) : []),
    [article, annotations],
  );
  const annotationById = useMemo(
    () => new Map(annotations.map((a) => [a.id, a])),
    [annotations],
  );

  // Track text selection inside the article (works for mouse and touch).
  useEffect(() => {
    if (!article) return;
    let timer: number | undefined;
    const handle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const container = articleRef.current;
        const selection = window.getSelection();
        const range = container && selection ? readSelection(container, selection) : null;
        const trimmed = range && trimRange(article.content, range.start, range.end);
        if (!range || !trimmed) {
          setPending(null);
          return;
        }
        setPending({
          ...trimmed,
          text: article.content.slice(trimmed.start, trimmed.end),
          rect: toPageRect(range.rect),
        });
        setTooltip(null);
      }, SELECTION_DEBOUNCE_MS);
    };
    document.addEventListener('selectionchange', handle);
    return () => {
      document.removeEventListener('selectionchange', handle);
      window.clearTimeout(timer);
    };
  }, [article]);

  // Close a pinned tooltip when tapping/clicking elsewhere.
  useEffect(() => {
    if (!tooltip?.pinned) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (!target.closest('.tooltip, mark[data-annotation]')) setTooltip(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setTooltip(null);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tooltip?.pinned]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const cancelHide = () => window.clearTimeout(hideTimer.current);
  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(
      () => setTooltip((t) => (t?.pinned ? t : null)),
      HIDE_DELAY_MS,
    );
  };

  function showTooltip(annotationId: string, el: HTMLElement, pinned: boolean) {
    cancelHide();
    setTooltip((current) =>
      current?.pinned && !pinned
        ? current
        : { annotationId, anchor: toPageRect(el.getBoundingClientRect()), pinned },
    );
  }

  function openSheetForSelection() {
    if (!pending) return;
    const overlap = findOverlap(annotations, pending.start, pending.end);
    if (overlap) {
      const inside = pending.start >= overlap.start_offset && pending.end <= overlap.end_offset;
      if (inside) {
        setSheet({ mode: 'edit', annotation: overlap });
      } else {
        setNotice('This selection overlaps a saved meaning. Pick a range that does not include it.');
        return;
      }
    } else {
      setSheet({ mode: 'create', start: pending.start, end: pending.end, text: pending.text });
    }
    window.getSelection()?.removeAllRanges();
    setPending(null);
  }

  const closeSheet = useCallback(() => setSheet(null), []);

  async function handleSave(input: MeaningInput) {
    if (!sheet || !article) return;
    if (sheet.mode === 'create') {
      const created = await createAnnotation({
        article_id: article.id,
        start_offset: sheet.start,
        end_offset: sheet.end,
        selected_text: sheet.text,
        ...input,
      });
      setAnnotations((list) => [...list, created].sort(byStart));
    } else {
      const updated = await updateAnnotation(sheet.annotation.id, input);
      setAnnotations((list) => list.map((a) => (a.id === updated.id ? updated : a)));
    }
  }

  async function handleDelete(annotationId: string) {
    await deleteAnnotation(annotationId);
    setAnnotations((list) => list.filter((a) => a.id !== annotationId));
    setTooltip(null);
  }

  if (loadError) {
    return (
      <div className="page">
        <p className="form-error">Could not load this article: {loadError}</p>
        <Link to="/" className="btn btn-ghost">
          ← Back to library
        </Link>
      </div>
    );
  }

  if (!article) return <div className="page muted">Loading…</div>;

  const tooltipAnnotation = tooltip ? annotationById.get(tooltip.annotationId) : undefined;

  return (
    <div className="page reader">
      <Link to="/" className="back-link">
        ← Library
      </Link>
      <h1 className="reader-title">{article.title}</h1>
      <p className="reader-meta">
        {article.source_url && (
          <span className="reader-source">
            Source:{' '}
            <a href={article.source_url} target="_blank" rel="noreferrer">
              {new URL(article.source_url).hostname.replace(/^www\./, '')}
            </a>{' '}
            ·{' '}
          </span>
        )}
        {annotations.length} saved {annotations.length === 1 ? 'meaning' : 'meanings'} · Select text
        to add a meaning ·{' '}
        <a href="#reading-test" className="reader-quiz-link">
          Take the reading test ↓
        </a>
      </p>

      <article
        className="reader-body"
        ref={articleRef}
      >
        {paragraphs.map((p) => (
          <p key={p.start}>
            {p.segments.map((s) =>
              s.annotationId ? (
                <mark
                  key={s.start}
                  data-offset={s.start}
                  data-annotation={s.annotationId}
                  className={tooltip?.annotationId === s.annotationId ? 'is-active' : undefined}
                  onMouseEnter={(e) =>
                    !isTouchDevice() && showTooltip(s.annotationId!, e.currentTarget, false)
                  }
                  onMouseLeave={() => !isTouchDevice() && scheduleHide()}
                  onClick={(e) => {
                    // Ignore clicks that end a drag-selection.
                    if (!window.getSelection()?.isCollapsed) return;
                    showTooltip(s.annotationId!, e.currentTarget, true);
                  }}
                >
                  {s.text}
                </mark>
              ) : (
                <span key={s.start} data-offset={s.start}>
                  {s.text}
                </span>
              ),
            )}
          </p>
        ))}
      </article>

      <ReadingQuiz key={article.id} article={article} />

      {annotations.length > 0 && (
        <section className="vocab">
          <h2>Saved meanings</h2>
          <ul>
            {annotations.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="vocab-item"
                  onClick={() => setSheet({ mode: 'edit', annotation: a })}
                >
                  <span className="vocab-term">
                    {a.selected_text}
                    {a.pronunciation && <span className="ipa"> {a.pronunciation}</span>}
                  </span>
                  <span className="vocab-meaning">{a.meaning}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending && !sheet && <AddMeaningButton rect={pending.rect} onClick={openSheetForSelection} />}

      {tooltip && tooltipAnnotation && !sheet && (
        <MeaningTooltip
          annotation={tooltipAnnotation}
          anchor={tooltip.anchor}
          onEdit={() => {
            setSheet({ mode: 'edit', annotation: tooltipAnnotation });
            setTooltip(null);
          }}
          onMouseEnter={cancelHide}
          onMouseLeave={() => !tooltip.pinned && scheduleHide()}
        />
      )}

      {sheet && (
        <MeaningSheet
          key={sheet.mode === 'edit' ? sheet.annotation.id : `${sheet.start}-${sheet.end}`}
          selectedText={sheet.mode === 'edit' ? sheet.annotation.selected_text : sheet.text}
          context={
            sheet.mode === 'edit'
              ? sentenceAround(article.content, sheet.annotation.start_offset, sheet.annotation.end_offset)
              : sentenceAround(article.content, sheet.start, sheet.end)
          }
          initialMeaning={sheet.mode === 'edit' ? sheet.annotation.meaning : ''}
          initialPronunciation={sheet.mode === 'edit' ? (sheet.annotation.pronunciation ?? '') : ''}
          autoSuggest={sheet.mode === 'create'}
          onSave={handleSave}
          onDelete={sheet.mode === 'edit' ? () => handleDelete(sheet.annotation.id) : undefined}
          onClose={closeSheet}
        />
      )}

      {notice && createPortal(<div className="toast" role="status">{notice}</div>, document.body)}
    </div>
  );
}

/**
 * Floating "Add meaning" action. Sits above the selection on desktop; docked at
 * the bottom on touch screens so it does not fight the native selection menu.
 */
function AddMeaningButton({ rect, onClick }: { rect: PageRect; onClick: () => void }) {
  const docked = isTouchDevice();
  const style = docked
    ? undefined
    : {
        top: rect.top - window.scrollY > 56 ? rect.top - 48 : rect.bottom + 8,
        left: Math.min(
          Math.max(rect.left + rect.width / 2, window.scrollX + 80),
          window.scrollX + window.innerWidth - 80,
        ),
      };
  return createPortal(
    <button
      type="button"
      className={docked ? 'add-btn add-btn--docked' : 'add-btn'}
      style={style}
      // Keep the text selection alive while pressing the button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      + Add meaning
    </button>,
    document.body,
  );
}
