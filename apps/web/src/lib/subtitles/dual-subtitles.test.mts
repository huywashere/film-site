import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decryptSubtitle,
  parseTimestamp,
  formatTimestamp,
  parseSubtitleCues,
  mergeDualSubtitleCues,
  buildWebVttString,
  HUBPHIM_DEFAULT_KEY,
  HUBPHIM_ENC_PREFIX,
} from './dual-subtitles.ts';

test('parseTimestamp converts WebVTT/SRT timestamps correctly', () => {
  assert.equal(parseTimestamp('00:00:10.500'), 10.5);
  assert.equal(parseTimestamp('01:30:00.000'), 5400);
  assert.equal(parseTimestamp('02:15,350'), 135.35); // comma decimal
  assert.equal(parseTimestamp('45.2'), 45.2);
});

test('formatTimestamp formats seconds into HH:MM:SS.mmm format', () => {
  assert.equal(formatTimestamp(10.5), '00:00:10.500');
  assert.equal(formatTimestamp(5400), '01:30:00.000');
  assert.equal(formatTimestamp(135.35), '00:02:15.350');
});

test('decryptSubtitle correctly decrypts HUBPHIM_ENC RC4 ciphertext', () => {
  // Test with plain WebVTT text (should return untouched)
  const plainVtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello';
  assert.equal(decryptSubtitle(plainVtt), plainVtt);

  // Encrypt a known string using RC4 with default key
  const message = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nTest Subtitle';
  const sBox: number[] = new Array(256);
  for (let i = 0; i < 256; i++) sBox[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + sBox[i] + HUBPHIM_DEFAULT_KEY.charCodeAt(i % HUBPHIM_DEFAULT_KEY.length)) % 256;
    const temp = sBox[i];
    sBox[i] = sBox[j];
    sBox[j] = temp;
  }
  let i = 0;
  j = 0;
  let hexCipher = '';
  for (let k = 0; k < message.length; k++) {
    i = (i + 1) % 256;
    j = (j + sBox[i]) % 256;
    const temp = sBox[i];
    sBox[i] = sBox[j];
    sBox[j] = temp;
    const rand = sBox[(sBox[i] + sBox[j]) % 256];
    const cipherCode = message.charCodeAt(k) ^ rand;
    hexCipher += cipherCode.toString(16).padStart(4, '0');
  }

  const encrypted = `${HUBPHIM_ENC_PREFIX}${hexCipher}`;
  const decrypted = decryptSubtitle(encrypted);
  assert.equal(decrypted, message);
});

test('parseSubtitleCues parses VTT content with and without cue numbers', () => {
  const vtt = `WEBVTT

1
00:00:05.000 --> 00:00:08.000
First line of dialogue

00:00:10.000 --> 00:00:14.000 line:0% align:middle
Second dialogue line
with second row
`;

  const cues = parseSubtitleCues(vtt);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].start, 5);
  assert.equal(cues[0].end, 8);
  assert.equal(cues[0].text, 'First line of dialogue');

  assert.equal(cues[1].start, 10);
  assert.equal(cues[1].end, 14);
  assert.equal(cues[1].text, 'Second dialogue line\nwith second row');
});

test('mergeDualSubtitleCues produces aligned dual-subtitle time slices', () => {
  const viCues = [
    { start: 1, end: 5, text: 'Xin chào thế giới' },
    { start: 6, end: 10, text: 'Hôm nay trời đẹp quá' },
  ];
  const enCues = [
    { start: 1, end: 4, text: 'Hello world' },
    { start: 7, end: 10, text: 'Nice weather today' },
  ];

  const merged = mergeDualSubtitleCues(viCues, enCues);
  assert.ok(merged.length >= 2);

  // During 1 to 4 both exist
  const firstSlice = merged.find((c) => c.start >= 1 && c.end <= 4);
  assert.ok(firstSlice);
  assert.match(firstSlice.text, /Hello world/);
  assert.match(firstSlice.text, /Xin chào thế giới/);

  // Check WebVTT generation
  const vttOutput = buildWebVttString(merged);
  assert.match(vttOutput, /^WEBVTT/);
  assert.match(vttOutput, /sub-sec/);
  assert.match(vttOutput, /sub-pri/);
});
