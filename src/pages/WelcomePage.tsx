import { useNavigate } from 'react-router-dom';
import { markWelcomeSeen } from '../lib/welcome';

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Thought bubble holding a stack of open books. */
function BooksBubble() {
  return (
    <svg viewBox="0 0 124 92" className="doodle doodle-books">
      <path
        {...line}
        d="M60 6C95 6 114 18 114 36c0 13-9 22-24 26l16 10-26-7c-6 1-13 1-20 1C25 66 6 54 6 36S25 6 60 6Z"
      />
      <path {...line} d="M30 44l26-8 32 8-26 9-32-9Z" />
      <path {...line} d="M30 44v5l32 9 26-9v-5" />
      <path {...line} d="M40 30l20-7 24 7v12l-24-6-20 6V30Z" />
      <path {...line} d="M60 23v13M45 31l10-3M45 36l10-3M66 28l13 4M66 33l13 4" />
      <ellipse {...line} cx="84" cy="84" rx="8" ry="4" />
      <circle {...line} cx="99" cy="84" r="2.5" />
    </svg>
  );
}

/** Speech bubble with one open book. */
function BookBubble() {
  return (
    <svg viewBox="0 0 100 92" className="doodle doodle-book">
      <path
        {...line}
        d="M22 6h56c12 0 16 6 16 16v36c0 10-4 15-16 15h-6l8 13-20-13H22C10 73 6 68 6 58V22C6 12 10 6 22 6Z"
      />
      <path {...line} d="M24 26c10-5 19-3 26 4 7-7 16-9 26-4v30c-10-4-19-2-26 4-7-6-16-8-26-4V26Z" />
      <path {...line} d="M50 30v30M30 32c5-2 10-1 14 2M30 40c5-2 10-1 14 2M56 34c4-3 9-4 14-2M56 42c4-3 9-4 14-2" />
      <path {...line} d="M20 60c10-3 21-1 30 5 9-6 20-8 30-5" />
    </svg>
  );
}

/** Speech bubble with a pair of reading glasses. */
function GlassesBubble() {
  return (
    <svg viewBox="0 0 112 82" className="doodle doodle-glasses">
      <path
        {...line}
        d="M16 6h80c7 0 10 3 10 10v36c0 7-3 10-10 10H42L30 78V62H16C9 62 6 59 6 52V16c0-7 3-10 10-10Z"
      />
      <circle {...line} cx="40" cy="36" r="11" />
      <circle {...line} cx="72" cy="36" r="11" />
      <path {...line} d="M51 34c3-4 7-4 10 0M29 33l-9-6M83 33l9-6" />
    </svg>
  );
}

/** Small tilted bubble with a quill, plus a loose question mark. */
function QuillBubble() {
  return (
    <svg viewBox="0 0 110 110" className="doodle doodle-quill">
      <path
        {...line}
        d="M72 8c18 2 30 16 28 32-2 14-13 24-26 25l6 12-16-11c-14-2-24-14-22-28 2-18 13-32 30-30Z"
      />
      <path {...line} d="M60 52c3-14 12-28 26-34M68 40l8 2" />
      <path {...line} d="M10 62c0-12 22-14 22-1 0 10-12 11-12 22" />
      <circle {...line} cx="20" cy="98" r="3" />
    </svg>
  );
}

function SquiggleArrow() {
  return (
    <svg viewBox="0 0 200 52" className="squiggle" aria-hidden>
      <path
        {...line}
        pathLength={1}
        d="M4 38C20 12 34 8 46 22s24 18 38 4 28-14 42-2c8 8 2 22-8 16s4-22 22-18 36 0 52-6"
      />
      <path {...line} d="M180 10l14 6-10 11" />
    </svg>
  );
}

/** First-run welcome screen. Dark and full-bleed, outside the usual app shell. */
export default function WelcomePage() {
  const navigate = useNavigate();

  function start() {
    markWelcomeSeen();
    navigate('/', { replace: true });
  }

  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-art" aria-hidden>
          <BooksBubble />
          <BookBubble />
          <GlassesBubble />
          <QuillBubble />
        </div>

        <h1 className="welcome-title">Welcome to your reading room</h1>
        <p className="welcome-text">
          Read real English articles, tap any word to save its meaning and pronunciation, and
          build your own vocabulary right in the text.
        </p>

        <button type="button" className="welcome-go" onClick={start}>
          <span>Let’s go</span>
          <SquiggleArrow />
        </button>
      </div>
    </div>
  );
}
