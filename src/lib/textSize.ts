import { useEffect, useState } from 'react';

const STORAGE_KEY = 'reading-room:text-scale';

/** Reading text sizes, as multipliers of the default size. */
export const TEXT_SCALES = [0.85, 1, 1.15, 1.3, 1.5] as const;
const DEFAULT_INDEX = 1;

function loadIndex() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    const index = TEXT_SCALES.findIndex((scale) => scale === saved);
    return index === -1 ? DEFAULT_INDEX : index;
  } catch {
    return DEFAULT_INDEX;
  }
}

/**
 * The reader's text size step, remembered per browser. The scale is published as the
 * --text-scale variable on <html>, so the header control and the article stay in sync.
 */
export function useTextScale() {
  const [index, setIndex] = useState(loadIndex);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(TEXT_SCALES[index]));
  }, [index]);

  function change(step: number) {
    const next = Math.min(TEXT_SCALES.length - 1, Math.max(0, index + step));
    setIndex(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(TEXT_SCALES[next]));
    } catch {
      // Without storage the size just resets on the next visit.
    }
  }

  return {
    scale: TEXT_SCALES[index],
    canShrink: index > 0,
    canGrow: index < TEXT_SCALES.length - 1,
    shrink: () => change(-1),
    grow: () => change(1),
  };
}
