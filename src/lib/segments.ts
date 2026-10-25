export interface Segment {
  start: number;
  end: number;
  text: string;
  annotationId: string | null;
}

export interface Paragraph {
  start: number;
  end: number;
  segments: Segment[];
}

interface Range {
  id: string;
  start_offset: number;
  end_offset: number;
}

/**
 * Splits article content into paragraphs (one per line) and each paragraph into
 * plain / annotated segments. All offsets are absolute indexes into `content`,
 * so the DOM can map a selection back to the stored text.
 */
export function buildParagraphs(content: string, annotations: Range[]): Paragraph[] {
  const sorted = [...annotations].sort((a, b) => a.start_offset - b.start_offset);
  const paragraphs: Paragraph[] = [];

  let lineStart = 0;
  for (const line of content.split('\n')) {
    const start = lineStart;
    const end = start + line.length;
    lineStart = end + 1;
    if (line.trim() === '') continue;

    const segments: Segment[] = [];
    let cursor = start;
    for (const a of sorted) {
      if (a.end_offset <= start || a.start_offset >= end) continue;
      const s = Math.max(a.start_offset, start);
      const e = Math.min(a.end_offset, end);
      // Overlapping annotations are not supported; keep the first one.
      if (s < cursor) continue;
      if (s > cursor) segments.push(plain(content, cursor, s));
      segments.push({ start: s, end: e, text: content.slice(s, e), annotationId: a.id });
      cursor = e;
    }
    if (cursor < end) segments.push(plain(content, cursor, end));

    paragraphs.push({ start, end, segments });
  }

  return paragraphs;
}

function plain(content: string, start: number, end: number): Segment {
  return { start, end, text: content.slice(start, end), annotationId: null };
}

/** Shrinks a range so it does not start or end with whitespace. */
export function trimRange(
  content: string,
  start: number,
  end: number,
): { start: number; end: number } | null {
  while (start < end && /\s/.test(content[start])) start++;
  while (end > start && /\s/.test(content[end - 1])) end--;
  return start < end ? { start, end } : null;
}

export function findOverlap<T extends Range>(list: T[], start: number, end: number): T | undefined {
  return list.find((a) => a.start_offset < end && a.end_offset > start);
}
