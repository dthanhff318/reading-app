import { describe, expect, it } from 'vitest';
import { cleanTitle, joinParagraphs } from './text.ts';

describe('joinParagraphs', () => {
  it('joins paragraphs with a blank line between them', () => {
    expect(joinParagraphs(['First.', 'Second.'])).toBe('First.\n\nSecond.');
  });

  it('collapses whitespace and non-breaking spaces inside a paragraph', () => {
    expect(joinParagraphs(['entitled Million  Bright\n\tEyes '])).toBe(
      'entitled Million Bright Eyes',
    );
  });

  it('drops empty paragraphs', () => {
    expect(joinParagraphs(['One', '  ', ' ', 'Two'])).toBe('One\n\nTwo');
  });

  it('drops a paragraph repeated right after itself', () => {
    expect(joinParagraphs(['Same', 'Same', 'Other', 'Same'])).toBe('Same\n\nOther\n\nSame');
  });
});

describe('cleanTitle', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanTitle('  Charity   programme\n brings care ')).toBe(
      'Charity programme brings care',
    );
  });

  it('caps the length at 300 characters', () => {
    expect(cleanTitle('a'.repeat(400))).toHaveLength(300);
  });

  it('falls back to "Untitled" when empty', () => {
    expect(cleanTitle('   ')).toBe('Untitled');
    expect(cleanTitle(null)).toBe('Untitled');
  });
});
