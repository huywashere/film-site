import assert from "node:assert/strict";
import test from "node:test";
import {
  addSignedHlsFallbacksInPayload,
  verifySignedHlsProxyUrl,
} from "./hls-proxy-signature.ts";

process.env.HLS_PROXY_SECRET = "test-only-hls-secret-with-at-least-32-characters";

test("keeps the browser HLS URL direct and adds a valid signed proxy fallback", () => {
  const directUrl = "https://media.example.com/movie/master.m3u8";
  const payload = addSignedHlsFallbacksInPayload({
    episodes: [
      {
        server_data: [{ name: "Tập 1", link_m3u8: directUrl }],
      },
    ],
  }) as any;

  const episode = payload.episodes[0].server_data[0];
  assert.equal(episode.link_m3u8, directUrl);
  assert.match(episode.link_m3u8_proxy, /^\/api\/hls-proxy\?/);

  const fallback = new URL(episode.link_m3u8_proxy, "https://cineverse.test");
  assert.equal(fallback.searchParams.get("url"), directUrl);
  assert.equal(
    verifySignedHlsProxyUrl(
      directUrl,
      fallback.searchParams.get("expires"),
      fallback.searchParams.get("signature"),
    ),
    true,
  );
});

test("does not create proxy fallbacks for empty or non-http media values", () => {
  const payload = addSignedHlsFallbacksInPayload({
    server_data: [{ link_m3u8: "" }, { link_m3u8: "/local/video.m3u8" }],
  }) as any;

  assert.equal(payload.server_data[0].link_m3u8_proxy, undefined);
  assert.equal(payload.server_data[1].link_m3u8_proxy, undefined);
});
