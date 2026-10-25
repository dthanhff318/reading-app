import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LibraryHero from '../components/LibraryHero';
import { deleteArticle, listArticles } from '../lib/api';
import type { Article } from '../lib/types';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export default function LibraryPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listArticles()
      .then(setArticles)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function handleDelete(article: Article) {
    if (!window.confirm(`Delete "${article.title}" and all its saved meanings?`)) return;
    try {
      await deleteArticle(article.id);
      setArticles((list) => list?.filter((a) => a.id !== article.id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the article');
    }
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
              onClick={() => handleDelete(a)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
