import { normalizeTitle, matchMovies, mergeMovieRecords, UnifiedMovieRecord } from './dedupe';

const CATALOG_CACHE_KEY = 'cineverse_unified_catalog_v1';

export class IngestPipelineService {
  private static catalog: UnifiedMovieRecord[] = [];
  private static isIngesting = false;
  private static lastIngestTime = 0;

  /**
   * Fetches latest movies from 3 third-party APIs (KKPhim, OPhim, NguonC),
   * normalizes fields, deduplicates matching titles, and stores unified records.
   */
  public static async runIngestion(): Promise<UnifiedMovieRecord[]> {
    if (this.isIngesting) return this.catalog;
    this.isIngesting = true;

    try {
      console.log('🔄 [IngestPipeline] Starting multi-source API ingestion & deduplication...');
      const startTime = Date.now();

      const [kkphimRes, ophimRes, nguoncRes] = await Promise.allSettled([
        fetch('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1', { headers: { 'User-Agent': 'Mozilla/5.0' } }),
        fetch('https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=1', { headers: { 'User-Agent': 'Mozilla/5.0' } }),
        fetch('https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1', { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      ]);

      const rawItems: Array<{ item: any; provider: string }> = [];

      // Extract KKPhim
      if (kkphimRes.status === 'fulfilled' && kkphimRes.value.ok) {
        const data = await kkphimRes.value.json();
        const items = data.items || [];
        items.forEach((item: any) => rawItems.push({ item, provider: 'kkphim' }));
      }

      // Extract OPhim
      if (ophimRes.status === 'fulfilled' && ophimRes.value.ok) {
        const data = await ophimRes.value.json();
        const items = data.items || [];
        items.forEach((item: any) => rawItems.push({ item, provider: 'ophim' }));
      }

      // Extract NguonC
      if (nguoncRes.status === 'fulfilled' && nguoncRes.value.ok) {
        const data = await nguoncRes.value.json();
        const items = data.items || data.data?.items || [];
        items.forEach((item: any) => rawItems.push({ item, provider: 'nguonc' }));
      }

      console.log(`📥 [IngestPipeline] Raw items collected from 3 sources: ${rawItems.length}`);

      // Transform raw items to UnifiedMovieRecord
      const unifiedMap = new Map<string, UnifiedMovieRecord>();

      for (const { item, provider } of rawItems) {
        const title = item.name || item.title || '';
        const norm = normalizeTitle(title);
        if (!norm) continue;

        const incomingRecord: UnifiedMovieRecord = {
          id: item.slug || item._id || norm,
          slug: item.slug || norm,
          title,
          originTitle: item.origin_name || item.original_name,
          normalizedTitle: norm,
          year: item.year ? Number(item.year) : undefined,
          type: item.type || 'single',
          status: item.status,
          posterUrl: item.poster_url || item.thumb_url,
          thumbUrl: item.thumb_url || item.poster_url,
          description: item.content,
          sources: [
            {
              provider,
              sourceId: item._id || item.slug,
              url: provider === 'kkphim' ? `https://phimapi.com/phim/${item.slug}` : undefined,
            },
          ],
          updatedAt: Date.now(),
        };

        // Check if matching movie already exists in catalog
        let matched = false;
        for (const [key, existing] of unifiedMap.entries()) {
          if (matchMovies(existing, incomingRecord)) {
            unifiedMap.set(key, mergeMovieRecords(existing, incomingRecord));
            matched = true;
            break;
          }
        }

        if (!matched) {
          unifiedMap.set(incomingRecord.slug, incomingRecord);
        }
      }

      this.catalog = Array.from(unifiedMap.values());
      this.lastIngestTime = Date.now();

      console.log(
        `✅ [IngestPipeline] Deduplication complete! Merged into ${this.catalog.length} unified records in ${
          Date.now() - startTime
        }ms`
      );

      return this.catalog;
    } catch (err) {
      console.error('❌ [IngestPipeline] Ingestion failed:', err);
      return this.catalog;
    } finally {
      this.isIngesting = false;
    }
  }

  public static getCatalog(): UnifiedMovieRecord[] {
    return this.catalog;
  }
}
