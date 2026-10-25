import { useTextScale } from '../lib/textSize';

/** A−/A+ buttons for the reading text size, shown in the top bar while reading. */
export default function TextSizeControl() {
  const { scale, canShrink, canGrow, shrink, grow } = useTextScale();

  return (
    <div className="text-size" role="group" aria-label="Text size">
      <button
        type="button"
        className="text-size-btn is-small"
        onClick={shrink}
        disabled={!canShrink}
        aria-label="Smaller text"
      >
        A
      </button>
      <span className="text-size-value" aria-live="polite">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        className="text-size-btn"
        onClick={grow}
        disabled={!canGrow}
        aria-label="Larger text"
      >
        A
      </button>
    </div>
  );
}
