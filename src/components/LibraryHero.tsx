import { Link } from 'react-router-dom';

// Text lines drawn on each page of the illustration: [y, length]
const LEFT_LINES: [number, number][] = [
  [56, 70],
  [68, 62],
  [80, 72],
  [92, 54],
  [104, 66],
  [116, 48],
];
const RIGHT_LINES: [number, number][] = [
  [56, 66],
  [68, 72],
  [80, 58],
  [92, 70],
  [104, 52],
  [116, 64],
];

function OpenBook() {
  return (
    <svg className="hero-art" viewBox="0 0 240 170" aria-hidden="true">
      <ellipse cx="120" cy="158" rx="104" ry="8" fill="rgba(41, 39, 31, 0.1)" />

      {/* Cover */}
      <path
        d="M120 46 C92 34 50 32 12 40 L12 146 C50 138 92 140 120 152 C148 140 190 138 228 146 L228 40 C190 32 148 34 120 46 Z"
        fill="var(--accent)"
      />

      {/* Pages */}
      <path
        d="M120 40 C95 28 55 26 20 34 L20 138 C55 130 95 132 120 144 Z"
        fill="var(--surface)"
        stroke="var(--border)"
      />
      <path
        d="M120 40 C145 28 185 26 220 34 L220 138 C185 130 145 132 120 144 Z"
        fill="#fffdf8"
        stroke="var(--border)"
      />
      <path d="M120 40 L120 144" stroke="var(--border)" strokeWidth="2" />

      {/* Highlighted word, echoing the "add meaning" feature */}
      <rect x="150" y="76" width="34" height="9" rx="2" fill="var(--mark-active)" />
      <path d="M150 86 H184" stroke="var(--mark-line)" strokeWidth="2" />

      <g stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" opacity="0.35">
        {LEFT_LINES.map(([y, len]) => (
          <path key={`l${y}`} d={`M${108 - len} ${y} H108`} />
        ))}
        {RIGHT_LINES.map(([y, len]) => (
          <path key={`r${y}`} d={`M132 ${y} H${132 + len}`} />
        ))}
      </g>

      {/* Bookmark ribbon */}
      <path d="M196 137 V160 L202 155 L208 160 V136" fill="var(--danger)" />

      {/* Sparkles */}
      <g fill="var(--mark-line)">
        <path className="sparkle" d="M60 6 L63 14 L71 17 L63 20 L60 28 L57 20 L49 17 L57 14 Z" />
        <path className="sparkle sparkle--late" d="M178 2 L180 8 L186 10 L180 12 L178 18 L176 12 L170 10 L176 8 Z" />
        <path className="sparkle sparkle--later" d="M122 10 L123.5 14 L127.5 15.5 L123.5 17 L122 21 L120.5 17 L116.5 15.5 L120.5 14 Z" />
      </g>
    </svg>
  );
}

export default function LibraryHero() {
  return (
    <section className="hero">
      <div className="hero-text">
        <p className="hero-eyebrow">Your reading room</p>
        <h1>Library</h1>
        <p className="hero-tagline">
          Paste any story or article, highlight the words you don&apos;t know, and keep their
          meanings right inside the text.
        </p>
        <Link to="/new" className="btn btn-primary">
          + Import
        </Link>
      </div>
      <OpenBook />
    </section>
  );
}
