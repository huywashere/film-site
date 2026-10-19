"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  movieApi,
  siteConfigApi,
  type PublicSiteConfiguration,
} from "@/lib/api";
import {
  FilmCard,
  FilmCardSkeleton,
  FilmItem,
} from "@/components/film/FilmCard";
import { useTranslation } from "@/store/langStore";
import { deduplicateSectionRow } from "@/lib/recommendation-engine";
import { extractFilmItems } from "@/lib/movie-normalizer";
import { watchProgressStorage } from "@/lib/watch-progress";
import { useSettingsStore } from "@/store/settingsStore";
import { rankHotCatalogFilms } from "@/lib/catalog-curation";
const HomeAnnouncementPopup = dynamic(
  () =>
    import("@/components/layout/HomeAnnouncementPopup").then(
      (module) => module.HomeAnnouncementPopup,
    ),
  { ssr: false },
);
const Top10RankedRow = dynamic(() =>
  import("@/components/film/Top10RankedRow").then(
    (module) => module.Top10RankedRow,
  ),
);
const ContinueWatchingRow = dynamic(() =>
  import("@/components/film/ContinueWatchingRow").then(
    (module) => module.ContinueWatchingRow,
  ),
);
const AuthHistoryCalloutBanner = dynamic(
  () =>
    import("@/components/auth/AuthHistoryCalloutBanner").then(
      (module) => module.AuthHistoryCalloutBanner,
    ),
  { ssr: false },
);
const HeroShowcaseSection = dynamic(() =>
  import("@/components/film/HeroShowcaseSection").then(
    (module) => module.HeroShowcaseSection,
  ),
);
const CuratedSpotlightSection = dynamic(() =>
  import("@/components/film/CuratedSpotlightSection").then(
    (module) => module.CuratedSpotlightSection,
  ),
);
const LandscapeSpotlightRow = dynamic(() =>
  import("@/components/film/LandscapeSpotlightRow").then(
    (module) => module.LandscapeSpotlightRow,
  ),
);
const WeeklyCuratedShowcase = dynamic(() =>
  import("@/components/film/WeeklyCuratedShowcase").then(
    (module) => module.WeeklyCuratedShowcase,
  ),
);
import HeroBanner from "@/app/components/HeroBanner";
import { cardFont } from "@/lib/fonts";
import {
  CURATED_SCIFI_HERO_POOL,
  CURATED_ACTION_HERO_POOL,
  CURATED_VFX_HERO_POOL,
} from "@/lib/curated-genre-pools";
import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";

const CURATED_VFX_FILM_ITEMS: FilmItem[] = CURATED_VFX_HERO_POOL.map((item) => ({
  _id: item._id,
  slug: item.slug,
  name: item.name,
  origin_name: item.origin_name,
  poster_url: item.poster_url,
  thumb_url: item.thumb_url,
  heroBackdrop: item.heroBackdrop,
  titleLogo: item.titleLogo,
  quality: item.quality || "FHD",
  lang: item.lang || "Vietsub + Thuyết Minh",
  year: item.year,
  type: item.type || "single",
  vote_average: item.vote_average,
  rating: item.rating,
  imdb_rating: item.imdb_rating,
  content: item.content,
  category: (item.genres || ["Kỹ Xảo"]).map((name) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  })),
  country: [{ name: "Âu Mỹ", slug: "au-my" }],
  tmdb: item.tmdb,
}));

const CURATED_KOREAN_ROMANCE_FILM_ITEMS: FilmItem[] = [
  {
    _id: "ha-canh-noi-anh",
    slug: "ha-canh-noi-anh",
    name: "Hạ Cánh Nơi Anh",
    origin_name: "Crash Landing on You",
    poster_url: "https://phimimg.com/upload/vod/20240312-1/05197bbc8d624a3e0ae6c9fcdb7c6ee8.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240312-1/730bba171e170e0b0d20e70ce51d45c4.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2019,
    type: "series",
    vote_average: 8.9,
    rating: 8.9,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "nu-hoang-nuoc-mat",
    slug: "nu-hoang-nuoc-mat",
    name: "Nữ Hoàng Nước Mắt",
    origin_name: "Queen Of Tears",
    poster_url: "https://phimimg.com/uploads/movies/20260723/nu-hoang-nuoc-mat-poster.webp",
    thumb_url: "https://phimimg.com/uploads/movies/20260723/nu-hoang-nuoc-mat-thumb.webp",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2024,
    type: "series",
    vote_average: 8.6,
    rating: 8.6,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "hen-ho-chon-cong-so",
    slug: "hen-ho-chon-cong-so",
    name: "Hẹn Hò Chốn Công Sở",
    origin_name: "Business Proposal",
    poster_url: "https://phimimg.com/upload/vod/20240319-1/99d76187b7a370f64238e9cb5cffbb4a.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240319-1/300fa4392411a44d497d6c00e66de13a.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2022,
    type: "series",
    vote_average: 8.4,
    rating: 8.4,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "hau-due-mat-troi",
    slug: "hau-due-mat-troi",
    name: "Hậu Duệ Mặt Trời",
    origin_name: "Descendants Of The Sun",
    poster_url: "https://phimimg.com/upload/vod/20240814-1/babd321c8a7bedc86b09fead89459ed8.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240814-1/7bb4992625e35a10b3d5cef173fe2509.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2016,
    type: "series",
    vote_average: 8.7,
    rating: 8.7,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "thu-ky-kim-sao-the",
    slug: "thu-ky-kim-sao-the",
    name: "Thư Ký Kim Sao Thế?",
    origin_name: "What's Wrong with Secretary Kim",
    poster_url: "https://phimimg.com/upload/vod/20240729-1/1ae80cef1d1876d74e994cb53b16d5bd.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240729-1/3076a178e12a412decd75b3afa18bc04.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2018,
    type: "series",
    vote_average: 8.3,
    rating: 8.3,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "khach-san-vuong-gia",
    slug: "khach-san-vuong-gia",
    name: "Khách Sạn Vương Giả",
    origin_name: "King The Land",
    poster_url: "https://phimimg.com/upload/vod/20240314-1/8364cf0c68c66c767b15e12e3aeb5259.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240314-1/6ba0418a61ce955e172ab21d73d62c4c.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2023,
    type: "series",
    vote_average: 8.1,
    rating: 8.1,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "dien-thi-co-sao",
    slug: "dien-thi-co-sao",
    name: "Điên Thì Có Sao",
    origin_name: "It's Okay to Not Be Okay",
    poster_url: "https://phimimg.com/upload/vod/20241120-1/2e0f59c2a8f554d7930da4bc0c82d770.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20241120-1/e7a74bf78521aac4099c3ca7a5e2b21f.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2020,
    type: "series",
    vote_average: 8.6,
    rating: 8.6,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "vi-sao-dua-anh-toi",
    slug: "vi-sao-dua-anh-toi",
    name: "Vì Sao Đưa Anh Tới",
    origin_name: "My Love From The Star",
    poster_url: "https://phimimg.com/upload/vod/20240118-1/b5a11f84b1974d47dbd52b77d604cb66.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240118-1/ca6b29b4326b5b347a081d83317e3a10.jpg",
    quality: "HD",
    lang: "Vietsub",
    year: 2013,
    type: "series",
    vote_average: 8.5,
    rating: 8.5,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "co-nang-cu-ta-kim-bok-joo",
    slug: "co-nang-cu-ta-kim-bok-joo",
    name: "Cô Nàng Cử Tạ Kim Bok Joo",
    origin_name: "Weightlifting Fairy Kim Bok-joo",
    poster_url: "https://phimimg.com/upload/vod/20240729-1/6591a51e040124b41e87f4c21394d364.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240729-1/11ad813cf34331ce3512d48818365704.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2016,
    type: "series",
    vote_average: 8.4,
    rating: 8.4,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "co-nang-manh-me-do-bong-soon",
    slug: "co-nang-manh-me-do-bong-soon",
    name: "Cô Nàng Mạnh Mẽ Do Bong Soon",
    origin_name: "Strong Woman Do Bong-Soon",
    poster_url: "https://phimimg.com/uploads/movies/20260810/co-nang-manh-me-do-bong-soon-poster.webp",
    thumb_url: "https://phimimg.com/uploads/movies/20260810/co-nang-manh-me-do-bong-soon-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
    year: 2017,
    type: "series",
    vote_average: 8.4,
    rating: 8.4,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "nguoi-tinh-anh-trang",
    slug: "nguoi-tinh-anh-trang",
    name: "Người Tình Ánh Trăng",
    origin_name: "Scarlet Heart: Ryeo (Moon Lovers)",
    poster_url: "https://phimimg.com/upload/vod/20250907-1/d0395e8cd4b62b13d60dd939ab043890.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20250907-1/4338e288f9272c710bed96421319e02f.jpg",
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    year: 2016,
    type: "series",
    vote_average: 8.8,
    rating: 8.8,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
];

const CURATED_WORKPLACE_FILM_ITEMS: FilmItem[] = [
  {
    _id: "hen-ho-chon-cong-so",
    slug: "hen-ho-chon-cong-so",
    name: "Hẹn Hò Chốn Công Sở",
    origin_name: "Business Proposal",
    poster_url: "https://phimimg.com/upload/vod/20240319-1/99d76187b7a370f64238e9cb5cffbb4a.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240319-1/300fa4392411a44d497d6c00e66de13a.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2022,
    type: "series",
    vote_average: 8.4,
    rating: 8.4,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }, { name: "Công Sở", slug: "cong-so" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "thu-ky-kim-sao-the",
    slug: "thu-ky-kim-sao-the",
    name: "Thư Ký Kim Sao Thế?",
    origin_name: "What's Wrong with Secretary Kim",
    poster_url: "https://phimimg.com/upload/vod/20240729-1/1ae80cef1d1876d74e994cb53b16d5bd.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240729-1/3076a178e12a412decd75b3afa18bc04.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2018,
    type: "series",
    vote_average: 8.3,
    rating: 8.3,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "khach-san-vuong-gia",
    slug: "khach-san-vuong-gia",
    name: "Khách Sạn Vương Giả",
    origin_name: "King The Land",
    poster_url: "https://phimimg.com/upload/vod/20240314-1/8364cf0c68c66c767b15e12e3aeb5259.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240314-1/6ba0418a61ce955e172ab21d73d62c4c.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2023,
    type: "series",
    vote_average: 8.1,
    rating: 8.1,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "soi-gia-pho-wall",
    slug: "soi-gia-pho-wall",
    name: "Sói Già Phố Wall",
    origin_name: "The Wolf of Wall Street",
    poster_url: "https://image.tmdb.org/t/p/w500/kW9LmvYHAaS9iA0tHmZVq8hQYoq.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/7Nwnmyzrtd0FkcRyPqmdzTPppQa.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2013,
    type: "single",
    vote_average: 8.2,
    rating: 8.2,
    category: [{ name: "Chính Kịch", slug: "chinh-kich" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "khoi-nghiep",
    slug: "khoi-nghiep",
    name: "Khởi Nghiệp",
    origin_name: "Start-Up",
    poster_url: "https://phimimg.com/upload/vod/20240118-1/b5a11f84b1974d47dbd52b77d604cb66.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240118-1/ca6b29b4326b5b347a081d83317e3a10.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2020,
    type: "series",
    vote_average: 8.2,
    rating: 8.2,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }, { name: "Chính Kịch", slug: "chinh-kich" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "nu-hoang-nuoc-mat",
    slug: "nu-hoang-nuoc-mat",
    name: "Nữ Hoàng Nước Mắt",
    origin_name: "Queen Of Tears",
    poster_url: "https://phimimg.com/uploads/movies/20260723/nu-hoang-nuoc-mat-poster.webp",
    thumb_url: "https://phimimg.com/uploads/movies/20260723/nu-hoang-nuoc-mat-thumb.webp",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2024,
    type: "series",
    vote_average: 8.6,
    rating: 8.6,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "co-nang-cu-ta-kim-bok-joo",
    slug: "co-nang-cu-ta-kim-bok-joo",
    name: "Cô Nàng Cử Tạ Kim Bok Joo",
    origin_name: "Weightlifting Fairy Kim Bok-joo",
    poster_url: "https://phimimg.com/upload/vod/20240729-1/6591a51e040124b41e87f4c21394d364.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240729-1/11ad813cf34331ce3512d48818365704.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2016,
    type: "series",
    vote_average: 8.4,
    rating: 8.4,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "co-nang-manh-me-do-bong-soon",
    slug: "co-nang-manh-me-do-bong-soon",
    name: "Cô Nàng Mạnh Mẽ Do Bong Soon",
    origin_name: "Strong Woman Do Bong-Soon",
    poster_url: "https://phimimg.com/uploads/movies/20260810/co-nang-manh-me-do-bong-soon-poster.webp",
    thumb_url: "https://phimimg.com/uploads/movies/20260810/co-nang-manh-me-do-bong-soon-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
    year: 2017,
    type: "series",
    vote_average: 8.4,
    rating: 8.4,
    category: [{ name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
];

const CURATED_ACCLAIMED_FILM_ITEMS: FilmItem[] = CURATED_HERO_FRANCHISE_POOL
  .filter((film) => (film.vote_average || 0) >= 8.2)
  .slice(0, 16)
  .map((film) => ({
    _id: film._id,
    slug: film.slug,
    name: film.name,
    origin_name: film.origin_name,
    poster_url: film.poster_url,
    thumb_url: film.thumb_url,
    heroBackdrop: film.heroBackdrop,
    quality: film.quality || "FHD",
    lang: film.lang || "Vietsub + Thuyết Minh",
    year: film.year,
    type: film.type || "single",
    vote_average: film.vote_average,
    rating: film.rating || film.vote_average,
    category: film.category || [{ name: "Tuyệt Tác", slug: "tuyet-tac" }],
  }));

const CURATED_HEALING_FILM_ITEMS: FilmItem[] = [
  {
    _id: "loi-hoi-dap-1988",
    slug: "loi-hoi-dap-1988",
    name: "Lời Hồi Đáp 1988",
    origin_name: "Reply 1988",
    poster_url: "https://phimimg.com/upload/vod/20240410-1/a0209c13b28b70ba5ba837b0d774a3b1.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240410-1/2a08871409d577caeb2be3f7384aa37a.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2015,
    type: "series",
    vote_average: 9.2,
    rating: 9.2,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }, { name: "Gia Đình", slug: "gia-dinh" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "di-den-noi-co-gio",
    slug: "di-den-noi-co-gio",
    name: "Đi Đến Nơi Có Gió",
    origin_name: "Meet Yourself",
    poster_url: "https://phimimg.com/upload/vod/20251108-1/17eb0f07b5aec4c9b54e6493cee341ff.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20251108-1/69debe7ddfece3fa0d021cdf68f5ee2f.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh + Lồng Tiếng",
    year: 2023,
    type: "series",
    vote_average: 8.8,
    rating: 8.8,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }, { name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Trung Quốc", slug: "trung-quoc" }],
  },
  {
    _id: "khu-rung-nho",
    slug: "khu-rung-nho",
    name: "Khu Rừng Nhỏ",
    origin_name: "Little Forest",
    poster_url: "https://phimimg.com/upload/vod/20231114-1/125e2a43fe6b19f72d082ae94a098bb3.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231114-1/cf0dac74af19f1b4a0d4547b74576829.jpg",
    quality: "HD",
    lang: "Vietsub",
    year: 2018,
    type: "single",
    vote_average: 8.2,
    rating: 8.2,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "dieu-ky-dieu",
    slug: "dieu-ky-dieu",
    name: "Điều Kỳ Diệu",
    origin_name: "Wonder",
    poster_url: "https://phimimg.com/upload/vod/20231024-1/e8aa04e0e2f2ac542a11b5834ab99455.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231024-1/af906c86adaf4c8c4a4d6cdb775ae7fa.jpg",
    quality: "HD",
    lang: "Vietsub",
    year: 2017,
    type: "single",
    vote_average: 8.0,
    rating: 8.0,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }, { name: "Gia Đình", slug: "gia-dinh" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "hang-xom-cua-toi-la-totoro",
    slug: "hang-xom-cua-toi-la-totoro",
    name: "Hàng Xóm Của Tôi Là Totoro",
    origin_name: "My Neighbor Totoro",
    poster_url: "https://phimimg.com/upload/vod/20250716-1/955eea6529face73697d1a49494fee79.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20250716-1/0106ac6b04c1c11d8a83991fbf87714d.jpg",
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    year: 1988,
    type: "hoathinh",
    vote_average: 8.4,
    rating: 8.4,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }, { name: "Hoạt Hình", slug: "hoat-hinh" }],
    country: [{ name: "Nhật Bản", slug: "nhat-ban" }],
  },
  {
    _id: "vung-dat-linh-hon",
    slug: "vung-dat-linh-hon",
    name: "Vùng Đất Linh Hồn",
    origin_name: "Spirited Away",
    poster_url: "https://phimimg.com/upload/vod/20250716-1/cdd1c3fa96086f48519393cc1ad98f7e.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20250716-1/3be680dcb8b627540ea2703730db511f.jpg",
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    year: 2001,
    type: "hoathinh",
    vote_average: 8.6,
    rating: 8.6,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }, { name: "Hoạt Hình", slug: "hoat-hinh" }],
    country: [{ name: "Nhật Bản", slug: "nhat-ban" }],
  },
  {
    _id: "nhat-ky-tu-do-cua-toi",
    slug: "nhat-ky-tu-do-cua-toi",
    name: "Nhật Ký Tự Do Của Tôi",
    origin_name: "My Liberation Notes",
    poster_url: "https://phimimg.com/upload/vod/20240520-1/e4cc7f7f999f6f0ebb5ef60886dba374.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240520-1/59fecfad85f554218346fa2e6e387292.jpg",
    quality: "HD",
    lang: "Vietsub",
    year: 2022,
    type: "series",
    vote_average: 8.3,
    rating: 8.3,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "khi-hoa-tra-no",
    slug: "khi-hoa-tra-no",
    name: "Khi Hoa Trà Nở",
    origin_name: "When the Camellia Blooms",
    poster_url: "https://phimimg.com/upload/vod/20241222-1/7a2a69c47f76995441bc5efa56ad5406.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20241222-1/740332ada3d5b99aa3d326d69b3205ff.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2019,
    type: "series",
    vote_average: 8.2,
    rating: 8.2,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }, { name: "Tình Cảm", slug: "tinh-cam" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "nguoi-thay-y-duc-phan-1",
    slug: "nguoi-thay-y-duc-phan-1",
    name: "Người Thầy Y Đức (Phần 1)",
    origin_name: "Dr. Romantic (Season 1)",
    poster_url: "https://phimimg.com/upload/vod/20231004-1/aedaed06dd0202136691549aa2bb08ae.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231004-1/a7bfcabb5e14f09d071737b4f7f3d892.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2016,
    type: "series",
    vote_average: 8.4,
    rating: 8.4,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "tiem-ca-phe-chua-lanh",
    slug: "tiem-ca-phe-chua-lanh",
    name: "Tiệm Cà Phê Chữa Lành",
    origin_name: "Finland Papa",
    poster_url: "https://phimimg.com/upload/vod/20240309-1/267fe3cf3eef63946ae6331ed68dd2ef.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20240309-1/734e423aa8972c59e2608140d9fa46e8.jpg",
    quality: "HD",
    lang: "Vietsub",
    year: 2023,
    type: "series",
    vote_average: 8.0,
    rating: 8.0,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "nha-tro-waikiki",
    slug: "nha-tro-waikiki",
    name: "Nhà Trọ Waikiki",
    origin_name: "Welcome to Waikiki",
    poster_url: "https://phimimg.com/upload/vod/20250116-1/3f24a722ca1743f14205a0fffcb3d4a7.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20250116-1/9554a4009e48897518965672ad56ea97.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2018,
    type: "series",
    vote_average: 8.3,
    rating: 8.3,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }, { name: "Hài Hước", slug: "hai-huoc" }],
    country: [{ name: "Hàn Quốc", slug: "han-quoc" }],
  },
  {
    _id: "nguoi-tinh-chua-lanh",
    slug: "nguoi-tinh-chua-lanh",
    name: "Người Tình Chữa Lành",
    origin_name: "Love Is Panacea",
    poster_url: "https://phimimg.com/upload/vod/20250218-1/36a7a22a7c06b0ccfd53f799cc8d0c22.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20250218-1/c30a64ee0ecb0d019b2c78f4d99bca79.jpg",
    quality: "FHD",
    lang: "Vietsub",
    year: 2023,
    type: "series",
    vote_average: 8.1,
    rating: 8.1,
    category: [{ name: "Chữa Lành", slug: "tam-ly" }],
    country: [{ name: "Trung Quốc", slug: "trung-quoc" }],
  },
];

