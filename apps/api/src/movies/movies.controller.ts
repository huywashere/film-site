import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { MoviesService } from "./movies.service";
import { VidsrcService } from "./vidsrc.service";
import { RecordMovieViewDto } from "./movies.dto";

function boundedInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
}

function safeIdentifier(value: string, maxLength = 180) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maxLength || !/^[\p{L}\p{N}._~-]+$/u.test(normalized)) {
    throw new BadRequestException("Mã nội dung không hợp lệ");
  }
  return normalized;
}

@Controller("movies")
@UseGuards(ThrottlerGuard)
export class MoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly vidsrcService: VidsrcService,
  ) {}

  // ── Danh sách phim ──────────────────────────────────────────────

  @Get("latest")
  getLatest(@Query("page") page = 1) {
    return this.moviesService.getLatest(boundedInt(page, 1, 1, 10_000));
  }

  /** Public weekly ranking used by the home-page Top 10 row. */
  @Get("trending")
  getTrending(@Query("limit") limit = 20) {
    return this.moviesService.getTrending(boundedInt(limit, 20, 1, 100));
  }

  @Post(":slug/view")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  recordView(
    @Param("slug") slug: string,
    @Body() body: RecordMovieViewDto,
  ) {
    return this.moviesService.recordView(safeIdentifier(slug), body);
  }

  @Get("series")
  getSeries(@Query("page") page = 1, @Query("limit") limit = 24) {
    return this.moviesService.getSeries(boundedInt(page, 1, 1, 10_000), boundedInt(limit, 24, 1, 100));
  }

  @Get("single")
  getSingle(@Query("page") page = 1, @Query("limit") limit = 24) {
    return this.moviesService.getSingle(boundedInt(page, 1, 1, 10_000), boundedInt(limit, 24, 1, 100));
  }

  @Get("anime")
  getAnime(@Query("page") page = 1, @Query("limit") limit = 24) {
    return this.moviesService.getAnime(boundedInt(page, 1, 1, 10_000), boundedInt(limit, 24, 1, 100));
  }

  @Get("tvshows")
  getTvShows(@Query("page") page = 1, @Query("limit") limit = 24) {
    return this.moviesService.getTvShows(boundedInt(page, 1, 1, 10_000), boundedInt(limit, 24, 1, 100));
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
      year: year ? boundedInt(year, new Date().getFullYear(), 1888, 2100) : undefined,
      page: boundedInt(page, 1, 1, 10_000),
      limit: boundedInt(limit, 24, 1, 100),
      sort_field: ["modified.time", "year", "_id"].includes(sortField || "") ? sortField : undefined,
      sort_type: sortType === "asc" ? "asc" : "desc",
    });
  }

  // ── Chi tiết phim ───────────────────────────────────────────────

  @Get("detail/:slug")
  getDetail(@Param("slug") slug: string) {
    return this.moviesService.getDetail(safeIdentifier(slug));
  }

  @Get("detail-v1/:slug")
  getDetailV1(@Param("slug") slug: string) {
    return this.moviesService.getDetailV1(safeIdentifier(slug));
  }

  @Get("by-id/:id")
  getById(@Param("id") id: string) {
    return this.moviesService.getById(safeIdentifier(id));
  }

  @Get("by-tmdb")
  getByTmdb(
    @Query("tmdb_id") tmdbId: string,
    @Query("type") type: "tv" | "movie",
    @Query("season") season?: number,
  ) {
    return this.moviesService.getByTmdb(
      safeIdentifier(tmdbId, 20),
      type === "tv" ? "tv" : "movie",
      season ? boundedInt(season, 1, 1, 100) : undefined,
    );
  }

  @Get("by-imdb")
  getByImdb(@Query("imdb_id") imdbId: string) {
    return this.moviesService.getByImdb(safeIdentifier(imdbId, 20));
  }

  // ── Thông tin bổ sung ───────────────────────────────────────────

  @Get("images")
  getImages(
    @Query("tmdb_type") tmdbType: "tv" | "movie",
    @Query("tmdb_id") tmdbId: string,
  ) {
    return this.moviesService.getImages(tmdbType === "tv" ? "tv" : "movie", safeIdentifier(tmdbId, 20));
  }

  @Get("cast")
  getCast(
    @Query("tmdb_type") tmdbType: "tv" | "movie",
    @Query("tmdb_id") tmdbId: string,
  ) {
    return this.moviesService.getCast(tmdbType === "tv" ? "tv" : "movie", safeIdentifier(tmdbId, 20));
  }

  @Get("keywords")
  getKeywords(
    @Query("tmdb_type") tmdbType: "tv" | "movie",
    @Query("tmdb_id") tmdbId: string,
  ) {
    return this.moviesService.getKeywords(tmdbType === "tv" ? "tv" : "movie", safeIdentifier(tmdbId, 20));
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
    return this.moviesService.search(
      String(keyword || "").trim().slice(0, 120),
      boundedInt(page, 1, 1, 10_000),
      boundedInt(limit, 24, 1, 100),
    );
  }

  @Get("vidsrc/detail/:slug")
  getVidsrcDetail(@Param("slug") slug: string) {
    return this.vidsrcService.getMovie(safeIdentifier(slug));
  }

  @Get("vidsrc/search")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  searchVidsrc(
    @Query("keyword") keyword: string,
    @Query("page") page = 1,
  ) {
    return this.vidsrcService.search(
      String(keyword || "").trim().slice(0, 120),
      boundedInt(page, 1, 1, 10_000),
    );
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
    return this.moviesService.getByGenre(safeIdentifier(slug), boundedInt(page, 1, 1, 10_000), boundedInt(limit, 24, 1, 100));
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
    return this.moviesService.getByCountry(safeIdentifier(slug), boundedInt(page, 1, 1, 10_000), boundedInt(limit, 24, 1, 100));
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
    return this.moviesService.getByYear(boundedInt(year, new Date().getFullYear(), 1888, 2100), boundedInt(page, 1, 1, 10_000), boundedInt(limit, 24, 1, 100));
  }

  // ── Dynamic slug route (must be last) ───────────────────────────

  @Get(":slug")
  getMovieBySlug(@Param("slug") slug: string) {
    return this.moviesService.getDetail(safeIdentifier(slug));
  }
}
