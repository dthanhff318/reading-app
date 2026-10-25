/**
 * Maps the browser selection to absolute offsets in the article content.
 * Every rendered text segment carries `data-offset` = its start index in the
 * content, so a DOM point (text node + offset) converts to `dataOffset + offset`.
 */
export function readSelection(
  container: HTMLElement,
  selection: Selection,
): { start: number; end: number; rect: DOMRect } | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const start = pointToOffset(range.startContainer, range.startOffset, 'start');
  const end = pointToOffset(range.endContainer, range.endOffset, 'end');
  if (start === null || end === null || end <= start) return null;

  return { start, end, rect: range.getBoundingClientRect() };
}

function pointToOffset(node: Node, offset: number, edge: 'start' | 'end'): number | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const el = node.parentElement?.closest<HTMLElement>('[data-offset]');
    return el ? Number(el.dataset.offset) + offset : null;
  }

  // Element boundary (e.g. triple-click selects a whole paragraph): the point
  // sits between child nodes, so look at the segment right after / before it.
  const el = node as Element;
  const after = el.childNodes[offset];
  if (after) {
    const target = firstSegment(after);
    if (target) return Number(target.dataset.offset);
  }
  const before = offset > 0 ? el.childNodes[offset - 1] : null;
  const target = before ? lastSegment(before) : edge === 'end' ? lastSegment(el) : null;
  return target ? Number(target.dataset.offset) + (target.textContent?.length ?? 0) : null;
}

function firstSegment(node: Node): HTMLElement | null {
  if (!(node instanceof HTMLElement)) return null;
  return node.matches('[data-offset]') ? node : node.querySelector('[data-offset]');
}

function lastSegment(node: Node): HTMLElement | null {
  if (!(node instanceof HTMLElement)) return null;
  if (node.matches('[data-offset]')) return node;
  const all = node.querySelectorAll<HTMLElement>('[data-offset]');
  return all.length ? all[all.length - 1] : null;
}

/** Converts a viewport rect to document coordinates (for absolute positioning). */
export function toPageRect(rect: DOMRect) {
  return {
    top: rect.top + window.scrollY,
    bottom: rect.bottom + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
  };
}

export type PageRect = ReturnType<typeof toPageRect>;

export const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;