const CURATED_ADVENTURE_FILM_ITEMS: FilmItem[] = [
  {
    _id: "tho-san-co-vat",
    slug: "tho-san-co-vat",
    name: "Thợ Săn Cổ Vật",
    origin_name: "Uncharted",
    poster_url: "https://phimimg.com/upload/vod/20230926-1/9fd12ecb8a43850ff2e5b785a0c1ae72.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20230926-1/be9b88427f1745af49ad15bf54642b9e.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2022,
    type: "single",
    vote_average: 7.2,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Hành Động", slug: "hanh-dong" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "indiana-jones-va-vong-quay-dinh-menh",
    slug: "indiana-jones-va-vong-quay-dinh-menh",
    name: "Indiana Jones Và Vòng Quay Định Mệnh",
    origin_name: "Indiana Jones and the Dial of Destiny",
    poster_url: "https://phimimg.com/upload/vod/20230910-1/c88666e8c1a1d01d599a67cff53ab7d7.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20230910-1/c88666e8c1a1d01d599a67cff53ab7d7.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2023,
    type: "single",
    vote_average: 6.7,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Hành Động", slug: "hanh-dong" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "jumanji-tro-choi-ky-ao-thang-cap",
    slug: "jumanji-tro-choi-ky-ao-thang-cap",
    name: "Jumanji - Trò Chơi Kỳ Ảo: Thăng Cấp",
    origin_name: "Jumanji: The Next Level",
    poster_url: "https://phimimg.com/upload/vod/20250915-1/ef204a33c091b37cf932193e67ab3d86.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20250915-1/6bb50206f676e7e4ab4b76c4121b06b2.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2019,
    type: "single",
    vote_average: 7.0,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Hài Hước", slug: "hai-huoc" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "cuop-bien-vung-caribbean-loi-nguyen-tau-ngoc-trai-den",
    slug: "cuop-bien-vung-caribbean-loi-nguyen-tau-ngoc-trai-den",
    name: "Cướp Biển Vùng Caribbean: Lời Nguyền Tàu Ngọc Trai Đen",
    origin_name: "Pirates of the Caribbean: The Curse of the Black Pearl",
    poster_url: "https://phimimg.com/upload/vod/20241008-1/44ee66be4e1e248afdb9a5aec76617b0.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20241008-1/c7193f8762bd01569d49ca33b8a9d72b.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2003,
    type: "single",
    vote_average: 8.0,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Hành Động", slug: "hanh-dong" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "cuop-bien-vung-caribbean-chiec-ruong-tu-than",
    slug: "cuop-bien-vung-caribbean-chiec-ruong-tu-than",
    name: "Cướp Biển Vùng Caribbean: Chiếc Rương Tử Thần",
    origin_name: "Pirates of the Caribbean: Dead Man's Chest",
    poster_url: "https://phimimg.com/upload/vod/20231102-1/8a3ffed4ba581125318ef8466101c8f9.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231102-1/1a717a73d2a10c4c26edefd5a4bfdfdf.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2006,
    type: "single",
    vote_average: 7.4,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Hành Động", slug: "hanh-dong" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "kong-dao-dau-lau",
    slug: "kong-dao-dau-lau",
    name: "Kong: Đảo Đầu Lâu",
    origin_name: "Kong: Skull Island",
    poster_url: "https://phimimg.com/upload/vod/20260108-1/6c3b562a404a7a7d3178962b8e714dc3.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20260108-1/af51948f63db9f6bf7c9ba3f9408b872.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2017,
    type: "single",
    vote_average: 6.5,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Hành Động", slug: "hanh-dong" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "nguoi-hobbit-hanh-trinh-vo-dinh",
    slug: "nguoi-hobbit-hanh-trinh-vo-dinh",
    name: "Người Hobbit: Hành Trình Vô Định",
    origin_name: "The Hobbit: An Unexpected Journey",
    poster_url: "https://phimimg.com/upload/vod/20250531-1/1af4d14c37fc5b1b69cdf7ed5923df3e.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20250531-1/e9301d1c4a7d4f0b315f0c0974f71b70.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2012,
    type: "single",
    vote_average: 7.8,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Kỳ Ảo", slug: "ky-ao" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "nguoi-hobbit-dai-chien-voi-rong-lua",
    slug: "nguoi-hobbit-dai-chien-voi-rong-lua",
    name: "Người Hobbit: Đại Chiến Với Rồng Lửa",
    origin_name: "The Hobbit: The Desolation of Smaug",
    poster_url: "https://phimimg.com/upload/vod/20250531-1/17c9567604f918b82399bf076c51b5ee.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20250531-1/13544113937967705074b76de7bb22a8.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2013,
    type: "single",
    vote_average: 7.8,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Kỳ Ảo", slug: "ky-ao" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "cuoc-doi-cua-pi",
    slug: "cuoc-doi-cua-pi",
    name: "Cuộc Đời Của Pi",
    origin_name: "Life of Pi",
    poster_url: "https://phimimg.com/upload/vod/20231023-1/97760d0209f95609b76a90e9cd05ac44.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231023-1/0d931233a1bf7c7259ff848e61913f79.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2012,
    type: "single",
    vote_average: 7.9,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Chính Kịch", slug: "chinh-kich" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
  {
    _id: "tomb-raider-huyen-thoai-bat-dau",
    slug: "tomb-raider-huyen-thoai-bat-dau",
    name: "Tomb Raider: Huyền Thoại Bắt Đầu",
    origin_name: "Tomb Raider",
    poster_url: "https://phimimg.com/upload/vod/20251002-1/4a17777db8336a77babdbe6a63558ae4.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20251002-1/ca0166b6277df0b90d90fb515d4f44a8.jpg",
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    year: 2018,
    type: "single",
    vote_average: 6.4,
    category: [{ name: "Phiêu Lưu", slug: "phieu-luu" }, { name: "Hành Động", slug: "hanh-dong" }],
    country: [{ name: "Âu Mỹ", slug: "au-my" }],
  },
];

const CURATED_SCIFI_FILM_ITEMS: FilmItem[] = CURATED_SCIFI_HERO_POOL.map((item) => ({
  _id: item._id,
  slug: item.slug,
  name: item.name,
  origin_name: item.origin_name,
  poster_url: item.poster_url,
  thumb_url: item.thumb_url,
  heroBackdrop: item.heroBackdrop,
  titleLogo: item.titleLogo,
  quality: item.quality || "FHD",
  lang: item.lang || "Vietsub + Thuyết Minh",
  year: item.year,
  type: item.type || "single",
  vote_average: item.vote_average,
  rating: item.rating,
  imdb_rating: item.imdb_rating,
  content: item.content,
  category: (item.genres || ["Khoa Học Viễn Tưởng"]).map((name) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  })),
  country: [{ name: "Âu Mỹ", slug: "au-my" }],
  tmdb: item.tmdb,
}));

