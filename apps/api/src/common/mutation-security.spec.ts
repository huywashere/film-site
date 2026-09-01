import { readFileSync } from 'fs';

function source(path: string) {
  return readFileSync(path, 'utf8');
}

describe('authenticated backend mutations', () => {
  it.each([
    [
      'src/movies/movies.controller.ts',
      /@Post\(["']:slug\/view["']\)[\s\S]{0,180}@UseGuards\(AuthGuard\(["']jwt["']\)\)/,
    ],
    [
      'src/reports/reports.controller.ts',
      /@Controller\(["']reports["']\)[\s\S]{0,100}@UseGuards\(AuthGuard\(["']jwt["']\)\)/,
    ],
    [
      'src/telemetry/telemetry.controller.ts',
      /@Post\(["']client\/batch["']\)[\s\S]{0,180}@UseGuards\(AuthGuard\(["']jwt["']\)\)/,
    ],
    [
      'src/ads/ads.controller.ts',
      /@Post\(["']:id\/view["']\)[\s\S]{0,180}@UseGuards\(AuthGuard\(["']jwt["']\)\)/,
    ],
    [
      'src/ads/ads.controller.ts',
      /@Post\(["']:id\/click["']\)[\s\S]{0,180}@UseGuards\(AuthGuard\(["']jwt["']\)\)/,
    ],
  ])('protects %s', (path, expectedGuard) => {
    expect(source(path)).toMatch(expectedGuard);
  });

  it('does not double-count requests with a second controller throttler guard', () => {
    for (const path of [
      'src/auth/auth.controller.ts',
      'src/movies/movies.controller.ts',
      'src/ratings/ratings.controller.ts',
      'src/reports/reports.controller.ts',
      'src/reviews/reviews.controller.ts',
    ]) {
      expect(source(path)).not.toContain('@UseGuards(ThrottlerGuard)');
    }
  });

  it('uses the distributed Nest limiter without a second process-local Express limiter', () => {
    expect(source('src/main.ts')).not.toContain('express-rate-limit');
    expect(source('src/app.module.ts')).toContain('RedisThrottlerStorage');
    expect(source('src/app.module.ts')).toContain('useClass: ThrottlerGuard');
  });

  it('keeps internal metrics closed when no secret is configured', () => {
    expect(source('src/telemetry/telemetry.controller.ts')).toContain(
      'if (!expected || !secureTokenMatch(token, expected))',
    );
  });
});
