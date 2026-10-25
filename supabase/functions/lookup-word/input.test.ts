import { describe, expect, it } from 'vitest';
import { parseLookupInput, parseLookupResult } from './input.ts';

describe('parseLookupInput', () => {
  it('accepts a word with its sentence', () => {
    expect(parseLookupInput({ text: ' fragmented ', context: ' rugged, fragmented terrain ' })).toEqual({
      text: 'fragmented',
      context: 'rugged, fragmented terrain',
    });
  });

  it('allows a missing context', () => {
    expect(parseLookupInput({ text: 'surgery' })).toEqual({ text: 'surgery', context: '' });
  });

  it.each([null, {}, { text: '' }, { text: '   ' }, { text: 42 }])('rejects %j', (body) => {
    expect(() => parseLookupInput(body)).toThrow('Select a word');
  });

  it('rejects selections that are too long to be a word or phrase', () => {
    expect(() => parseLookupInput({ text: 'a'.repeat(201) })).toThrow('too long');
  });

  it('cuts an oversized context instead of failing', () => {
    expect(parseLookupInput({ text: 'x', context: 'c'.repeat(2000) }).context).toHaveLength(600);
  });
});

describe('parseLookupResult', () => {
  it('reads the JSON text Gemini returns', () => {
    expect(
      parseLookupResult(
        '{"meaning":" chia cắt, manh mún ","pronunciation":"/ˈfræɡmən.tɪd/","partOfSpeech":"adjective"}',
      ),
    ).toEqual({
      meaning: 'chia cắt, manh mún',
      pronunciation: '/ˈfræɡmən.tɪd/',
      partOfSpeech: 'adjective',
    });
  });

  it('wraps a pronunciation that is missing its slashes', () => {
    expect(parseLookupResult('{"meaning":"m","pronunciation":"ˈsɜː.dʒər.i"}').pronunciation).toBe(
      '/ˈsɜː.dʒər.i/',
    );
  });

  it('tolerates missing optional fields', () => {
    expect(parseLookupResult('{"meaning":"m"}')).toEqual({
      meaning: 'm',
      pronunciation: '',
      partOfSpeech: '',
    });
  });

  it.each(['not json', '{}', '{"meaning":"  "}', '[]'])('rejects unusable output %s', (raw) => {
    expect(() => parseLookupResult(raw)).toThrow();
  });
});
