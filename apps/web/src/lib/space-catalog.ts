// Catalog dữ liệu phim Khoa Học Vũ Trụ & Star Wars chuẩn hóa cho FlexPhim
import type { UniverseFilmItem, UniverseSpotlightItem } from "./universe-catalog";

export const SPACE_SPOTLIGHTS: UniverseSpotlightItem[] = [
  {
    id: "star-wars-dai-chien-ngan-ha",
    slug: "the-mandalorian-phan-3",
    name: "Khoa Học Vũ Trụ: Đại Chiến Các Vì Sao",
    origin_name: "Star Wars: Galactic Cosmos",
    year: 2024,
    quality: "4K UHD",
    lang: "Vietsub + Thuyết Minh",
    rating: 9.3,
    spotlightBadge: "🪐 BOM TẤN KHOA HỌC VŨ TRỤ ĐỈNH CAO",
    subtitle: "Đại Chiến Không Gian • Thần Lực Ánh Sáng & Bóng Tối Trỗi Dậy",
    genres: ["Khoa Học Vũ Trụ", "Star Wars", "Thiên Hà Không Gian", "Phiêu Lưu Viễn Tưởng"],
    content: "Một thiên hà xa xôi chìm trong cuộc đại chiến sinh tử giữa các hạm đội khu trục hạm đế chế và liên minh nổi dậy. Khám phá vũ trụ bao la với những hành tinh kỳ vĩ, công nghệ siêu không gian tối tân và triết lý Thần Lực huyền thoại.",
    heroBackdrop: "/Folder-Background/starwar/starwars-hub-vader-full.webp",
    titleLogo: "/Folder-Background/starwar/star-wars-logo.svg",
    trailer_url: "https://www.youtube.com/watch?v=aOC8E8R_N5c",
    subFranchise: "star-wars",
    objectPosition: "object-[center_25%]",
  },
  {
    id: "the-mandalorian-grogu-spotlight",
    slug: "the-mandalorian-phan-3",
    name: "The Mandalorian & Grogu",
    origin_name: "The Mandalorian (Season 3)",
    year: 2023,
    quality: "4K UHD",
    lang: "Vietsub + Thuyết Minh",
    rating: 8.8,
    spotlightBadge: "🛡️ THỢ SĂN TIỀN THƯỞNG VÙNG NGOẠI TÀN DƯ",
    subtitle: "Din Djarin & Grogu • Hành Trình Tái Thiết Hành Tinh Mandalore",
    genres: ["Vũ Trụ Star Wars", "Hành Động", "Khoa Học Viễn Tưởng", "Phiêu Lưu"],
    content: "Thợ săn tiền thưởng Din Djarin tái ngộ cậu bé Grogu, dấn thân vào không gian vũ trụ hỗn loạn để chuộc lại lỗi lầm và khôi phục niềm vinh quang của chủng tộc chiến binh Mandalorian.",
    heroBackdrop: "/Folder-Background/starwar/dDo5cg.webp",
    titleLogo: "/Folder-Background/starwar/star-wars-logo.svg",
    trailer_url: "https://www.youtube.com/watch?v=Znsa4Deavgg",
    subFranchise: "star-wars",
    objectPosition: "object-[center_28%]",
  },
  {
    id: "darth-vader-empire-spotlight",
    slug: "star-wars-de-che-phan-cong",
    name: "Star Wars: Thần Lực Bóng Tối",
    origin_name: "Star Wars: The Empire Strikes Back",
    year: 1980,
    quality: "4K Remastered",
    lang: "Vietsub + Thuyết Minh",
    rating: 9.4,
    spotlightBadge: "⚡ CHÚA TỂ SITH HUYỀN THOẠI DARTH VADER",
    subtitle: "Hạm Đội Khu Trục Sao • Đế Chế Thống Trị Ngân Hà",
    genres: ["Huyền Thoại Vũ Trụ", "Đại Chiến Không Gian", "Khoa Học Viễn Tưởng"],
    content: "Darth Vader chỉ huy hạm đội Imperial Star Destroyer truy đuổi quân nổi dậy qua vành đai tiểu hành tinh nghẹt thở, mở ra một trong những khúc tráng ca vũ trụ vĩ đại nhất lịch sử điện ảnh.",
    heroBackdrop: "/Folder-Background/starwar/starwars-hub-vader-full.webp",
    titleLogo: "/Folder-Background/starwar/star-wars-logo.svg",
    trailer_url: "https://www.youtube.com/watch?v=JNwNXF9Y6kY",
    subFranchise: "star-wars",
    objectPosition: "object-[center_25%]",
  },
];