const CURATED_ACTION_FILM_ITEMS: FilmItem[] = CURATED_ACTION_HERO_POOL.map((item) => ({
  _id: item._id,
  slug: item.slug,
  name: item.name,
  origin_name: item.origin_name,
  poster_url: item.poster_url,
  thumb_url: item.thumb_url,
  heroBackdrop: item.heroBackdrop,
  titleLogo: item.titleLogo,
  quality: item.quality || "FHD",
  lang: item.lang || "Vietsub + Thuyết Minh",
  year: item.year,
  type: item.type || "single",
  vote_average: item.vote_average,
  rating: item.rating,
  imdb_rating: item.imdb_rating,
  content: item.content,
  category: (item.genres || ["Hành Động"]).map((name) => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  })),
  country: [{ name: "Âu Mỹ", slug: "au-my" }],
  tmdb: item.tmdb,
}));

// Helper: Làm sạch và trích xuất các khóa nhận diện thương hiệu/franchise (tránh đề xuất Phần 1, Phần 2, Phần 3 cùng lúc)
function getFranchiseTokens(film: FilmItem): string[] {
  const tokens: string[] = [];

  const clean = (text?: string) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .replace(/\s*\([^)]*\)/g, " ") // Bỏ ngoặc (Phần 1), (Season 2), (2024), etc.
      .replace(/[-:]\s*(phan|season|part|tap|ss|mua)\s*\d+/gi, " ")
      .replace(/\s+(phan|season|part|tap|ss|mua)\s*\d+/gi, " ")
      .replace(/\s+(i{1,3}|iv|v|vi{1,3}|ix|x)$/gi, " ") // Số La Mã ở cuối
      .replace(/\s+\d+$/g, " ") // Số ở cuối như "Mortal Kombat 2" -> "mortal kombat"
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const cleanSlug = (s?: string) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/-phan-\d+/gi, "")
      .replace(/-season-\d+/gi, "")
      .replace(/-part-\d+/gi, "")
      .replace(/-ss\d+/gi, "")
      .replace(/-tap-\d+/gi, "")
      .replace(/-mua-\d+/gi, "")
      .replace(/-(i{1,3}|iv|v|vi{1,3}|ix|x)$/gi, "")
      .replace(/-\d+$/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .trim();
  };

  const nameToken = clean(film.name || film.title);
  const originToken = clean(film.origin_name);
  const slugToken = cleanSlug(film.slug);

  if (nameToken && nameToken.length >= 3) tokens.push(`name:${nameToken}`);
  if (originToken && originToken.length >= 3)
    tokens.push(`origin:${originToken}`);
  if (slugToken && slugToken.length >= 3) tokens.push(`slug:${slugToken}`);

  return tokens;
}

// Helper: Loại bỏ phim trùng lặp theo ID/slug VÀ chỉ giữ 1 phần đại diện duy nhất cho mỗi phim/series
function deduplicate(films: FilmItem[]): FilmItem[] {
  const seenIds = new Set<string>();
  const seenFranchiseTokens = new Set<string>();

  return (films || []).filter((film) => {
    if (!film) return false;
    const exactKey = String(film.slug || film._id || "")
      .trim()
      .toLowerCase();
    if (exactKey && seenIds.has(exactKey)) return false;

    const tokens = getFranchiseTokens(film);
    // Nếu phim này cùng tên franchise/series với phim đã có trong danh sách -> Bỏ qua phần trùng
    const hasDuplicateFranchise = tokens.some((token) =>
      seenFranchiseTokens.has(token),
    );
    if (hasDuplicateFranchise) return false;

    if (exactKey) seenIds.add(exactKey);
    tokens.forEach((token) => seenFranchiseTokens.add(token));
    return true;
  });
}

function catalogItemCount(data: any): number {
  const items = data?.data?.items || data?.items || [];
  return Array.isArray(items) ? items.length : 0;
}

