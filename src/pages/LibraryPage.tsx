import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import LibraryHero from '../components/LibraryHero';
import { deleteArticle, listArticles } from '../lib/api';
import type { Article } from '../lib/types';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export default function LibraryPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null);
  // Stable so ConfirmDialog's keydown effect doesn't re-run every render
  const closeDelete = useCallback(() => setPendingDelete(null), []);

  useEffect(() => {
    listArticles()
      .then(setArticles)
      .catch((err: Error) => setError(err.message));
  }, []);

  // Errors are thrown back to ConfirmDialog, which shows them inside the dialog
  async function handleDelete(article: Article) {
    await deleteArticle(article.id);
    setArticles((list) => list?.filter((a) => a.id !== article.id) ?? null);
  }

  return (
    <div className="page">
      <LibraryHero />

      {error && <p className="form-error">{error}</p>}
      {!articles && !error && <p className="muted">Loading…</p>}

      {articles?.length === 0 && (
        <div className="empty">
          <p>No articles yet.</p>
          <p className="muted">Copy a story or a news article from anywhere and paste it here.</p>
          <Link to="/new" className="btn btn-primary">
            Import your first article
          </Link>
        </div>
      )}

      <ul className="article-list">
        {articles?.map((a) => (
          <li key={a.id} className="article-card">
            <Link to={`/read/${a.id}`} className="article-link">
              <h2>{a.title}</h2>
              <p className="article-preview">{a.content.slice(0, 220)}</p>
              <time className="muted" dateTime={a.created_at}>
                {dateFormat.format(new Date(a.created_at))}
              </time>
            </Link>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Delete ${a.title}`}
              onClick={() => setPendingDelete(a)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this article?"
          confirmLabel="Delete"
          busyLabel="Deleting…"
          onConfirm={() => handleDelete(pendingDelete)}
          onClose={closeDelete}
        >
          <p className="confirm-quote">{pendingDelete.title}</p>
          <p className="muted">
            This also removes every meaning you saved in it. You can&apos;t undo this.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
