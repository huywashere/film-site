import { expect, test } from '@playwright/test';

test.describe('live movie delivery', () => {
  test.skip(
    process.env.PLAYWRIGHT_LIVE !== '1',
    'Set PLAYWRIGHT_LIVE=1 to exercise real catalogue providers.',
  );

  test('a home-feed card resolves to detail, episodes and a playable manifest', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);

    const feedResponse = await request.get('/api/catalog-gateway/home-feed');
    expect(feedResponse.ok()).toBeTruthy();
    const feed = (await feedResponse.json()) as {
      sections?: Record<string, Array<Record<string, unknown>>>;
    };
    const item = Object.values(feed.sections || {})
      .flat()
      .find((candidate) => typeof candidate.slug === 'string' && candidate.slug);
    expect(item, 'home feed should contain at least one movie card').toBeTruthy();

    const slug = String(item!.slug);
    const bootstrapResponse = await request.get(
      `/api/catalog-gateway/movies/${encodeURIComponent(slug)}/bootstrap`,
    );
    expect(bootstrapResponse.ok()).toBeTruthy();
    const bootstrap = (await bootstrapResponse.json()) as {
      movie?: { name?: string };
      episodes?: Array<{
        server_data?: Array<{ link_m3u8?: string; link_embed?: string }>;
      }>;
    };
    expect(bootstrap.movie?.name).toBeTruthy();
    const episode = (bootstrap.episodes || [])
      .flatMap((group) => group.server_data || [])
      .find((candidate) => candidate.link_m3u8 || candidate.link_embed);
    expect(episode, 'movie detail should include a playable episode').toBeTruthy();

    if (episode?.link_m3u8) {
      const manifestResponse = await request.get(episode.link_m3u8, {
        timeout: 20_000,
      });
      expect(manifestResponse.ok()).toBeTruthy();
      expect((await manifestResponse.text()).trimStart()).toMatch(/^#EXTM3U/);
    }

    const detailResponse = await page.goto(`/film/${encodeURIComponent(slug)}`, {
      waitUntil: 'domcontentloaded',
    });
    expect(detailResponse?.ok()).toBeTruthy();
    await expect(page.getByText('Không tìm thấy phim')).toHaveCount(0);
  });
});
