import { describe, expect, it } from 'vitest';
import { isBlockedHost, parseArticleUrl } from './url.ts';

describe('parseArticleUrl', () => {
  it('accepts a normal news link', () => {
    const url = parseArticleUrl(
      ' https://vietnamnews.vn/society/1802707/charity-programme.html ',
    );
    expect(url.hostname).toBe('vietnamnews.vn');
  });

  it.each([undefined, 42, '', '   '])('rejects a missing link (%s)', (raw) => {
    expect(() => parseArticleUrl(raw)).toThrow('Please enter a link.');
  });

  it('rejects text that is not a link', () => {
    expect(() => parseArticleUrl('not a url')).toThrow('valid link');
  });

  it.each(['ftp://example.com/a', 'file:///etc/passwd', 'javascript:alert(1)'])(
    'rejects non-web protocols (%s)',
    (raw) => {
      expect(() => parseArticleUrl(raw)).toThrow('http');
    },
  );

  it('rejects links with embedded credentials', () => {
    expect(() => parseArticleUrl('https://user:pass@example.com/')).toThrow();
  });

  it.each([
    'http://localhost:3000/',
    'http://127.0.0.1/',
    'http://2130706433/', // 127.0.0.1 in decimal form
    'http://10.0.0.5/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
  ])('rejects internal addresses (%s)', (raw) => {
    expect(() => parseArticleUrl(raw)).toThrow('cannot be imported');
  });
});

describe('isBlockedHost', () => {
  it.each([
    'localhost',
    'app.localhost',
    'printer.local',
    '0.0.0.0',
    '10.1.2.3',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '[::1]',
    '[fd00::1]',
    '[fe80::1]',
    '[::ffff:7f00:1]',
  ])('blocks %s', (host) => {
    expect(isBlockedHost(host)).toBe(true);
  });

  it.each(['vietnamnews.vn', 'example.com', '8.8.8.8', '172.32.0.1', '[2001:4860::8888]'])(
    'allows %s',
    (host) => {
      expect(isBlockedHost(host)).toBe(false);
    },
  );
});
