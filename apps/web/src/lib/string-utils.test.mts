import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeHtmlEntities, cleanMovieDescription } from './string-utils.js';

test('decodeHtmlEntities decodes common HTML entities including quotes and ampersands', () => {
  const input = '&quot;Vincenzo&quot; là câu chuyện kể về một &quot;luật sư mafia&quot;';
  const expected = '"Vincenzo" là câu chuyện kể về một "luật sư mafia"';
  assert.equal(decodeHtmlEntities(input), expected);
});

test('decodeHtmlEntities decodes numeric and hex entities', () => {
  const input = 'Tom &#39;s &amp; Jerry&#x27;s show &hellip;';
  const expected = "Tom 's & Jerry's show …";
  assert.equal(decodeHtmlEntities(input), expected);
});

test('decodeHtmlEntities handles double-encoded entities like &amp;quot;', () => {
  const input = '&amp;quot;Vincenzo&amp;quot;';
  const expected = '"Vincenzo"';
  assert.equal(decodeHtmlEntities(input), expected);
});

test('cleanMovieDescription strips tags while preserving paragraphs and decoding entities', () => {
  const input = `<p>&quot;Vincenzo&quot; là một luật sư tài ba.<br>Anh trở về Hàn Quốc.</p><p>Hành trình tiêu diệt cái ác bắt đầu.</p>`;
  const cleaned = cleanMovieDescription(input);
  assert.ok(cleaned.includes('"Vincenzo" là một luật sư tài ba.\nAnh trở về Hàn Quốc.'));
  assert.ok(cleaned.includes('Hành trình tiêu diệt cái ác bắt đầu.'));
  assert.ok(!cleaned.includes('<p>'));
  assert.ok(!cleaned.includes('&quot;'));
});

test('cleanMovieDescription filters out corrupted subtitle timestamps', () => {
  const input = `Mô tả phim hay.\n1\n00:01:20,000 --> 00:01:25,000\nPhụ đề lọt vào đây\n2\n00:01:25,500 --> 00:01:30,000\n` + 'a'.repeat(600);
  const cleaned = cleanMovieDescription(input);
  assert.ok(!cleaned.includes('-->'));
});

test('cleanMovieDescription separates paragraphs at ellipses, fixes typos, and completes cut-off sentence', () => {
  const input = '<p>Hannibal Lecter ( Anthony Hopkins ). Ám ảnh…Một bộ phim đầy tính nhân bản qua những đoạn đốI thoại…Bộ phim đã đoạt 5 giải Oscar. Đây là một thành tích ...</p>';
  const cleaned = cleanMovieDescription(input);
  assert.ok(cleaned.includes('(Anthony Hopkins)'));
  assert.ok(cleaned.includes('đối thoại'));
  assert.ok(cleaned.includes('Ám ảnh...\n\nMột bộ phim'));
  assert.ok(cleaned.includes('Đây là một thành tích vô cùng hiếm hoi và ấn tượng'));
});
