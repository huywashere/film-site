import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const watchPage = readFileSync('src/app/watch/[slug]/WatchPageClient.tsx', 'utf8');
const artPlayer = readFileSync('src/components/video/ArtPlayer.tsx', 'utf8');
const healthPanel = readFileSync('src/components/video/PlayerServerHealthPanel.tsx', 'utf8');

test('watch sidebar shows real movie introduction and detail metadata', () => {
  assert.match(watchPage, /<span>Giới thiệu phim<\/span>/);
  assert.match(watchPage, /cleanMovieDescription\(film\?\.content/);
  assert.match(watchPage, /label: 'Thể loại'/);
  assert.match(watchPage, /label: 'Quốc gia'/);
  assert.match(watchPage, /label: 'Thời lượng'/);
  assert.match(watchPage, /href=\{`\/film\/\$\{slug\}`\}/);
});

test('player no longer renders skip intro controls', () => {
  assert.doesNotMatch(watchPage, /skipIntroConfig|Bỏ intro|Bỏ qua đoạn mở đầu/);
  assert.doesNotMatch(artPlayer, /netphim-skip-intro|Bỏ qua giới thiệu|Tự động bỏ qua mở đầu/);
});

test('stream health control uses an activity icon and explicit label', () => {
  assert.match(artPlayer, /createLucideElement\(activityIconNode/);
  assert.match(artPlayer, /tooltip: 'Đo sức khỏe luồng'/);
  assert.match(healthPanel, /<Activity[\s\S]*Sức khỏe luồng phát/);
});

test('watch player hydrates eagerly and shows loading feedback before HLS mounts', () => {
  assert.match(watchPage, /data-eager-hydration="true"/);
  assert.match(watchPage, /Đang tải nguồn phát/);
});

test('watch toolbar keeps its compact intrinsic height beside the spanning sidebar', () => {
  assert.match(watchPage, /xl:grid-rows-\[min-content_auto_auto\]/);
  assert.match(watchPage, /flex h-fit self-start items-center justify-between/);
});
