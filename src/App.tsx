import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useMatch } from 'react-router-dom';
import TextSizeControl from './components/TextSizeControl';
import { isSupabaseConfigured } from './lib/supabase';
import { hasSeenWelcome } from './lib/welcome';
import ImportPage from './pages/ImportPage';
import LibraryPage from './pages/LibraryPage';
import ReaderPage from './pages/ReaderPage';
import WelcomePage from './pages/WelcomePage';

function Shell() {
  const reading = useMatch('/read/:id');

  return (
    <>
      {/* Faded temple sketch behind every page; dimmer while reading to keep text crisp */}
      <div className={reading ? 'backdrop is-dim' : 'backdrop'} aria-hidden="true" />
      <header className="topbar">
        <Link to="/" className="brand">
          Reading Room
        </Link>
        {reading && <TextSizeControl />}
      </header>
      <main>
        {isSupabaseConfigured ? (
          <Outlet />
        ) : (
          <div className="page">
            <h1>Setup needed</h1>
            <p>
              Copy <code>.env.example</code> to <code>.env</code>, fill in your Supabase URL and anon
              key, run <code>supabase/schema.sql</code> in the Supabase SQL editor, then restart the
              dev server.
            </p>
          </div>
        )}
      </main>
    </>
  );
}

/** First-time visitors see the welcome screen before the library. */
function Home() {
  return hasSeenWelcome() ? <LibraryPage /> : <Navigate to="/welcome" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<ImportPage />} />
          <Route path="/read/:id" element={<ReaderPage />} />
          <Route path="*" element={<LibraryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