function movieTaxonomyContains(
  values: Array<{ name?: string; slug?: string }> | undefined,
  needles: string[],
): boolean {
  const haystack = (values || [])
    .flatMap((value) => [value.name, value.slug])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function asCatalogPayload(items: FilmItem[]) {
  return { items, data: { items } };
}

// Danh sách thực tế Top 10 thịnh hành được xem nhiều trên hệ thống (chuẩn chất lượng FHD, không gán mác 4K ảo)
const REAL_TRENDING_TOP10_POOL: FilmItem[] = [
  {
    _id: "son-hai-kinh-thiet-lap-lai-trat-tu",
    name: "Sơn Hải Kinh: Thiết Lập Lại Trật Tự",
    origin_name: "The Classic of Mountains and Seas: Return to Order",
    slug: "son-hai-kinh-thiet-lap-lai-trat-tu",
    type: "single",
    poster_url:
      "https://phimimg.com/uploads/movies/20260719/son-hai-kinh-thiet-lap-lai-trat-tu-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260719/son-hai-kinh-thiet-lap-lai-trat-tu-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "tham-uyen-vo-gian",
    name: "Thâm Uyên Vô Gian",
    origin_name: "Abyss",
    slug: "tham-uyen-vo-gian",
    type: "series",
    poster_url:
      "https://phimimg.com/uploads/movies/20260910/tham-uyen-vo-gian-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260910/tham-uyen-vo-gian-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "tro-choi-con-muc-phan-2",
    name: "Trò Chơi Con Mực (Phần 2)",
    origin_name: "Squid Game (Season 2)",
    slug: "tro-choi-con-muc-phan-2",
    type: "series",
    poster_url:
      "https://phimimg.com/upload/vod/20241222-1/7f75c16e63ade7d45ad56f2f3e7a0453.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20241222-1/2c3095b8830832b8630d6d002975513b.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "nu-hoang-nuoc-mat",
    name: "Nữ Hoàng Nước Mắt",
    origin_name: "Queen Of Tears",
    slug: "nu-hoang-nuoc-mat",
    type: "series",
    poster_url:
      "https://phimimg.com/uploads/movies/20260723/nu-hoang-nuoc-mat-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260723/nu-hoang-nuoc-mat-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "deadpool-va-wolverine",
    name: "Deadpool Và Wolverine",
    origin_name: "Deadpool & Wolverine",
    slug: "deadpool-va-wolverine",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "sinh-dung-thoi-diem",
    name: "Sinh Đúng Thời Điểm",
    origin_name: "In My Prime",
    slug: "sinh-dung-thoi-diem",
    type: "series",
    poster_url:
      "https://phimimg.com/uploads/movies/20260904/sinh-dung-thoi-diem-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260904/sinh-dung-thoi-diem-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "duoi-lan-lua-dan",
    name: "Dưới Làn Lửa Đạn",
    origin_name: "Under Fire",
    slug: "duoi-lan-lua-dan",
    type: "single",
    poster_url:
      "https://phimimg.com/uploads/movies/20260911/duoi-lan-lua-dan-poster.webp",
    thumb_url:
      "https://phimimg.com/uploads/movies/20260911/duoi-lan-lua-dan-thumb.webp",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "ham-tru-an",
    name: "Hầm Trú Ẩn",
    origin_name: "Silo / Dugout",
    slug: "ham-tru-an",
    type: "series",
    poster_url:
      "https://phimimg.com/upload/vod/20250512-1/c0bc3e1895fc6a849bc27346e05c9ddb.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250512-1/1b8e245bf2a817ca4d0ef01cc310216c.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "sat-thu-john-wick-phan-4",
    name: "Sát Thủ John Wick: Phần 4",
    origin_name: "John Wick: Chapter 4",
    slug: "sat-thu-john-wick-phan-4",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20230922-1/ee89142558805b924282cf86bc015dc9.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20230922-1/b6beb41b9fdf9449c4313e6ff28975e8.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
  {
    _id: "avatar-dong-chay-cua-nuoc",
    name: "Avatar: Dòng Chảy Của Nước",
    origin_name: "Avatar: The Way Of Water",
    slug: "avatar-dong-chay-cua-nuoc",
    type: "single",
    poster_url:
      "https://phimimg.com/upload/vod/20250513-1/59fc5ffe0025ca40c99d48b070b59320.jpg",
    thumb_url:
      "https://phimimg.com/upload/vod/20250513-1/7b4e51db1a258ef9602558352066bfec.jpg",
    quality: "FHD",
    lang: "Vietsub",
  },
];

// Helper: Nhận diện và lọc triệt để phim Anime, Donghua 3D, Tokusatsu
function isAnimationOrAnime(film: FilmItem): boolean {
  if (!film || !film.name) return false;
  const name = (film.name || "").toLowerCase();
  const originName = (film.origin_name || "").toLowerCase();
  const slug = (film.slug || "").toLowerCase();
  const type = (film.type || "").toLowerCase();

  if (
    type === "hoathinh" ||
    type === "anime" ||
    slug.includes("hoat-hinh") ||
    slug.includes("anime")
  ) {
    return true;
  }

  if (
    movieTaxonomyContains(film.category, [
      "hoạt hình",
      "hoat-hinh",
      "anime",
      "animation",
      "donghua",
    ])
  ) {
    return true;
  }

  const combined = `${name} ${originName} ${slug}`;

  const animRegex =
    /hoạt hình|anime|donghua|manga|isekai|chuyển sinh|thánh nữ|trùm cuối|pokemon|kanata kara|ultraman|chiến binh ánh sáng|zombie sagashitemasu|yasei no last boss|tensei shita|phàm nhân tu tiên|đấu la đại lục|thôn phệ tinh không|vạn giới|độc tôn|tiên nghịch|già thiên|đại chúa tể|thần ấn vương tọa|nghịch thiên chí tôn|thương nguyên đồ|huyết quỷ|jojo|slime|tòa tháp thần linh|one piece|naruto|dragon ball|conan|doraemon|shin cậu bé|inuyasha|bleach|attack on titan|shingeki|demon slayer|kimetsu|jujutsu kaisen|chainsaw man|tokyo ghoul|black clover|my hero academia|boku no hero|hunter x hunter|sword art online|death note|gintama|haikyuu|fairy tail|seven deadly sins|nanatsu no taizai|yêu thần ký|luyện khí mười vạn năm|vạn cổ chí tôn|độc kiếm cửu thiên|sư huynh quá cẩn trọng/i;

  if (animRegex.test(combined)) {
    return true;
  }

  const isJapan = movieTaxonomyContains(film.country, ["nhật bản", "nhat-ban", "japan"]);
  if (isJapan && film.time && /\d+\s*phút\/tập/i.test(film.time)) {
    const match = film.time.match(/(\d+)\s*phút/i);
    if (match && Number(match[1]) <= 26) {
      return true;
    }
  }

  return false;
}

// Lọc CHỈ giữ lại phim người đóng thật (Live-Action), loại bỏ 3D/Anime cho các hàng phim thông thường
function filterLiveActionOnly(films: FilmItem[]): FilmItem[] {
  return films.filter((f) => !isAnimationOrAnime(f));
}

function isLikelySeries(film: FilmItem): boolean {
  const type = (film.type || "").toLowerCase();
  const episode = (film.episode_current || "").toLowerCase();
  const title = `${film.name || ""} ${film.origin_name || ""}`.toLowerCase();
  return (
    ["series", "phim-bo", "tvshows", "tv-shows"].includes(type) ||
    /tập|episode|hoàn tất|đang chiếu/.test(episode) ||
    /phần \d+|season \d+/.test(title)
  );
}

const SECTION_TITLE_TONES: Record<string, string> = {
  "Phim Mới Cập Nhật": "from-cyan-400 via-sky-400 to-indigo-300",
  "Series Âu-Mỹ Đỉnh Cao": "from-violet-400 via-purple-400 to-fuchsia-300",
  "Series Âu Mỹ Đỉnh Cao": "from-violet-400 via-purple-400 to-fuchsia-300",
  "Cổ Trang Kiếm Hiệp Đặc Sắc": "from-amber-300 via-orange-400 to-red-400",
  "Tuyệt Tác Khoa Học Viễn Tưởng": "from-orange-400 via-amber-400 to-yellow-300",
  "Phim Viễn Tưởng": "from-violet-400 via-fuchsia-400 to-rose-300",
  "Phim Thần Thoại & Kỹ Xảo": "from-violet-400 via-fuchsia-400 to-rose-300",
  "Phim Hành Động": "from-orange-400 via-amber-400 to-yellow-300",
  "Phim Hành Động Kịch Tính": "from-orange-400 via-amber-400 to-yellow-300",
  "Phim Kinh Dị": "from-red-400 via-rose-400 to-orange-300",
  "Phim Cổ Trang": "from-amber-300 via-orange-400 to-red-400",
  "Phim Chiếu Rạp": "from-fuchsia-400 via-violet-400 to-indigo-300",
  "Phim Âu-Mỹ Đáng Xem": "from-emerald-400 via-teal-400 to-cyan-300",
  "Series Quốc Tế": "from-blue-400 via-indigo-400 to-violet-300",
  "Anime & Hoạt Hình": "from-pink-400 via-rose-400 to-orange-300",
  "Phim Phiêu Lưu Mạo Hiểm": "from-lime-400 via-emerald-400 to-teal-300",
  "Phim Lẻ Âu-Mỹ Chất Lượng Cao": "from-amber-300 via-yellow-300 to-lime-300",
  "Phim Chính Kịch": "from-purple-400 via-violet-400 to-blue-300",
  "Phim Kinh Dị & Sinh Tồn": "from-red-400 via-rose-400 to-orange-300",
  "Thể Loại Chiến Tranh Và Gai Góc":
    "from-stone-300 via-neutral-400 to-slate-300",
  "Phim Hài": "from-yellow-300 via-lime-300 to-emerald-300",
  "Phim Tình Cảm": "from-fuchsia-400 via-pink-400 to-rose-300",
  "Phim Chữa Lành": "from-teal-300 via-emerald-400 to-green-300",
  "Phim Tình Cảm Hàn Quốc": "from-rose-400 via-pink-400 to-purple-300",
};

function sectionTitleTone(title: string) {
  return (
    SECTION_TITLE_TONES[title] || "from-cyan-400 via-sky-400 to-indigo-300"
  );
}

// Standard Film Carousel Section Component
function FilmSection({
  title,
  films,
  isLoading,
  href,
  cardVariant,
}: {
  title: string;
  films: FilmItem[];
  isLoading: boolean;
  href?: string;
  cardVariant?: 'standard' | 'landscape' | 'poster-pill';
}) {
  const { t } = useTranslation();
  const cardLayout = useSettingsStore((s) => s.cardLayout);
  const isLandscape = cardLayout === "horizontal";
  const rowRef = useRef<HTMLDivElement>(null);
  const [scrollStep, setScrollStep] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const effectiveCardVariant = cardVariant || (isLandscape ? "landscape" : "standard");
  const isPosterPill = effectiveCardVariant === "poster-pill";

  const itemWidthClass = isLandscape
    ? "w-[72%] min-w-[220px] shrink-0 snap-start sm:w-[46%] md:w-[32%] lg:w-[calc((100%-4*1rem)/5)] xl:w-[calc((100%-4*1rem)/5)]"
    : isPosterPill
      ? "w-[36%] min-w-[130px] shrink-0 snap-start sm:w-[26%] md:w-[20%] lg:w-[calc((100%-5*1rem-2rem)/6)] xl:w-[calc((100%-5*1rem-2rem)/6)] 2xl:w-[calc((100%-5*1rem-2rem)/6)]"
      : "w-[26%] min-w-[112px] shrink-0 snap-start sm:w-[22%] md:w-[18%] lg:w-[calc((100%-6*1rem)/7)] xl:w-[calc((100%-6*1rem)/7)]";

  const updateScrollStep = () => {
    const row = rowRef.current;
    if (!row) return;

    const maxScroll = row.scrollWidth - row.clientWidth;
    setScrollStep(
      maxScroll > 0 ? Math.round((row.scrollLeft / maxScroll) * 3) : 0,
    );
    setCanScrollLeft(row.scrollLeft > 10);
    setCanScrollRight(maxScroll > 0 && row.scrollLeft < maxScroll - 10);
  };

  useEffect(() => {
    updateScrollStep();
    const timer = setTimeout(updateScrollStep, 100);
    const handleResize = () => updateScrollStep();
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [films]);

  const scrollFilms = (direction: -1 | 1) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * row.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  if (!isLoading && (!films || films.length === 0)) return null;

  return (
    <div
      data-film-section="true"
      className={`${cardFont.className} mb-8 group/section`}
    >
      {/* Title Header matching user's requested layout (Inline pill button + right dash line pagination) */}
      <div className="mb-3 flex items-start justify-between gap-2 px-1 sm:items-center">
        {/* Left Side: Title + Inline "Xem tất cả >" link */}
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          <div className="min-w-0 flex-1 sm:flex-none">
            <h2
              data-film-section-title="true"
              className={`${cardFont.className} text-xl font-extrabold tracking-[-0.025em] text-white sm:text-2xl`}
            >
              {title}
            </h2>
          </div>
          {href && (
            <Link
              href={href}
              data-film-section-action="true"
              className="group/link inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs sm:text-sm font-semibold text-white/80 hover:text-white transition-colors select-none ml-1.5"
            >
              <span>{t("home.viewAll", "Xem tất cả")}</span>
              <ChevronRight size={14} className="stroke-[2.2] text-white/60 group-hover/link:text-white transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          )}
        </div>

        {/* Right Side: Dynamic Dash Line Pagination Indicators (— - - - -) */}
        {isLoading ? (
          <div className="h-2 w-24 rounded bg-white/[0.07] motion-safe:animate-pulse" />
        ) : (
          <div
            className="hidden items-center gap-1.5 sm:flex"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-0.5 rounded-full transition-[width,background-color] duration-200 ${
                  step === scrollStep ? "w-6 bg-white/85" : "w-3 bg-white/20"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Row Container with Navigation */}
      <div className="flex items-stretch gap-3" aria-busy={isLoading}>
        <div className="min-w-0 flex-1">
          <div
            ref={rowRef}
            onScroll={updateScrollStep}
            className={cn(
              "scrollbar-hide flex w-full snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain py-2.5 sm:gap-3.5 lg:gap-4",
              isPosterPill && "py-3 sm:py-4 px-1 sm:px-2"
            )}
          >
            {isLoading
              ? Array.from({ length: 14 }, (_, index) => (
                  <div
                    key={`film-skeleton-${index}`}
                    className={itemWidthClass}
                  >
                    <FilmCardSkeleton variant={effectiveCardVariant} />
                  </div>
                ))
              : films.map((film, idx) => (
                  <div
                    key={`slide-${title}-${film._id || film.slug || "film"}-${idx}`}
                    className={cn(itemWidthClass, isPosterPill && "py-1")}
                  >
                    <div className="transition-transform duration-300 ease-out hover:scale-[1.03] hover:z-30">
                      <FilmCard
                        film={film}
                        variant={effectiveCardVariant}
                        preferHighQuality={
                          title === "Phim Mới Cập Nhật" && idx < 4
                        }
                      />
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {!isLoading && (
          <div className="my-auto hidden shrink-0 flex-col justify-center gap-3 px-1 sm:flex">
            <button
              type="button"
              onClick={() => scrollFilms(1)}
              disabled={!canScrollRight}
              aria-label={`Xem phim tiếp theo trong ${title}`}
              title={`Xem phim tiếp theo trong ${title}`}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/45 transition-[color,transform,opacity] hover:scale-125 hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-20"
            >
              <ChevronRight size={23} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={() => scrollFilms(-1)}
              disabled={!canScrollLeft}
              aria-label={`Xem phim trước trong ${title}`}
              title={`Xem phim trước trong ${title}`}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/45 transition-[color,transform,opacity] hover:scale-125 hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-20"
            >
              <ChevronLeft size={23} strokeWidth={2.4} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Component Wrapper for Intersection Observer Lazy Load (No min-height gaps, GPU Accelerated, Progressive Scroll-Reveal)
function LazySection({
  children,
  initiallyVisible = false,
  onVisible,
}: {
  children: React.ReactNode;
  initiallyVisible?: boolean;
  onVisible?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(initiallyVisible);
  const [hasEntered, setHasEntered] = useState(initiallyVisible);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onVisible?.();
          observer.disconnect();
          requestAnimationFrame(() => {
            setHasEntered(true);
          });
        }
      },
      { rootMargin: "300px 0px" },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible, onVisible]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "[content-visibility:auto] [contain-intrinsic-size:1px_400px] transform-gpu transition-all duration-700 ease-out",
        initiallyVisible || hasEntered
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-5 pointer-events-none",
      )}
    >
      {isVisible ? (
        children
      ) : (
        <div className="mb-8 h-[260px] w-full rounded-2xl bg-white/[0.015] motion-safe:animate-pulse motion-safe:[animation-iteration-count:3] sm:h-[340px] lg:h-[360px]" />
      )}
    </div>
  );
}

export default function HomePageClient({
  initialPublicConfig,
  initialHeroFilms,
}: {
  initialPublicConfig?: PublicSiteConfiguration | null;
  initialHeroFilms?: FilmItem[];
}) {
  const { t } = useTranslation();

  const [showMoreSections, setShowMoreSections] = useState(false);
  const [loadedSections, setLoadedSections] = useState<Record<string, boolean>>({});
  const [userHistoryFilms, setUserHistoryFilms] = useState<FilmItem[]>([]);
  const infiniteSentinelRef = useRef<HTMLDivElement>(null);

  const markSectionLoaded = useCallback((sectionKey: string) => {
    setLoadedSections((prev) => (prev[sectionKey] ? prev : { ...prev, [sectionKey]: true }));
  }, []);

  const isSectionActive = useCallback(
    (key: string) => Boolean(showMoreSections || loadedSections[key]),
    [showMoreSections, loadedSections],
  );

  useEffect(() => {
    const revealSectionsForRestore = (event?: Event) => {
      let pending: { routeKey?: string; y?: number } | null = null;
      if (event instanceof CustomEvent) {
        pending = event.detail as { routeKey?: string; y?: number };
      } else {
        try {
          const raw = window.sessionStorage.getItem(
            "flexphim:pending-scroll-restore",
          );
          pending = raw ? JSON.parse(raw) : null;
        } catch {
          pending = null;
        }
      }

      const routeKey = `${window.location.pathname}${window.location.search}`;
      if (
        pending?.routeKey === routeKey &&
        typeof pending.y === "number" &&
        pending.y > window.innerHeight
      ) {
        setShowMoreSections(true);
      }
    };

    revealSectionsForRestore();
    window.addEventListener(
      "flexphim:restore-scroll",
      revealSectionsForRestore,
    );
    return () =>
      window.removeEventListener(
        "flexphim:restore-scroll",
        revealSectionsForRestore,
      );
  }, []);

  // Đọc danh sách phim người dùng thực tế đang xem / yêu thích trên hệ thống
  useEffect(() => {
    try {
      const history = watchProgressStorage.getHistoryEntries();
      if (Array.isArray(history) && history.length > 0) {
        const mapped: FilmItem[] = history
          .filter((item) => item.slug && item.title)
          .slice(0, 10)
          .map((item) => ({
            _id: item.slug,
            slug: item.slug,
            name: item.title,
            origin_name: item.originName || item.title,
            poster_url: item.poster || item.thumb || "",
            thumb_url: item.thumb || item.poster || "",
            quality: "FHD",
            lang: "Vietsub",
            type: "single",
          }));
        setUserHistoryFilms(mapped);
      }
    } catch {
      // Bỏ qua nếu môi trường không hỗ trợ localStorage
    }
  }, []);

  // Progressive scroll-based loading: automatically fetch and reveal remaining sections as user approaches them
  useEffect(() => {
    if (showMoreSections) return;
    const el = infiniteSentinelRef.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setShowMoreSections(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowMoreSections(true);
          observer.disconnect();
        }
      },
      { rootMargin: "650px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [showMoreSections]);

  const queryClient = useQueryClient();
  const hasCachedFeed = Boolean(queryClient.getQueryData(["home-feed-v1", 24]));
  const [catalogReady, setCatalogReady] = useState(true);
  const [secondaryCatalogReady, setSecondaryCatalogReady] = useState(true);
  const { data: publicConfig } = useQuery({
    queryKey: ["public-site-configuration"],
    queryFn: () => siteConfigApi.getPublic().then((response) => response.data),
    initialData: initialPublicConfig || undefined,
    // The first-party endpoint returns a safe default when the API is cold.
    // Keep the browser query enabled so a missed SSR fetch can still recover.
    enabled: true,
    staleTime: 5_000,
    retry: false,
  });
  useEffect(() => {
    if (publicConfig?.seoTitle) document.title = publicConfig.seoTitle;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description && publicConfig?.seoDescription)
      description.content = publicConfig.seoDescription;
  }, [publicConfig?.seoDescription, publicConfig?.seoTitle]);

  // The hero fills the first viewport. Load catalogue rows on the first sign
  // of scroll/touch intent, with a conservative fallback for idle visitors.
  // If returning to Home with cached feed data, catalogue rows are already active.
  useEffect(() => {
    if (hasCachedFeed) return;
    const reveal = () => setCatalogReady(true);
    const options: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener("wheel", reveal, options);
    window.addEventListener("touchstart", reveal, options);
    window.addEventListener("keydown", reveal, { once: true });

    // Do not leave catalogue rows as permanent skeletons when the visitor does
    // not scroll. Start the critical rows during the first idle window, while
    // still giving the hero the initial network/CPU budget.
    let idleId: number | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(reveal, { timeout: 900 });
    } else {
      fallbackTimer = globalThis.setTimeout(reveal, 650);
    }

    return () => {
      window.removeEventListener("wheel", reveal);
      window.removeEventListener("touchstart", reveal);
      window.removeEventListener("keydown", reveal);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };
  }, [hasCachedFeed]);

  useEffect(() => {
    if (!catalogReady || secondaryCatalogReady) return;
    const timer = window.setTimeout(() => setSecondaryCatalogReady(true), 400);
    return () => window.clearTimeout(timer);
  }, [catalogReady, secondaryCatalogReady]);

  const {
    data: homeFeedData,
    isLoading: homeFeedLoading,
  } = useQuery({
    queryKey: ["home-feed-v1", 24],
    queryFn: () => movieApi.getHomeFeed(24).then((response) => response.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: catalogReady,
  });

  const homeFeedSections = homeFeedData?.sections;
  const homeFeedPool = useMemo(
    () =>
      deduplicate([
        ...(homeFeedSections?.latest || []),
        ...(homeFeedSections?.series || []),
        ...(homeFeedSections?.single || []),
        ...(homeFeedSections?.anime || []),
      ]),
    [homeFeedSections],
  );

  // ── Initial 4 Sections Data (Prioritizing Hollywood/Western Live-Action & Fantasy Movies) ──
  // 1. Phim kỹ xảo (VFX, Fantasy & Myth Movies)
  const vfxGenreData = useMemo(
    () =>
      asCatalogPayload(
        homeFeedPool.filter((film) =>
          movieTaxonomyContains(film.category, [
            "thần thoại",
            "than-thoai",
            "viễn tưởng",
            "vien-tuong",
            "fantasy",
            "sci-fi",
          ]),
        ),
      ),
    [homeFeedPool],
  );
  const vfxUsUkData = vfxGenreData;
  const vfxLoading = secondaryCatalogReady && homeFeedLoading;

  // 2. Series Âu-Mỹ (Hollywood TV Series) - Multi-Page Fetch for Rich Curated Hero Showcase
  const { data: remoteUsUkSeries } = useQuery({
    queryKey: ["home-us-uk-series-list-v3"],
    queryFn: async () => {
      try {
        const [res1, res2, res3] = await Promise.all([
          movieApi.getByCountry("au-my", 1),
          movieApi.getByCountry("au-my", 2),
          movieApi.getByCountry("au-my", 3),
        ]);
        const list1 = extractFilmItems(res1.data);
        const list2 = extractFilmItems(res2.data);
        const list3 = extractFilmItems(res3.data);
        return [...list1, ...list2, ...list3];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    // This enrichment used to launch two more catalogue requests during the
    // hero/LCP window. The home feed already provides a useful first render.
    enabled: secondaryCatalogReady && Boolean(homeFeedSections?.series?.length),
  });

  const usUkSeriesData = useMemo(() => {
    const rawList = [
      ...(remoteUsUkSeries || []),
      ...(homeFeedSections?.series || []).filter(
        (film: FilmItem) =>
          movieTaxonomyContains(film.country, [
            "âu mỹ",
            "au-my",
            "mỹ",
            "anh",
            "united states",
          ]) || !film.country?.length,
      ),
      ...homeFeedPool.filter(
        (film) =>
          movieTaxonomyContains(film.country, [
            "âu mỹ",
            "au-my",
            "mỹ",
            "anh",
            "united states",
          ]) &&
          (film.type === "series" ||
            film.tmdb?.type === "tv" ||
            (film.episode_current &&
              !film.episode_current.toLowerCase().includes("full"))),
      ),
    ];
    return asCatalogPayload(deduplicateSectionRow(rawList));
  }, [remoteUsUkSeries, homeFeedSections?.series, homeFeedPool]);
  const usUkSeriesLoading = secondaryCatalogReady && homeFeedLoading;
  // 3. Phim hành động (Hollywood & International Action Movies)
  const actionData = useMemo(
    () =>
      asCatalogPayload(
        homeFeedPool.filter((film) =>
          movieTaxonomyContains(film.category, ["hành động", "hanh-dong", "action"]),
        ),
      ),
    [homeFeedPool],
  );
  const actionUsUkData = actionData;
  const actionLoading = secondaryCatalogReady && homeFeedLoading;

  // 4. Phim khoa học viễn tưởng bom tấn (Hollywood Sci-Fi Blockbusters)
  const scifiData = vfxGenreData;
  const scifiLoading = secondaryCatalogReady && homeFeedLoading;

  // Phim Tình Cảm Hàn Quốc (K-Drama Romance)
  const { data: remoteKoreanRomanceData, isLoading: koreanRomanceQueryLoading } = useQuery({
    queryKey: ["home-section-korean-romance-v1"],
    queryFn: async () => {
      try {
        const [res1, res2] = await Promise.all([
          movieApi.getFiltered({ country: "han-quoc", category: "tinh-cam", page: 1, limit: 24 }),
          movieApi.getFiltered({ country: "han-quoc", category: "tinh-cam", page: 2, limit: 24 }),
        ]);
        const list1 = extractFilmItems(res1.data);
        const list2 = extractFilmItems(res2.data);
        return [...list1, ...list2] as unknown as FilmItem[];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: catalogReady,
  });

  const koreanRomanceFilms = useMemo(() => {
    const remote = (remoteKoreanRomanceData || []) as FilmItem[];
    return deduplicate([
      ...CURATED_KOREAN_ROMANCE_FILM_ITEMS,
      ...remote,
    ]);
  }, [remoteKoreanRomanceData]);
  const koreanRomanceLoading = catalogReady && homeFeedLoading && koreanRomanceQueryLoading && !koreanRomanceFilms.length;

  // Phim Chữa Lành (Healing & Wholesome Life Drama)
  const { data: remoteHealingData, isLoading: healingQueryLoading } = useQuery({
    queryKey: ["home-section-healing-v1"],
    queryFn: async () => {
      try {
        const [res1, res2] = await Promise.all([
          movieApi.getFiltered({ category: "tam-ly", page: 1, limit: 24 }),
          movieApi.getFiltered({ category: "gia-dinh", page: 1, limit: 24 }),
        ]);
        const list1 = extractFilmItems(res1.data);
        const list2 = extractFilmItems(res2.data);
        return [...list1, ...list2] as unknown as FilmItem[];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: catalogReady,
  });

  const healingFilms = useMemo(() => {
    const remote = (remoteHealingData || []) as FilmItem[];
    return deduplicate([
      ...CURATED_HEALING_FILM_ITEMS,
      ...remote,
    ]);
  }, [remoteHealingData]);
  const healingLoading = catalogReady && homeFeedLoading && healingQueryLoading && !healingFilms.length;

  // 5-7. Các hàng danh mục chính được trả chung trong home-feed để trình
  // duyệt không phải tạo thêm request khi người dùng cuộn trang chủ.
  const { data: horrorFallbackData, isLoading: horrorFallbackLoading } =
    useQuery({
      queryKey: ["home-section-horror-v1"],
      queryFn: () => movieApi.getByGenre("kinh-di", 1).then((r) => r.data),
      enabled:
        secondaryCatalogReady &&
        !homeFeedLoading &&
        !homeFeedSections?.horror?.length,
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    });
  const { data: historicalFallbackData, isLoading: historicalFallbackLoading } =
    useQuery({
      queryKey: ["home-section-historical-v1"],
      queryFn: () => movieApi.getByGenre("co-trang", 1).then((r) => r.data),
      enabled:
        secondaryCatalogReady &&
        !homeFeedLoading &&
        !homeFeedSections?.historical?.length,
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    });
  const {
    data: theatricalFallbackData,
    isLoading: theatricalFallbackLoading,
  } = useQuery({
    queryKey: ["home-section-theatrical-v1"],
    queryFn: () => movieApi.getChieuRap(1).then((r) => r.data),
    enabled:
      secondaryCatalogReady &&
      !homeFeedLoading &&
      !homeFeedSections?.theatrical?.length,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const horrorData = useMemo(
    () =>
      homeFeedSections?.horror?.length
        ? asCatalogPayload(homeFeedSections.horror)
        : horrorFallbackData,
    [homeFeedSections?.horror, horrorFallbackData],
  );
  const historicalData = useMemo(
    () =>
      homeFeedSections?.historical?.length
        ? asCatalogPayload(homeFeedSections.historical)
        : historicalFallbackData,
    [historicalFallbackData, homeFeedSections?.historical],
  );

  const { data: wuxiaQueryData, isLoading: wuxiaQueryLoading } = useQuery({
    queryKey: ["home-section-wuxia-v1"],
    queryFn: () => movieApi.getByGenre("co-trang", 1).then((r) => r.data),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !homeFeedSections?.historical?.length,
  });
  const wuxiaData = useMemo(
    () =>
      homeFeedSections?.historical?.length
        ? asCatalogPayload(homeFeedSections.historical)
        : wuxiaQueryData || historicalData,
    [homeFeedSections?.historical, wuxiaQueryData, historicalData],
  );
  const wuxiaLoading = !homeFeedSections?.historical?.length && wuxiaQueryLoading && !wuxiaData;
  const theatricalData = useMemo(
    () =>
      homeFeedSections?.theatrical?.length
        ? asCatalogPayload(homeFeedSections.theatrical)
        : theatricalFallbackData,
    [homeFeedSections?.theatrical, theatricalFallbackData],
  );
  const horrorLoading =
    (catalogReady && homeFeedLoading) || horrorFallbackLoading;
  const historicalLoading =
    (catalogReady && homeFeedLoading) || historicalFallbackLoading;
  const theatricalLoading =
    (catalogReady && homeFeedLoading) || theatricalFallbackLoading;

  // ── Progressive On-Demand Section Queries (Triggered as User Scrolls to Each Row) ──

  // Chủ đề công sở (Workplace & Office Dramas)
  const { data: workplaceRemoteData, isLoading: workplaceQueryLoading } = useQuery({
    queryKey: ["home-section-workplace-v1"],
    queryFn: async () => {
      try {
        const [res1, res2] = await Promise.all([
          movieApi.getFiltered({ category: "tinh-cam", page: 1, limit: 24 }),
          movieApi.getFiltered({ category: "chinh-kich", page: 1, limit: 24 }),
        ]);
        const list1 = extractFilmItems(res1.data);
        const list2 = extractFilmItems(res2.data);
        return [...list1, ...list2] as unknown as FilmItem[];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isSectionActive("workplace"),
  });

  // Phim hay được đón nhận (Critically Acclaimed & Audience Favorites)
  const { data: acclaimedRemoteData, isLoading: acclaimedQueryLoading } = useQuery({
    queryKey: ["home-section-acclaimed-v1"],
    queryFn: () =>
      movieApi
        .getFiltered({
          sort_field: "view",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isSectionActive("acclaimed"),
  });

  // 5. Xem gì tiếp theo (Hollywood Recommendations)
  const { data: usUkBlockbustersData, isLoading: nextWatchQueryLoading } = useQuery({
    queryKey: ["us-uk-blockbusters-next"],
    queryFn: () => movieApi.getByCountry("au-my", 2).then((r) => r.data),
    enabled: isSectionActive("nextWatch"),
  });

  // 6. Series quốc tế (International Series)
  const seriesData = useMemo(
    () =>
      homeFeedSections?.series
        ? asCatalogPayload(homeFeedSections.series)
        : undefined,
    [homeFeedSections?.series],
  );

  // 7. Anime & Hoạt hình lồng tiếng (ONLY place for Anime/3D Animation)
  const animeData = useMemo(
    () =>
      homeFeedSections?.anime
        ? asCatalogPayload(homeFeedSections.anime)
        : undefined,
    [homeFeedSections?.anime],
  );
  const { data: animeGenreData, isLoading: animeGenreQueryLoading } = useQuery({
    queryKey: ["anime-genre", 1],
    queryFn: () => movieApi.getByGenre("hoat-hinh", 1).then((r) => r.data),
    enabled: isSectionActive("anime"),
  });

  // 8. Phim phiêu lưu mạo hiểm (Hollywood & International Adventure Movies)
  const { data: adventureUsUkData, isLoading: adventureUsUkLoading } = useQuery({
    queryKey: ["adventure-movies-us-uk-v2"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "phieu-luu",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: isSectionActive("adventure"),
  });
  const { data: adventureData, isLoading: adventureFeatureLoading } = useQuery({
    queryKey: ["adventure-movies-feature-films-v2"],
    queryFn: () =>
      movieApi
        .getFiltered({
          type: "phim-le",
          category: "phieu-luu",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: isSectionActive("adventure"),
  });
  const adventureQueryLoading = adventureUsUkLoading || adventureFeatureLoading;

  // 9. Phim chất lượng cao Hollywood
  const singleData = useMemo(
    () =>
      homeFeedSections?.single
        ? asCatalogPayload(homeFeedSections.single)
        : undefined,
    [homeFeedSections?.single],
  );

  // 10. Phim chính kịch chuyển thể từ sách (Book Adaptation Dramas)
  const { data: dramaData, isLoading: dramaQueryLoading } = useQuery({
    queryKey: ["drama-movies"],
    queryFn: () => movieApi.getByGenre("chinh-kich", 1).then((r) => r.data),
    enabled: isSectionActive("drama"),
  });

  // 11. Phim kịch tính về thảm họa chết chóc (Hollywood Thriller & Disaster)
  const { data: disasterUsUkData, isLoading: disasterQueryLoading } = useQuery({
    queryKey: ["disaster-movies-us-uk"],
    queryFn: () =>
      movieApi
        .getFiltered({
          country: "au-my",
          category: "kinh-di",
          page: 1,
          limit: 24,
        })
        .then((r) => r.data),
    enabled: isSectionActive("disaster"),
  });

  // 12. Thể loại chiến tranh và gai góc (War Movies)
  const { data: warData, isLoading: warQueryLoading } = useQuery({
    queryKey: ["war-movies"],
    queryFn: () => movieApi.getByGenre("chien-tranh", 1).then((r) => r.data),
    enabled: isSectionActive("war"),
  });

  // 13. Phim hài (Comedy Movies)
  const { data: comedyData, isLoading: comedyQueryLoading } = useQuery({
    queryKey: ["comedy-movies"],
    queryFn: () => movieApi.getByGenre("hai-huoc", 1).then((r) => r.data),
    enabled: isSectionActive("comedy"),
  });

  // 14. Bộ phim giải trí hoàn hảo (Romance & Feel-Good Movies)
  const { data: romanceData, isLoading: romanceQueryLoading } = useQuery({
    queryKey: ["romance-movies"],
    queryFn: () => movieApi.getByGenre("tinh-cam", 1).then((r) => r.data),
    enabled: isSectionActive("romance"),
  });

  // Latest films query for Phim Mới Cập Nhật
  const latestData = useMemo(
    () =>
      homeFeedSections?.latest
        ? asCatalogPayload(homeFeedSections.latest)
        : undefined,
    [homeFeedSections?.latest],
  );
  const latestLoading = catalogReady && homeFeedLoading;
  const trendingData = useMemo(
    () => homeFeedData?.top10 || [],
    [homeFeedData?.top10],
  );
  const trendingFilms = useMemo(
    () => deduplicate(Array.isArray(trendingData) ? trendingData : []),
    [trendingData],
  );

  // ── Process arrays with STRICT Live-Action filtering for Hollywood rows ──
  const vfxFilms = useMemo(() => {
    // Strictly filter out mistagged titles (Asian BL, monk comedies, tiên hiệp, donghua, 3D animation, etc.)
    const isGenuineVfx = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      if (
        /chiến binh ánh sáng|chiến binh nụ cười|ultraman|cả thế giới chỉ có anh kết nối|người yêu xui xẻo|unlucky bae|độc kiếm cửu thiên|sword god|nour|sư huynh quá cẩn trọng|pull strings|gián đột biến|the nest|tàn thuốc|luang pho|tiên hiệp|kiếm hiệp|ngôn tình|học đường|đam mỹ|boys love|tình cảm gia đình|hài kịch thái lan/i.test(
          combined,
        )
      ) {
        return false;
      }
      return (
        movieTaxonomyContains(film.category, [
          "thần thoại",
          "than-thoai",
          "viễn tưởng",
          "vien-tuong",
          "fantasy",
          "sci-fi",
          "kỹ xảo",
          "hành động",
        ]) &&
        (movieTaxonomyContains(film.country, [
          "âu mỹ",
          "au-my",
          "mỹ",
          "anh",
          "united states",
        ]) || !film.country?.length)
      );
    };

    const list1 = (vfxGenreData?.data?.items || vfxGenreData?.items || []).filter(isGenuineVfx);
    const list2 = (vfxUsUkData?.data?.items || vfxUsUkData?.items || []).filter(isGenuineVfx);

    return deduplicate([
      ...CURATED_VFX_FILM_ITEMS,
      ...filterLiveActionOnly([...list1, ...list2]),
    ]);
  }, [vfxGenreData, vfxUsUkData]);

  const usUkSeriesFilms = useMemo(() => {
    const firstPage =
      usUkSeriesData?.data?.items || usUkSeriesData?.items || [];
    const liveAction = filterLiveActionOnly(
      deduplicate(firstPage),
    );
    return liveAction.filter(isLikelySeries);
  }, [usUkSeriesData]);

  const actionFilms = useMemo(() => {
    // Only allow genuine Action Blockbusters (strictly filter out Asian BL, monk comedies, tiên hiệp, donghua, teen romance, etc.)
    const isGenuineAction = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      if (
        /chiến binh ánh sáng|tàn thuốc|luang pho|người yêu xui xẻo|unlucky bae|độc kiếm cửu thiên|sư huynh quá cẩn trọng|tiên hiệp|kiếm hiệp|ngôn tình|học đường|đam mỹ|boys love|tình cảm gia đình|hài kịch thái lan|gián đột biến/i.test(
          combined,
        )
      ) {
        return false;
      }
      return movieTaxonomyContains(film.category, ["hành động", "hanh-dong", "action"]);
    };

    const usUkList = (actionUsUkData?.data?.items || actionUsUkData?.items || []).filter(isGenuineAction);
    const genList = (actionData?.data?.items || actionData?.items || []).filter(isGenuineAction);

    return deduplicate([
      ...CURATED_ACTION_FILM_ITEMS,
      ...filterLiveActionOnly([...usUkList, ...genList]),
    ]);
  }, [actionUsUkData, actionData]);

  const scifiFilms = useMemo(() => {
    // Only allow genuine Sci-Fi live-action films (strictly filter out Asian BL/teen romance, tiên hiệp, donghua, or comedy series that are mistagged by upstream APIs)
    const isGenuineSciFi = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      if (
        /người yêu xui xẻo|unlucky bae|độc kiếm cửu thiên|sư huynh quá cẩn trọng|chiến binh ánh sáng|chiến binh nụ cười|tiên hiệp|kiếm hiệp|ngôn tình|học đường|đam mỹ|boys love|tình cảm gia đình|hài kịch thái lan|gián đột biến/i.test(
          combined,
        )
      ) {
        return false;
      }
      return movieTaxonomyContains(film.category, ["viễn tưởng", "vien-tuong", "sci-fi"]);
    };

    const usUkList = (vfxUsUkData?.data?.items || vfxUsUkData?.items || []).filter(isGenuineSciFi);
    const genList = (scifiData?.data?.items || scifiData?.items || []).filter(isGenuineSciFi);

    return deduplicate([
      ...CURATED_SCIFI_FILM_ITEMS,
      ...filterLiveActionOnly([...usUkList, ...genList]),
    ]);
  }, [vfxUsUkData, scifiData]);

  const horrorFilms = useMemo(() => {
    const list = horrorData?.data?.items || horrorData?.items || [];
    return deduplicate(
      rankHotCatalogFilms(filterLiveActionOnly(list), trendingFilms),
    );
  }, [horrorData, trendingFilms]);

  const wuxiaFilms = useMemo(() => {
    const list = wuxiaData?.data?.items || wuxiaData?.items || [];
    const poolMatches = homeFeedPool.filter((film) =>
      movieTaxonomyContains(film.category, [
        "cổ trang",
        "co-trang",
        "kiếm hiệp",
        "kiem-hiep",
        "tiên hiệp",
        "tien-hiep",
        "võ thuật",
      ]),
    );
    return deduplicate(
      rankHotCatalogFilms(
        filterLiveActionOnly([...list, ...poolMatches]),
        trendingFilms,
      ),
    );
  }, [wuxiaData, homeFeedPool, trendingFilms]);

  const historicalFilms = useMemo(() => {
    const list = historicalData?.data?.items || historicalData?.items || [];
    return deduplicate(
      rankHotCatalogFilms(filterLiveActionOnly(list), trendingFilms),
    );
  }, [historicalData, trendingFilms]);

  const theatricalFilms = useMemo(() => {
    const list = theatricalData?.data?.items || theatricalData?.items || [];
    return deduplicate(
      rankHotCatalogFilms(list, trendingFilms, { releaseFocused: true }),
    );
  }, [theatricalData, trendingFilms]);

  const nextWatchFilms = useMemo(() => {
    const list =
      usUkBlockbustersData?.data?.items || usUkBlockbustersData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [usUkBlockbustersData]);

  const seriesFilms = useMemo(() => {
    const list = seriesData?.data?.items || seriesData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [seriesData]);

  // Anime & 3D Animation (ONLY row allowed to contain Animation)
  const animeFilms = useMemo(() => {
    const list1 = animeData?.data?.items || animeData?.items || [];
    const list2 = animeGenreData?.data?.items || animeGenreData?.items || [];
    return deduplicate([...list1, ...list2]);
  }, [animeData, animeGenreData]);

  const adventureFilms = useMemo(() => {
    const isGenuineAdventure = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      if (isAnimationOrAnime(film)) return false;
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      if (
        /chiến binh ánh sáng|ultraman|chuyển sinh|thánh nữ|trùm cuối|kanata|zombie sagashitemasu|vạn giới|độc tôn|tu tiên|độc kiếm|sư huynh|gián đột biến|tàn thuốc|luang pho|tiên hiệp|ngôn tình|đam mỹ|boys love|hài kịch thái lan/i.test(
          combined,
        )
      ) {
        return false;
      }
      return true;
    };

    const usUkList = (adventureUsUkData?.data?.items || adventureUsUkData?.items || []).filter(isGenuineAdventure);
    const featureList = (adventureData?.data?.items || adventureData?.items || []).filter(isGenuineAdventure);
    const poolMatches = homeFeedPool.filter(
      (film) =>
        movieTaxonomyContains(film.category, ["phiêu lưu", "phieu-luu", "adventure"]) &&
        isGenuineAdventure(film),
    );

    return deduplicate([
      ...CURATED_ADVENTURE_FILM_ITEMS,
      ...filterLiveActionOnly([...usUkList, ...featureList, ...poolMatches]),
    ]);
  }, [adventureUsUkData, adventureData, homeFeedPool]);

  const singleFilms = useMemo(() => {
    const list = singleData?.data?.items || singleData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [singleData]);

  const dramaFilms = useMemo(() => {
    const list = dramaData?.data?.items || dramaData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [dramaData]);

  const disasterFilms = useMemo(() => {
    const list = disasterUsUkData?.data?.items || disasterUsUkData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [disasterUsUkData]);

  const warFilms = useMemo(() => {
    const list = warData?.data?.items || warData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [warData]);

  const comedyFilms = useMemo(() => {
    const list = comedyData?.data?.items || comedyData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [comedyData]);

  const romanceFilms = useMemo(() => {
    const list = romanceData?.data?.items || romanceData?.items || [];
    return filterLiveActionOnly(deduplicate(list));
  }, [romanceData]);

  const workplaceFilms = useMemo(() => {
    const isWorkplaceFilm = (film: FilmItem) => {
      if (!film?.name || !film?.slug) return false;
      const combined = `${film.name} ${film.origin_name || ""} ${film.content || ""}`.toLowerCase();
      return (
        /công sở|văn phòng|thư ký|tổng tài|sếp|giám đốc|khởi nghiệp|kinh doanh|doanh nghiệp|đồng nghiệp|tài chính|thương trường|luật sư|bác sĩ|nghề nghiệp|hẹn hò chốn công sở|office|business|secretary|workplace|intern|corporate|boss/i.test(
          combined,
        ) ||
        [
          "hen-ho-chon-cong-so",
          "thu-ky-kim-sao-the",
          "khach-san-vuong-gia",
          "soi-gia-pho-wall",
          "nu-hoang-nuoc-mat",
          "khoi-nghiep",
          "co-di-ma-lay-chong-toi",
          "co-nang-cu-ta-kim-bok-joo",
          "co-nang-manh-me-do-bong-soon",
        ].includes(film.slug)
      );
    };

    const remote = (workplaceRemoteData || []).filter(isWorkplaceFilm);
    const poolMatches = homeFeedPool.filter(isWorkplaceFilm);

    return deduplicate([
      ...CURATED_WORKPLACE_FILM_ITEMS,
      ...filterLiveActionOnly([...remote, ...poolMatches]),
    ]);
  }, [workplaceRemoteData, homeFeedPool]);

  const acclaimedFilms = useMemo(() => {
    const list = acclaimedRemoteData?.data?.items || acclaimedRemoteData?.items || [];
    const highRatedPool = homeFeedPool.filter(
      (film) => (film.vote_average || film.rating || 0) >= 8.0,
    );
    return deduplicate([
      ...CURATED_ACCLAIMED_FILM_ITEMS,
      ...rankHotCatalogFilms(
        filterLiveActionOnly([...list, ...highRatedPool]),
        trendingFilms,
      ),
    ]);
  }, [acclaimedRemoteData, homeFeedPool, trendingFilms]);

  const workplaceLoading =
    isSectionActive("workplace") &&
    workplaceQueryLoading &&
    !workplaceFilms.length;
  const acclaimedLoading =
    isSectionActive("acclaimed") &&
    acclaimedQueryLoading &&
    !acclaimedFilms.length;
  const nextWatchLoading =
    isSectionActive("nextWatch") &&
    nextWatchQueryLoading &&
    !nextWatchFilms.length;
  const seriesLoading =
    isSectionActive("series") && homeFeedLoading && !seriesFilms.length;
  const animeLoading =
    isSectionActive("anime") &&
    (homeFeedLoading || animeGenreQueryLoading) &&
    !animeFilms.length;
  const adventureLoading =
    isSectionActive("adventure") &&
    adventureQueryLoading &&
    !adventureFilms.length;
  const singleLoading =
    isSectionActive("single") && homeFeedLoading && !singleFilms.length;
  const dramaLoading =
    isSectionActive("drama") && dramaQueryLoading && !dramaFilms.length;
  const disasterLoading =
    isSectionActive("disaster") &&
    disasterQueryLoading &&
    !disasterFilms.length;
  const warLoading =
    isSectionActive("war") && warQueryLoading && !warFilms.length;
  const comedyLoading =
    isSectionActive("comedy") && comedyQueryLoading && !comedyFilms.length;
  const romanceLoading =
    isSectionActive("romance") && romanceQueryLoading && !romanceFilms.length;

  const latestFilms = useMemo(
    () => deduplicate(latestData?.items || latestData?.data?.items || []),
    [latestData],
  );
  // Deduplication registry & row limits
  const {
    top10List,
    latestRowList,
    wuxiaRowList,
    vfxRowList,
    usUkSeriesRowList,
    actionRowList,
    scifiRowList,
    horrorRowList,
    historicalRowList,
    theatricalRowList,
    acclaimedRowList,
    workplaceRowList,
    nextWatchRowList,
    seriesRowList,
    animeRowList,
    adventureRowList,
    singleRowList,
    dramaRowList,
    disasterRowList,
    warRowList,
    comedyRowList,
    romanceRowList,
    koreanRomanceRowList,
    healingRowList,
  } = useMemo(() => {
    const buildRow = (rawFilms: FilmItem[], targetCount = 14): FilmItem[] => {
      return deduplicate(rawFilms).slice(0, targetCount);
    };

    // Initial Sections
    const latestRowList = buildRow(latestFilms, 21);
    const wuxiaRowList = buildRow(wuxiaFilms, 14);
    const vfxRowList = buildRow(vfxFilms, 14);
    const usUkSeriesRowList = buildRow(usUkSeriesFilms, 30);
    const actionRowList = buildRow(actionFilms, 14);
    const koreanRomanceRowList = buildRow(koreanRomanceFilms, 14);
    const healingRowList = buildRow(healingFilms, 14);
    const scifiRowList = buildRow(scifiFilms, 14);
    const horrorRowList = buildRow(horrorFilms, 14);
    const historicalRowList = buildRow(historicalFilms, 14);
    const theatricalRowList = buildRow(theatricalFilms, 14);
    const acclaimedRowList = buildRow(acclaimedFilms, 14);
    const workplaceRowList = buildRow(workplaceFilms, 14);

    // Lazy 10 Sections
    const nextWatchRowList = buildRow(nextWatchFilms, 14);
    const seriesRowList = buildRow(seriesFilms, 21);
    const animeRowList = buildRow(animeFilms, 21);
    const adventureRowList = buildRow(adventureFilms, 14);
    const singleRowList = buildRow(singleFilms, 21);
    const dramaRowList = buildRow(dramaFilms, 14);
    const disasterRowList = buildRow(disasterFilms, 14);
    const warRowList = buildRow(warFilms, 14);
    const comedyRowList = buildRow(comedyFilms, 14);
    const romanceRowList = buildRow(romanceFilms, 14);

    const sectionSlugs = new Set(
      [
        ...latestRowList,
        ...wuxiaRowList,
        ...vfxRowList,
        ...usUkSeriesRowList,
        ...actionRowList,
        ...koreanRomanceRowList,
        ...healingRowList,
        ...scifiRowList,
        ...horrorRowList,
        ...historicalRowList,
        ...theatricalRowList,
        ...acclaimedRowList,
        ...workplaceRowList,
        ...nextWatchRowList,
        ...seriesRowList,
        ...animeRowList,
        ...adventureRowList,
        ...singleRowList,
        ...dramaRowList,
        ...disasterRowList,
        ...warRowList,
        ...comedyRowList,
        ...romanceRowList,
      ].map((film) => film.slug),
    );

    // Phim thực tế người dùng xem nhiều & yêu thích trên hệ thống
    const realCandidates = deduplicate([
      ...userHistoryFilms,
      ...trendingFilms,
      ...latestFilms,
      ...usUkSeriesFilms,
      ...actionFilms,
      ...koreanRomanceFilms,
      ...healingFilms,
      ...vfxFilms,
      ...scifiFilms,
      ...horrorFilms,
      ...historicalFilms,
      ...theatricalFilms,
      ...acclaimedFilms,
      ...workplaceFilms,
      ...REAL_TRENDING_TOP10_POOL,
    ]);

    const sanitizedCandidates = realCandidates.map((film) => {
      const safeQuality = (film.quality || "FHD")
        .replace(/4K\s*Ultra\s*HD|4K/gi, "FHD")
        .trim();
      return {
        ...film,
        quality: safeQuality || "FHD",
      };
    });

    const top10List = deduplicateSectionRow(
      filterLiveActionOnly(sanitizedCandidates),
    ).slice(0, 10);

    return {
      top10List,
      latestRowList,
      wuxiaRowList,
      vfxRowList,
      usUkSeriesRowList,
      actionRowList,
      koreanRomanceRowList,
      healingRowList,
      scifiRowList,
      horrorRowList,
      historicalRowList,
      theatricalRowList,
      acclaimedRowList,
      workplaceRowList,
      nextWatchRowList,
      seriesRowList,
      animeRowList,
      adventureRowList,
      singleRowList,
      dramaRowList,
      disasterRowList,
      warRowList,
      comedyRowList,
      romanceRowList,
    };
  }, [
    userHistoryFilms,
    trendingFilms,
    latestFilms,
    vfxFilms,
    usUkSeriesFilms,
    actionFilms,
    koreanRomanceFilms,
    healingFilms,
    scifiFilms,
    horrorFilms,
    historicalFilms,
    theatricalFilms,
    acclaimedFilms,
    workplaceFilms,
    nextWatchFilms,
    seriesFilms,
    animeFilms,
    adventureFilms,
    singleFilms,
    dramaFilms,
    disasterFilms,
    warFilms,
    comedyFilms,
    romanceFilms,
  ]);

  const configuredTop10List = useMemo(() => {
    const slugs = publicConfig?.homeTop10Slugs || [];
    if (!slugs.length) return top10List;
    const pool = deduplicate([...top10List, ...trendingFilms, ...latestFilms]);
    const selected = slugs
      .map((slug) => pool.find((film) => film.slug === slug))
      .filter((film): film is FilmItem => Boolean(film));
    return deduplicate([...selected, ...pool]).slice(0, 10);
  }, [latestFilms, publicConfig?.homeTop10Slugs, top10List, trendingFilms]);

  const weeklyMobileRowList = useMemo(() => {
    const interleaved: FilmItem[] = [];
    const length = Math.max(seriesRowList.length, singleRowList.length);
    for (let index = 0; index < length; index += 1) {
      if (seriesRowList[index]) interleaved.push(seriesRowList[index]);
      if (singleRowList[index]) interleaved.push(singleRowList[index]);
    }
    return deduplicateSectionRow(interleaved).slice(0, 14);
  }, [seriesRowList, singleRowList]);

  const customFeaturedSections = useMemo(() => {
    const rows = publicConfig?.homeFeaturedRows;
    if (!rows || typeof rows !== "object" || Array.isArray(rows)) return {};

    const filmPool = deduplicate([
      ...latestFilms,
      ...trendingFilms,
      ...vfxFilms,
      ...usUkSeriesFilms,
      ...actionFilms,
      ...koreanRomanceFilms,
      ...healingFilms,
      ...scifiFilms,
      ...horrorFilms,
      ...historicalFilms,
      ...theatricalFilms,
      ...seriesFilms,
      ...animeFilms,
      ...singleFilms,
    ]);

    return Object.fromEntries(
      Object.entries(rows).flatMap(([rowId, rawRow]) => {
        if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow))
          return [];
        const row = rawRow as Record<string, unknown>;
        const title = typeof row.title === "string" ? row.title.trim() : "";
        const slugs = Array.isArray(row.slugs)
          ? row.slugs.filter((slug): slug is string => typeof slug === "string")
          : [];
        const films = slugs
          .map((slug) => filmPool.find((film) => film.slug === slug))
          .filter((film): film is FilmItem => Boolean(film));
        if (!title || !films.length) return [];
        const href = typeof row.href === "string" ? row.href : "/films";
        return [
          [
            `featured:${rowId}`,
            <LazySection key={rowId}>
              <FilmSection
                title={title}
                films={films}
                isLoading={false}
                href={href}
              />
            </LazySection>,
          ],
        ];
      }),
    ) as Record<string, React.ReactNode>;
  }, [
    actionFilms,
    animeFilms,
    healingFilms,
    historicalFilms,
    horrorFilms,
    koreanRomanceFilms,
    latestFilms,
    publicConfig?.homeFeaturedRows,
    scifiFilms,
    seriesFilms,
    singleFilms,
    trendingFilms,
    theatricalFilms,
    usUkSeriesFilms,
    vfxFilms,
  ]);

  const hiddenHomeSections = new Set(publicConfig?.homeHiddenSections || []);
  const primarySections: Record<string, React.ReactNode> = {
    top10: (
      <LazySection initiallyVisible>
        <Top10RankedRow films={configuredTop10List} />
      </LazySection>
    ),
    continue: (
      <LazySection initiallyVisible>
        <AuthHistoryCalloutBanner className="mb-8" />
        <ContinueWatchingRow fallbackFilms={homeFeedPool} />
      </LazySection>
    ),
    latest: (
      <LazySection initiallyVisible>
        <div className="hidden md:block">
          <LandscapeSpotlightRow
            title={t("sections.latest", "Phim Mới Cập Nhật")}
            films={latestRowList}
            isLoading={latestLoading}
            href="/films"
            cardLinkMode="detail"
          />
        </div>
        <div className="md:hidden">
          <FilmSection
            title={t("sections.latest", "Phim Mới Cập Nhật")}
            films={latestRowList}
            isLoading={latestLoading}
            href="/films"
          />
        </div>
      </LazySection>
    ),
    wuxia: (
      <LazySection initiallyVisible>
        <FilmSection
          title={t("sections.wuxia", "Cổ Trang Kiếm Hiệp Đặc Sắc")}
          films={wuxiaRowList}
          isLoading={wuxiaLoading}
          href="/genre/co-trang"
        />
      </LazySection>
    ),
    vfx: (
      <LazySection onVisible={() => markSectionLoaded("vfx")}>
        <FilmSection
          title={t("sections.vfx", "Phim Viễn Tưởng")}
          films={vfxRowList}
          isLoading={vfxLoading}
          href="/genre/vien-tuong"
        />
      </LazySection>
    ),
    "usuk-series": (
      <LazySection onVisible={() => markSectionLoaded("usuk-series")}>
        <div className="hidden md:block">
          <HeroShowcaseSection
            title={t("sections.usUkSeries", "Series Âu-Mỹ Đỉnh Cao")}
            films={usUkSeriesRowList}
            isLoading={usUkSeriesLoading}
            href="/search?type=series&country=au-my"
          />
        </div>
        <div className="md:hidden">
          <FilmSection
            title={t("sections.usUkSeries", "Series Âu-Mỹ Đỉnh Cao")}
            films={usUkSeriesRowList}
            isLoading={usUkSeriesLoading}
            href="/search?type=series&country=au-my"
          />
        </div>
      </LazySection>
    ),
    action: (
      <LazySection onVisible={() => markSectionLoaded("action")}>
        <FilmSection
          title={t("sections.action", "Phim Hành Động Kịch Tính")}
          films={actionRowList}
          isLoading={actionLoading}
          href="/genre/hanh-dong"
        />
      </LazySection>
    ),
    "korean-romance": (
      <LazySection onVisible={() => markSectionLoaded("koreanRomance")}>
        <FilmSection
          title={t("sections.koreanRomance", "Phim Tình Cảm Hàn Quốc")}
          films={koreanRomanceRowList}
          isLoading={koreanRomanceLoading}
          href="/films?country=han-quoc&genre=tinh-cam"
        />
      </LazySection>
    ),
    healing: (
      <LazySection onVisible={() => markSectionLoaded("healing")}>
        <FilmSection
          title={t("sections.healing", "Phim Chữa Lành")}
          films={healingRowList}
          isLoading={healingLoading}
          href="/films?genre=tam-ly"
        />
      </LazySection>
    ),
    scifi: (
      <LazySection onVisible={() => markSectionLoaded("scifi")}>
        <div className="hidden md:block">
          <CuratedSpotlightSection
            title={t("sections.scifi", "Tuyệt Tác Khoa Học Viễn Tưởng")}
            films={scifiRowList}
            isLoading={scifiLoading}
            href="/genre/vien-tuong"
          />
        </div>
        <div className="md:hidden">
          <FilmSection
            title={t("sections.scifi", "Tuyệt Tác Khoa Học Viễn Tưởng")}
            films={scifiRowList}
            isLoading={scifiLoading}
            href="/genre/vien-tuong"
          />
        </div>
      </LazySection>
    ),
    horror: (
      <LazySection onVisible={() => markSectionLoaded("horror")}>
        <FilmSection
          title={t("sections.horror", "Phim Kinh Dị")}
          films={horrorRowList}
          isLoading={horrorLoading}
          href="/genre/kinh-di"
        />
      </LazySection>
    ),
    historical: (
      <LazySection onVisible={() => markSectionLoaded("historical")}>
        <div data-mobile-simple-section="historical" className="md:hidden">
          <FilmSection
            title={t("sections.historical", "Phim Cổ Trang")}
            films={historicalRowList}
            isLoading={historicalLoading}
            href="/genre/co-trang"
          />
        </div>
        <div className="hidden md:block">
          <FilmSection
            title={t("sections.historical", "Phim Cổ Trang")}
            films={historicalRowList}
            isLoading={historicalLoading}
            href="/genre/co-trang"
            cardVariant="poster-pill"
          />
        </div>
      </LazySection>
    ),
    theatrical: (
      <LazySection onVisible={() => markSectionLoaded("theatrical")}>
        <FilmSection
          title={t("sections.theatrical", "Phim Chiếu Rạp")}
          films={theatricalRowList}
          isLoading={theatricalLoading}
          href="/films/chieu-rap"
        />
      </LazySection>
    ),
    acclaimed: (
      <LazySection onVisible={() => markSectionLoaded("acclaimed")}>
        <FilmSection
          title={t("sections.acclaimed", "Phim Hay Được Đón Nhận")}
          films={acclaimedRowList}
          isLoading={acclaimedLoading}
          href="/films?sort=view"
        />
      </LazySection>
    ),
    workplace: (
      <LazySection onVisible={() => markSectionLoaded("workplace")}>
        <FilmSection
          title={t("sections.workplace", "Phim Đề Tài Công Sở")}
          films={workplaceRowList}
          isLoading={workplaceLoading}
          href="/films?genre=tinh-cam"
        />
      </LazySection>
    ),
    ...customFeaturedSections,
  };
  const defaultSectionOrder = [
    "top10",
    "continue",
    "latest",
    "wuxia",
    "vfx",
    "usuk-series",
    "action",
    "korean-romance",
    "healing",
    "scifi",
    "horror",
    "historical",
    "theatrical",
    "acclaimed",
    "workplace",
  ];
  const savedSectionOrder = (publicConfig?.homeSectionOrder?.length
    ? publicConfig.homeSectionOrder
    : defaultSectionOrder).filter((sectionId) => sectionId !== "schedule");
  const configuredSectionOrder = [
    ...savedSectionOrder,
    ...defaultSectionOrder.filter(
      (sectionId) => !savedSectionOrder.includes(sectionId),
    ),
  ];
  const primarySectionOrder = [
    ...configuredSectionOrder,
    ...Object.keys(customFeaturedSections).filter(
      (sectionId) => !configuredSectionOrder.includes(sectionId),
    ),
  ];

  return (
    <div className="bg-background min-h-screen text-foreground overflow-hidden pb-12">
      <HomeAnnouncementPopup />
      {/* Hero Banner slider */}
      <HeroBanner
        films={initialHeroFilms}
        initialConfig={publicConfig || initialPublicConfig || undefined}
        randomizeCuratedPool={!publicConfig?.heroMovieSlugs?.length && !initialPublicConfig?.heroMovieSlugs?.length}
      />

      {/* Main Content Area */}
      <div
        data-home-content="true"
        className="w-full pl-4 lg:pl-24 pr-4 md:pr-10 relative pt-6 md:pt-10 z-30"
      >
        {primarySectionOrder
          .filter(
            (sectionId) =>
              !hiddenHomeSections.has(sectionId) && primarySections[sectionId],
          )
          .map((sectionId) => (
            <div key={sectionId}>{primarySections[sectionId]}</div>
          ))}

        {/* ── Progressive Infinite Scroll Sentinel (Triggers background fetch before reaching bottom) ── */}
        <div
          ref={infiniteSentinelRef}
          className="h-2 w-full pointer-events-none"
          aria-hidden="true"
        />

        <div className="space-y-2">
          {/* ── 10 Progressively Loaded Sections as User Scrolls ── */}
          <LazySection onVisible={() => markSectionLoaded("nextWatch")}>
            <FilmSection
              title={t("sections.nextWatch", "Gợi Ý Phim Tiếp Theo")}
              films={nextWatchRowList}
              isLoading={nextWatchLoading}
              href="/country/au-my"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("series")}>
            <FilmSection
              title={t("sections.series", "Phim Bộ Đặc Sắc")}
              films={seriesRowList}
              isLoading={seriesLoading}
              href="/films/series"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("anime")}>
            <FilmSection
              title={t("sections.anime", "Thế Giới Anime & Hoạt Hình")}
              films={animeRowList}
              isLoading={animeLoading}
              href="/films/anime"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("adventure")}>
            <FilmSection
              title={t("sections.adventure", "Phim Phiêu Lưu & Khám Phá")}
              films={adventureRowList}
              isLoading={adventureLoading}
              href="/genre/phieu-luu"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("single")}>
            <FilmSection
              title={t("sections.single", "Phim Lẻ Tuyển Chọn")}
              films={singleRowList}
              isLoading={singleLoading}
              href="/films/single"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("drama")}>
            <FilmSection
              title={t("sections.drama", "Phim Tâm Lý & Xã Hội")}
              films={dramaRowList}
              isLoading={dramaLoading}
              href="/genre/chinh-kich"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("disaster")}>
            <FilmSection
              title={t("sections.disaster", "Phim Thảm Họa & Sinh Tồn")}
              films={disasterRowList}
              isLoading={disasterLoading}
              href="/genre/kinh-di"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("war")}>
            <FilmSection
              title={t("sections.war", "Phim Chiến Tranh & Lịch Sử")}
              films={warRowList}
              isLoading={warLoading}
              href="/genre/chien-tranh"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("comedy")}>
            <FilmSection
              title={t("sections.comedy", "Phim Hài Hước & Gia Đình")}
              films={comedyRowList}
              isLoading={comedyLoading}
              href="/genre/hai-huoc"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("romance")}>
            <FilmSection
              title={t("sections.romance", "Phim Lãng Mạn & Tình Cảm")}
              films={romanceRowList}
              isLoading={romanceLoading}
              href="/genre/tinh-cam"
            />
          </LazySection>

          <LazySection onVisible={() => markSectionLoaded("weekly")}>
            <div data-mobile-simple-section="weekly" className="md:hidden">
              <FilmSection
                title="Phim Bộ & Phim Lẻ Tuần Này"
                films={weeklyMobileRowList}
                isLoading={seriesLoading || singleLoading}
                href="/films"
              />
            </div>
            <div className="hidden md:block">
              <WeeklyCuratedShowcase
                seriesFilms={seriesRowList}
                singleFilms={singleRowList}
                isLoading={seriesLoading || singleLoading}
              />
            </div>
          </LazySection>
        </div>
      </div>
    </div>
  );
}
