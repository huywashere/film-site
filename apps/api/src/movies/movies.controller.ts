import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { MoviesService } from "./movies.service";

@Controller("movies")
@UseGuards(ThrottlerGuard)
export class MoviesController {
  constructor(private moviesService: MoviesService) {}

  // ── Danh sách phim ──────────────────────────────────────────────

  @Get("latest")
  getLatest(@Query("page") page = 1) {
    return this.moviesService.getLatest(+page);
  }

  /** Public weekly ranking used by the home-page Top 10 row. */
  @Get("trending")
  getTrending(@Query("limit") limit = 20) {
    return this.moviesService.getTrending(+limit);
  }

  @Get("series")
  getSeries(@Query("page") page = 1, @Query("limit") limit = 24) {
    return this.moviesService.getSeries(+page, +limit);
  }

  @Get("single")
  getSingle(@Query("page") page = 1, @Query("limit") limit = 24) {
    return this.moviesService.getSingle(+page, +limit);
  }

  @Get("anime")
  getAnime(@Query("page") page = 1, @Query("limit") limit = 24) {
    return this.moviesService.getAnime(+page, +limit);
  }

  @Get("tvshows")
  getTvShows(@Query("page") page = 1, @Query("limit") limit = 24) {
    return this.moviesService.getTvShows(+page, +limit);
  }

  @Get("filtered")
  getFiltered(
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("category") category?: string,
    @Query("country") country?: string,
    @Query("year") year?: number,
    @Query("page") page = 1,
    @Query("limit") limit = 24,
    @Query("sort_field") sortField?: string,
    @Query("sort_type") sortType?: string,
  ) {
    return this.moviesService.getFiltered({
      type,
      status,
      category,
      country,
      year: year ? +year : undefined,
      page: +page,
      limit: +limit,
      sort_field: sortField,
      sort_type: sortType,
    });
  }

  // ── Chi tiết phim ───────────────────────────────────────────────

  @Get("detail/:slug")
  getDetail(@Param("slug") slug: string) {
    return this.moviesService.getDetail(slug);
  }

  @Get("detail-v1/:slug")
  getDetailV1(@Param("slug") slug: string) {
    return this.moviesService.getDetailV1(slug);
  }

  @Get("by-id/:id")
  getById(@Param("id") id: string) {
    return this.moviesService.getById(id);
  }

  @Get("by-tmdb")
  getByTmdb(
    @Query("tmdb_id") tmdbId: string,
    @Query("type") type: "tv" | "movie",
    @Query("season") season?: number,
  ) {
    return this.moviesService.getByTmdb(
      tmdbId,
      type,
      season ? +season : undefined,
    );
  }

  @Get("by-imdb")
  getByImdb(@Query("imdb_id") imdbId: string) {
    return this.moviesService.getByImdb(imdbId);
  }

  // ── Thông tin bổ sung ───────────────────────────────────────────

  @Get("images")
  getImages(
    @Query("tmdb_type") tmdbType: "tv" | "movie",
    @Query("tmdb_id") tmdbId: string,
  ) {
    return this.moviesService.getImages(tmdbType, tmdbId);
  }

  @Get("cast")
  getCast(
    @Query("tmdb_type") tmdbType: "tv" | "movie",
    @Query("tmdb_id") tmdbId: string,
  ) {
    return this.moviesService.getCast(tmdbType, tmdbId);
  }

  @Get("keywords")
  getKeywords(
    @Query("tmdb_type") tmdbType: "tv" | "movie",
    @Query("tmdb_id") tmdbId: string,
  ) {
    return this.moviesService.getKeywords(tmdbType, tmdbId);
  }

  // ── Tìm kiếm & Lọc ──────────────────────────────────────────────

  /** Search: stricter limit (30/min) to prevent keyword scraping */
  @Get("search")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  search(
    @Query("keyword") keyword: string,
    @Query("page") page = 1,
    @Query("limit") limit = 24,
  ) {
    return this.moviesService.search(keyword || "", +page, +limit);
  }

  // ── Thể loại ────────────────────────────────────────────────────

  @Get("genres")
  getGenres() {
    return this.moviesService.getGenres();
  }

  @Get("genre/:slug")
  getByGenre(
    @Param("slug") slug: string,
    @Query("page") page = 1,
    @Query("limit") limit = 24,
  ) {
    return this.moviesService.getByGenre(slug, +page, +limit);
  }

  // ── Quốc gia ────────────────────────────────────────────────────

  @Get("countries")
  getCountries() {
    return this.moviesService.getCountries();
  }

  @Get("country/:slug")
  getByCountry(
    @Param("slug") slug: string,
    @Query("page") page = 1,
    @Query("limit") limit = 24,
  ) {
    return this.moviesService.getByCountry(slug, +page, +limit);
  }

  // ── Năm phát hành ───────────────────────────────────────────────

  @Get("years")
  getYears() {
    return this.moviesService.getYears();
  }

  @Get("year/:year")
  getByYear(
    @Param("year") year: number,
    @Query("page") page = 1,
    @Query("limit") limit = 24,
  ) {
    return this.moviesService.getByYear(+year, +page, +limit);
  }

  // ── Dynamic slug route (must be last) ───────────────────────────

  @Get(":slug")
  getMovieBySlug(@Param("slug") slug: string) {
    return this.moviesService.getDetail(slug);
  }
}