export const SPACE_SUB_FRANCHISES = [
  { id: "all", label: "Tất Cả Không Gian" },
  { id: "star-wars", label: "Vũ Trụ Star Wars" },
  { id: "movies", label: "Phim Điện Ảnh Vũ Trụ" },
  { id: "series", label: "Series Truyền Hình Không Gian" },
];

export const SPACE_UNIVERSE_FILMS: UniverseFilmItem[] = [
  {
    "_id": "4b31cbd7ab8fbbd7f8a510d3bda60c66",
    "name": "The Mandalorian (Phần 3)",
    "origin_name": "The Mandalorian (Season 3)",
    "slug": "the-mandalorian-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20240307-1/210786c53bf1a3c291068a57d5164bb2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240307-1/ded698b60a6ec5d38d145c3ccc7d4c45.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "f042fe2d8c2e42a80c9cb8ffc652d914",
    "name": "The Mandalorian (Phần 2)",
    "origin_name": "The Mandalorian (Season 2)",
    "slug": "the-mandalorian-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20240307-1/9d989f962b422590850378dd715f10c6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240307-1/31c029879a8b1385d30c5c6d917f6528.jpg",
    "year": 2020,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "dd17ee9e2355df4f69fd072a5bd3334d",
    "name": "Star Wars: Mandalorian và Grogu",
    "origin_name": "The Mandalorian and Grogu",
    "slug": "star-wars-mandalorian-va-grogu",
    "poster_url": "https://phimimg.com/upload/vod/20260625-1/e43e9e9207618823fa3ca762e8fc274e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260625-1/eae0e72afab9c7228da9b12df8859b53.jpg",
    "year": 2026,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "a26398dca6f47b49876cbaffbc9954f9",
    "name": "Nữ Hiệp Sĩ Ahsoka",
    "origin_name": "Ahsoka",
    "slug": "nu-hiep-si-ahsoka",
    "poster_url": "https://phimimg.com/upload/vod/20231001-1/8dbe42b787e7adba6b2d2252b80c8486.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231001-1/b35a956c7fe58813a934dd7d66db694a.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "5a6f34e3880e181e080f6a962ca828c1",
    "name": "Chiến Tranh Giữa Các Vì Sao: Andor (Phần 1)",
    "origin_name": "Star Wars: Andor (Season 1)",
    "slug": "chien-tranh-giua-cac-vi-sao-andor-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20250427-1/72bf6e55e300542efc321c9db89be843.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250427-1/4811105a3be7c9ae854b39f9417a41a9.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (12/12)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "fe0437935a8eb2c42ac327ae401d8482",
    "name": "Chiến Tranh Giữa Các Vì Sao: Andor (Phần 2)",
    "origin_name": "Star Wars: Andor (Season 2)",
    "slug": "chien-tranh-giua-cac-vi-sao-andor-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20250427-1/7acf0b50e6f9372e12ab6fc335cbd4af.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250427-1/52ddf64f9ab170c18b832b4b1114fa3d.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (12/12)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "430c6d15a514356985370639219d6814",
    "name": "Star Wars: Skeleton Crew",
    "origin_name": "Star Wars: Skeleton Crew",
    "slug": "star-wars-skeleton-crew",
    "poster_url": "https://phimimg.com/upload/vod/20241207-1/1bc417fb545a16bc47525f5f809da9fe.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241207-1/0a7c3574fa51676a3db0ae3449d6b31f.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "756b7e381866fa63122100dd87543d6c",
    "name": "Star Wars: Biệt Đội Nhân Bản Đặc Biệt (Phần 3)",
    "origin_name": "Star Wars: The Bad Batch (Season 3)",
    "slug": "star-wars-biet-doi-nhan-ban-dac-biet-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20240229-1/2efdf24d403fbcc67b2806f9d92e9aed.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240229-1/11258f68ef2a6e98625b12e76200f2ec.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (15/15)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      }
    ],
    "country": [
      {
        "name": "Âu M���",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "95e62984b87e90645a5cf77037395959",
    "name": "Star Wars: Đế Chế Phản Công",
    "origin_name": "Star Wars: The Empire Strikes Back",
    "slug": "star-wars-de-che-phan-cong",
    "poster_url": "https://phimimg.com/upload/vod/20231113-1/7ac877cd1cd02592290a1feedd71c151.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231113-1/37d0b77ca1565e7b4a121a5ee7ec1387.jpg",
    "year": 1980,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "0172d289da48c48de8c5ebf3de9f7ee1",
    "name": "Star Wars: Sự Trở Lại Của Jedi",
    "origin_name": "Return of the Jedi",
    "slug": "star-wars-su-tro-lai-cua-jedi",
    "poster_url": "https://phimimg.com/upload/vod/20231025-1/444991a0b956562b8c15cf69ce26fdf5.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231025-1/4782833ccb89daf83fc3a634a955b40a.jpg",
    "year": 1983,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "596dedf4498e258e4bdc9fd70df9a859",
    "name": "Star Wars:  Phần 1 - Hiểm Họa Bóng Ma",
    "origin_name": "Star Wars: Episode I - The Phantom Menace",
    "slug": "star-wars-phan-1-hiem-hoa-bong-ma",
    "poster_url": "https://phimimg.com/upload/vod/20231015-1/f5892a22c96a8e04935ffc87abafa851.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231015-1/5e24f275c25d77c25e27dc2de618c54f.jpg",
    "year": 1999,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "1cd73be1e256a7405516501e94e892ac",
    "name": "Star Wars: Thần Lực Thức Tỉnh",
    "origin_name": "Star Wars: The Force Awakens",
    "slug": "star-wars-than-luc-thuc-tinh",
    "poster_url": "https://phimimg.com/upload/vod/20231103-1/a217bc2da6ad14ea9d5c69e333715c5d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231103-1/18bf75195abc0e7e1e2135cb89707241.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "e21e4e58ad9ab56e8a4634046da90113",
    "name": "Star Wars: Skywalker Trỗi Dậy",
    "origin_name": "Star Wars: The Rise of Skywalker",
    "slug": "star-wars-skywalker-troi-day",
    "poster_url": "https://phimimg.com/upload/vod/20231018-1/d962be812b5cf55e3466bcdbbaa70c81.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231018-1/779f3b098ced2d05b48f4fc3c4293937.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "e6cbc650cd5798a05dfd0f51d14cde5c",
    "name": "Rogue One: Star Wars Ngoại Truyện",
    "origin_name": "Rogue One: A Star Wars Story",
    "slug": "rogue-one-star-wars-ngoai-truyen",
    "poster_url": "https://phimimg.com/upload/vod/20231026-1/1d72c61bd4338562a3cd7cbefb195a00.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231026-1/41ccac3a4082ac4472fb39c6a3436899.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "4e0223a87610176ef0d24ef6d2dcde3a",
    "name": "Solo: Star Wars Ngoại Truyện",
    "origin_name": "Solo: A Star Wars Story",
    "slug": "solo-star-wars-ngoai-truyen",
    "poster_url": "https://phimimg.com/upload/vod/20231022-1/be33399131271a5c1619ca368ae6dc71.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231022-1/176004d60b26e3798a384b4cba4e4017.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "star-wars",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "ac1ad983e08ad3304a97e147f522747e",
    "name": "Hố Đen Tử Thần",
    "origin_name": "Interstellar",
    "slug": "ho-den-tu-than",
    "poster_url": "https://phimimg.com/upload/vod/20250302-1/4cee31c3afd0fbfd11ed4f14b1bfd816.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250302-1/6012710a981edf1b6209bdb7fa82d1a6.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "1c9ac0159c94d8d0cbedc973445af2da",
    "name": "Người Về Từ Sao Hỏa",
    "origin_name": "The Martian",
    "slug": "nguoi-ve-tu-sao-hoa",
    "poster_url": "https://phimimg.com/upload/vod/20230915-1/3f0fe46d353ab38cac33709dc6a9ede4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230915-1/e1f374e896a08ca9ef0a41637f7a7573.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ]
  },
  {
    "_id": "9d42d7587d22e1d36d009e89d4a2de98",
    "name": "Avatar: Dòng Chảy Của Nước",
    "origin_name": "Avatar: The Way Of Water",
    "slug": "avatar-dong-chay-cua-nuoc",
    "poster_url": "https://phimimg.com/upload/vod/20250513-1/59fc5ffe0025ca40c99d48b070b59320.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250513-1/7b4e51db1a258ef9602558352066bfec.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Vi���n Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "b2ab001909a8a6f04b51920306046ce5",
    "name": "Avatar",
    "origin_name": "Avatar",
    "slug": "avatar",
    "poster_url": "https://phimimg.com/upload/vod/20251224-1/a14e53706b8086d753874f16c0d232d3.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20251224-1/5ea13f0250ec1b118783644f6e78b242.jpg",
    "year": 2009,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      },
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ]
  },
  {
    "_id": "19df34e5a4cbdb9c7a41acd3fbd71222",
    "name": "Bước Chân Đầu Tiên",
    "origin_name": "First Man",
    "slug": "buoc-chan-dau-tien",
    "poster_url": "https://phimimg.com/upload/vod/20240123-1/1219c4bfbb9cf8d8c5ccaebfd32e64cd.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240123-1/1c9d420bc02cf1986e4ae42bd782c873.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "76aee0a3b1e75275219a7b41ffdb904d",
    "name": "Ad Astra: Giải Mã Bí Ẩn Ngân Hà",
    "origin_name": "Ad Astra",
    "slug": "ad-astra-giai-ma-bi-an-ngan-ha",
    "poster_url": "https://phimimg.com/upload/vod/20231230-1/184e51b7b32318eb4a58ea613fc7b6bf.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231230-1/184e51b7b32318eb4a58ea613fc7b6bf.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "39461a19e9eddfb385ea76b26521ea48",
    "name": "Vệ Binh Dải Ngân Hà 3",
    "origin_name": "Guardians Of The Galaxy Vol. 3",
    "slug": "ve-binh-dai-ngan-ha-3",
    "poster_url": "https://phimimg.com/upload/vod/20250917-1/0c9f28d1d5bd304490cf70a0602cbd1d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250917-1/cff02f62cd958f065ebf5772a95b2b81.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "c902b497eb972281fb5b4e206db38ee6",
    "name": "Vệ Binh Dải Ngân Hà 2",
    "origin_name": "Guardians Of The Galaxy Vol. 2",
    "slug": "ve-binh-dai-ngan-ha-2",
    "poster_url": "https://phimimg.com/upload/vod/20250917-1/bbbd7aa76bec62c78bf8986cb4b301cb.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250917-1/487db4a6e8006f4c83a36f37c3601240.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "8420d359404024567b5aefda1231af24",
    "name": "Vệ Binh Dải Ngân Hà",
    "origin_name": "Guardians Of The Galaxy",
    "slug": "ve-binh-dai-ngan-ha",
    "poster_url": "https://phimimg.com/upload/vod/20250917-1/4725f099f5f9befff465063c1752a2bc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250917-1/8de87cccdf95840172aef9aedf2feee2.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "81c2f886f91e18fe16d6f4e865877cb6",
    "name": "Xứ Cát",
    "origin_name": "Dune",
    "slug": "xu-cat",
    "poster_url": "https://phimimg.com/upload/vod/20231023-1/de16af144d9debce3a331f1412e214d5.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231023-1/8fd89e01eeee6811fdcdb2ef4007b613.jpg",
    "year": 1984,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "movies",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "789bbd3eb51e7315cf9995306bb399f5",
    "name": "Tam Thể",
    "origin_name": "Three Body",
    "slug": "tam-the",
    "poster_url": "https://phimimg.com/upload/vod/20240304-1/a884dbd9df537e5ada2937cac3feed10.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240304-1/7f03dff2e4dcef5a0264d8d816b1b941.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (30/30)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ]
  },
  {
    "_id": "dcb5060fba0123ff56d253331f28db6a",
    "name": "Lực Lượng Nền Móng (Phần 1)",
    "origin_name": "Foundation (Season 1)",
    "slug": "luc-luong-nen-mong-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20250712-1/bc55d51aa02702494f6cdbee6985fa33.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250712-1/503499c3772f778bece38a78b7d1a44b.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "631fe0c7519b232b0a0f6b965af015a9",
    "name": "Lực Lượng Nền Móng (Phần 2)",
    "origin_name": "Foundation (Season 2)",
    "slug": "luc-luong-nen-mong-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20250712-1/ad1e12f706674343074296f695785dba.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250712-1/197b9371a7641f542ea3b147475ece77.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "8803f7fa56465a59d0c1a12ec666f533",
    "name": "Lực Lượng Nền Móng (Phần 3)",
    "origin_name": "Foundation (Season 3)",
    "slug": "luc-luong-nen-mong-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20250712-1/c6e451de30c036c5dcfb22cc37301981.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250712-1/e812e14330cef32907a26b8ed6d07ff0.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "6460cc8da8c4b9e54b1ea75c275c3f35",
    "name": "Cuộc Mở Rộng (Phần 6)",
    "origin_name": "The Expanse (Season 6)",
    "slug": "cuoc-mo-rong-phan-6",
    "poster_url": "https://phimimg.com/upload/vod/20250319-1/3e81ab38b4b39b857e274e12b4cf1fcf.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250319-1/3e2477f2272e6f49e9252e41cda0f45f.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (6/6)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Canada",
        "slug": "canada",
        "id": "445d337b5cd5de476f99333df6b0c2a7"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "c32ad30e23618c4355f0e46477e395c6",
    "name": "Cuộc Mở Rộng (Phần 5)",
    "origin_name": "The Expanse (Season 5)",
    "slug": "cuoc-mo-rong-phan-5",
    "poster_url": "https://phimimg.com/upload/vod/20250319-1/e55352501db3ddc6f57513162a364638.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250319-1/8f8bf6482c74077a780c4070bf583d68.jpg",
    "year": 2020,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Canada",
        "slug": "canada",
        "id": "445d337b5cd5de476f99333df6b0c2a7"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "d6af16ec4676bf0cea0910f681883abd",
    "name": "Cuộc Mở Rộng (Phần 4)",
    "origin_name": "The Expanse (Season 4)",
    "slug": "cuoc-mo-rong-phan-4",
    "poster_url": "https://phimimg.com/upload/vod/20250319-1/93f027fb796b71cd71acd2946c7d4c3c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250319-1/69882029439a991103ab4d43f7f33b03.jpg",
    "year": 2019,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Canada",
        "slug": "canada",
        "id": "445d337b5cd5de476f99333df6b0c2a7"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "ea40a57310aa704ffa9e45bfb38d913e",
    "name": "Star Trek: Những Miền Đất Mới (Phần 1)",
    "origin_name": "Star Trek: Strange New Worlds (Season 1)",
    "slug": "star-trek-nhung-mien-dat-moi-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/6d0778673152cc1dbef16c98ace60cae.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/5f782e4036f23f6c71e90d3ab40511ee.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "id": "0bcf4077916678de9b48c89221fcf8ae",
        "name": "Khoa Học",
        "slug": "khoa-hoc"
      },
      {
        "id": "68564911f00849030f9c9c144ea1b931",
        "name": "Viễn Tưởng",
        "slug": "vien-tuong"
      },
      {
        "id": "a7b065b92ad356387ef2e075dee66529",
        "name": "Tâm Lý",
        "slug": "tam-ly"
      }
    ],
    "country": [
      {
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a",
        "name": "Âu Mỹ",
        "slug": "au-my"
      }
    ]
  },
  {
    "_id": "3ef4bf74a70bcd489c8c84a62fa61bb9",
    "name": "Star Trek: Những Miền Đất Mới (Phần 2)",
    "origin_name": "Star Trek: Strange New Worlds (Season 2)",
    "slug": "star-trek-nhung-mien-dat-moi-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/c990ce5eb5133e3fc28e089a721c9e09.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/51c6cddef7e06cea118093e0b06f0a86.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "id": "0bcf4077916678de9b48c89221fcf8ae",
        "name": "Khoa Học",
        "slug": "khoa-hoc"
      },
      {
        "id": "68564911f00849030f9c9c144ea1b931",
        "name": "Viễn Tưởng",
        "slug": "vien-tuong"
      },
      {
        "id": "a7b065b92ad356387ef2e075dee66529",
        "name": "Tâm Lý",
        "slug": "tam-ly"
      }
    ],
    "country": [
      {
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a",
        "name": "Âu Mỹ",
        "slug": "au-my"
      }
    ]
  },
  {
    "_id": "1908ffe453edcfd095aa76d8fd46e80f",
    "name": "Hào Quang (Phần 1)",
    "origin_name": "Halo (Season 1)",
    "slug": "hao-quang-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20240301-1/981bbd71362d2c1ad1a8f64d69cad7bc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240301-1/016c91f915d739f4199275400bf3a456.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (9/9)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "1c00efe49a21ecbce0768a32f42854d3",
    "name": "Hào Quang (Phần 2)",
    "origin_name": "Halo (Season 2)",
    "slug": "hao-quang-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20240301-1/bb1628a070610262b266c5a24fba840d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240301-1/f8022367e705d2654ff7fb3af80bd180.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  },
  {
    "_id": "6830bfbdb545d5f230744b3cce1f44c6",
    "name": "Hành Tinh Cát: Lời Tiên Tri",
    "origin_name": "Dune: Prophecy",
    "slug": "hanh-tinh-cat-loi-tien-tri",
    "poster_url": "https://phimimg.com/upload/vod/20241118-1/f490c695998243e5586896a50a7b19ab.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241118-1/58ed7c8aadd9c6ee185b7875ce499a6b.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (6/6)",
    "quality": "FHD",
    "lang": "Vietsub",
    "vote_average": 8.5,
    "subFranchise": "series",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ]
  }
];
