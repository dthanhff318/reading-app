import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PageRect } from '../lib/selection';
import type { Annotation } from '../lib/types';

interface Props {
  annotation: Annotation;
  anchor: PageRect;
  onEdit: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const GAP = 8;
const EDGE = 12;

/** Popup showing a saved meaning, positioned under (or above) the hovered text. */
export default function MeaningTooltip({
  annotation,
  anchor,
  onEdit,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const minLeft = window.scrollX + EDGE;
    const maxLeft = window.scrollX + window.innerWidth - width - EDGE;
    const left = Math.min(Math.max(anchor.left + anchor.width / 2 - width / 2, minLeft), maxLeft);
    const fitsBelow = anchor.bottom + GAP + height <= window.scrollY + window.innerHeight;
    const top = fitsBelow ? anchor.bottom + GAP : anchor.top - GAP - height;
    setPos({ top, left });
  }, [anchor]);

  return createPortal(
    <div
      ref={ref}
      className="tooltip"
      role="tooltip"
      style={pos ? { top: pos.top, left: pos.left } : { top: anchor.bottom, left: 0, visibility: 'hidden' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="tooltip-term">
        {annotation.selected_text}
        {annotation.pronunciation && <span className="ipa"> {annotation.pronunciation}</span>}
      </div>
      <div className="tooltip-meaning">{annotation.meaning}</div>
      <button type="button" className="tooltip-edit" onClick={onEdit}>
        Edit
      </button>
    </div>,
    document.body,
  );
}
