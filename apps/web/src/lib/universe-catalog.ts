// Catalog dữ liệu phim Marvel Cinematic Universe và DC Universe chuẩn hóa cho NetPhim
import { FilmItem } from "@/components/film/FilmCard";

export interface UniverseFilmItem extends Omit<FilmItem, "category" | "country"> {
  subFranchise: string;
  category?: Array<{ name?: string; slug?: string; id?: string }>;
  country?: Array<{ name?: string; slug?: string; id?: string }>;
}

export interface UniverseSpotlightItem {
  id: string;
  slug: string;
  name: string;
  origin_name: string;
  year: number;
  quality: string;
  lang: string;
  rating: number;
  spotlightBadge: string;
  content: string;
  heroBackdrop: string;
  titleLogo: string;
  trailer_url?: string;
  subFranchise: string;
}

export const MARVEL_SPOTLIGHTS: UniverseSpotlightItem[] = [
  {
    id: "deadpool-va-wolverine",
    slug: "deadpool-va-wolverine",
    name: "Deadpool Và Wolverine",
    origin_name: "Deadpool & Wolverine",
    year: 2024,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 7.8,
    spotlightBadge: "🔥 BOM TẤN ĐA VŨ TRỤ MARVEL",
    content: "Wade Wilson tái hợp cùng Wolverine trong một hành trình cứu rỗi dòng thời gian đầy hài hước, bùng nổ và những pha hành động mãn nhãn.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/2o48U3kMXGIqRAkKZQ3n5OTWSBy.png",
    trailer_url: "https://www.youtube.com/watch?v=73_1biulkYk",
    subFranchise: "xmen",
  },
  {
    id: "biet-doi-sieu-anh-hung-4-hoi-ket",
    slug: "biet-doi-sieu-anh-hung-4-hoi-ket",
    name: "Biệt Đội Siêu Anh Hùng 4: Hồi Kết",
    origin_name: "Avengers: Endgame",
    year: 2019,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 8.4,
    spotlightBadge: "🏆 HUYỀN THOẠI AVENGERS SAGA",
    content: "Các siêu anh hùng Avengers tập hợp cho một trận chiến vượt thời gian cuối cùng để đảo ngược hành động hủy diệt của Thanos.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/oYx8PrqrXipAb0cDY9Q7OijttfP.png",
    trailer_url: "https://www.youtube.com/watch?v=TcMBFSGVi1c",
    subFranchise: "avengers",
  },
  {
    id: "biet-doi-sieu-anh-hung-3-cuoc-chien-vo-cuc",
    slug: "biet-doi-sieu-anh-hung-3-cuoc-chien-vo-cuc",
    name: "Biệt Đội Siêu Anh Hùng 3: Cuộc Chiến Vô Cực",
    origin_name: "Avengers: Infinity War",
    year: 2018,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 8.3,
    spotlightBadge: "💎 SIÊU PHẨM CHIẾU RẠP KỶ LỤC",
    content: "Trận chiến quy tụ toàn bộ vũ trụ điện ảnh Marvel ngăn chặn Thanos thu thập 6 Viên Đá Vô Cực để xóa sổ một nửa sự sống.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/mDfJG3LC3Dqb67AZ52x3Z0jU0uB.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/iiFFPJduveJnb6D2TYKL4AFJIFn.png",
    trailer_url: "https://www.youtube.com/watch?v=6ZfuNTqbHE8",
    subFranchise: "avengers",
  },
  {
    id: "nguoi-nhen-khong-con-nha",
    slug: "nguoi-nhen-khong-con-nha",
    name: "Người Nhện: Không Còn Nhà",
    origin_name: "Spider-Man: No Way Home",
    year: 2021,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 8.1,
    spotlightBadge: "🕷️ KỶ LỤC DOANH THU MULTIVERSE",
    content: "Danh tính bị lộ, Peter Parker cầu viện Doctor Strange mở ra cánh cổng đa vũ trụ, đối mặt với các phản diện từ quá khứ.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/uyrOU4BDm2kbVxFsMiDFIHDhc4d.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/tAKAjcy83LOBdhhqSwHDkT0cXOe.png",
    trailer_url: "https://www.youtube.com/watch?v=JfVOs4VSpmA",
    subFranchise: "spiderman",
  },
  {
    id: "ve-binh-dai-ngan-ha-3",
    slug: "ve-binh-dai-ngan-ha-3",
    name: "Vệ Binh Dải Ngân Hà 3",
    origin_name: "Guardians of the Galaxy Vol. 3",
    year: 2023,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 8.0,
    spotlightBadge: "🚀 PHIÊU LƯU VŨ TRỤ CẢM XÚC",
    content: "Peter Quill dẫn dắt nhóm Vệ Binh bảo vệ Rocket Raccoon khỏi kẻ thù nguy hiểm trong một nhiệm vụ có thể là hồi kết của cả đội.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/yrZkQffWfFG16U9XnpcpQQLJvE2.png",
    trailer_url: "https://www.youtube.com/watch?v=u3V5KDHRQvk",
    subFranchise: "standalone",
  },
  {
    id: "phu-thuy-toi-thuong-trong-da-vu-tru-hon-loan",
    slug: "phu-thuy-toi-thuong-trong-da-vu-tru-hon-loan",
    name: "Phù Thủy Tối Thượng Trong Đa Vũ Trụ Hỗn Loạn",
    origin_name: "Doctor Strange in the Multiverse of Madness",
    year: 2022,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 7.4,
    spotlightBadge: "✨ HUYỀN THUẬT ĐA VŨ TRỤ",
    content: "Doctor Strange cùng America Chavez du hành qua các chiều không gian song song kỳ ảo để trốn chạy Wanda Maximoff.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/lv3TXqhpaIxkclIHbhN2MRMOemQ.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/bbbQnfSEFN3amYn2pVCKUiKGL2G.png",
    trailer_url: "https://www.youtube.com/watch?v=aWzlQ2N6qqg",
    subFranchise: "standalone",
  },
];

export const DC_SPOTLIGHTS: UniverseSpotlightItem[] = [
  {
    id: "ky-si-bong-dem",
    slug: "ky-si-bong-dem",
    name: "Kỵ Sĩ Bóng Đêm",
    origin_name: "The Dark Knight",
    year: 2008,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 9.0,
    spotlightBadge: "🦇 #1 KIỆT TÁC ĐIỆN ẢNH DC",
    content: "Batman đối đầu với Joker - tên tội phạm hỗn loạn muốn hủy hoại trật tự đạo đức của thành phố Gotham và biến Người Dơi thành kẻ thù.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/9FE5eD92WfVCiivM9Pq9GVSrlWk.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/nO5Uix3Qr4WjOyU1BMPv0okyNWm.png",
    trailer_url: "https://www.youtube.com/watch?v=EXeTwQWrcwY",
    subFranchise: "batman",
  },
  {
    id: "nguoi-doi-2022",
    slug: "nguoi-doi-2022",
    name: "Người Dơi",
    origin_name: "The Batman",
    year: 2022,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 7.8,
    spotlightBadge: "🌑 THÁM TỬ BÓNG ĐÊM GOTHAM",
    content: "Trong năm thứ hai chống tội phạm, Batman lần theo dấu vết của Riddler - kẻ giết người hàng loạt nhắm vào giới tinh hoa Gotham.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/IYUD7rAIXzBM91TT3Z5fILUS7n.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/feJw5OvuutgHt4G9jZQibO8j4Gu.png",
    trailer_url: "https://www.youtube.com/watch?v=mqqft2x_Aa4",
    subFranchise: "batman",
  },
  {
    id: "nguoi-dan-ong-thep",
    slug: "nguoi-dan-ong-thep",
    name: "Người Đàn Ông Thép",
    origin_name: "Man of Steel",
    year: 2013,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 7.5,
    spotlightBadge: "⚡ KHỞI ĐẦU SIÊU NHÂN DC",
    content: "Clark Kent khám phá nguồn gốc ngoài hành tinh của mình và chấp nhận số phận trở thành người hùng bảo vệ Trái Đất trước Tướng Zod.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/j2MlEEpA3wgwQiJB6p1UHC50oiw.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/qBtAryVKg11iEOmxeb31fxIHuvN.png",
    trailer_url: "https://www.youtube.com/watch?v=T6DJcgm3wNY",
    subFranchise: "justice-league",
  },
  {
    id: "joker",
    slug: "joker",
    name: "Joker",
    origin_name: "Joker",
    year: 2019,
    quality: "4K Ultra HD",
    lang: "Vietsub + Thuyết Minh",
    rating: 8.4,
    spotlightBadge: "🃏 ĐẠT 2 GIẢI OSCAR DANH GIÁ",
    content: "Arthur Fleck - một nghệ sĩ hài thất bại bị xã hội cô lập dần trượt sâu vào sự điên loạn và trở thành biểu tượng hỗn loạn Joker.",
    heroBackdrop: "https://image.tmdb.org/t/p/w1280/rlay2M5QYvi6igbGcFjq8jxeusY.jpg",
    titleLogo: "https://image.tmdb.org/t/p/w500/uACD19MjHdpLBlzmFSztlwsW5Q6.png",
    trailer_url: "https://www.youtube.com/watch?v=zAGVQLHvwOY",
    subFranchise: "villains",
  },
];

export const MARVEL_UNIVERSE_FILMS: UniverseFilmItem[] = [
  {
    "_id": "6a6b45f784ee38bbf40a24b4",
    "name": "Marvel's Luke Cage (Phần 1)",
    "origin_name": "Marvel's Luke Cage (Season 1)",
    "slug": "marvels-luke-cage-phan-1",
    "poster_url": "https://phimimg.com/uploads/movies/20260730/marvels-luke-cage-phan-1-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260730/marvels-luke-cage-phan-1-thumb.webp",
    "year": 2016,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "6a6b4628159fd4cdae083272",
    "name": "Marvel's Luke Cage (Phần 2)",
    "origin_name": "Marvel's Luke Cage (Season 2)",
    "slug": "marvels-luke-cage-phan-2",
    "poster_url": "https://phimimg.com/uploads/movies/20260730/marvels-luke-cage-phan-2-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260730/marvels-luke-cage-phan-2-thumb.webp",
    "year": 2018,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "f732049757d722d433d4033f05714c1d",
    "name": "Một Chương Trình Đặc Biệt từ Marvel Television - The Punisher: Phát Súng Cuối Cùng",
    "origin_name": "A Marvel Television Special Presentation - The Punisher: One Last Kill",
    "slug": "mot-chuong-trinh-dac-biet-tu-marvel-television-the-punisher-phat-sung-cuoi-cung",
    "poster_url": "https://phimimg.com/upload/vod/20260514-1/2d1ca8fa5d2092c97de311d69535f2f6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260514-1/debb82c04512f0e091d65d213dd2747c.jpg",
    "year": 2026,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "bae4f11996f82f08ae1800943df99925",
    "name": "Marvel Zombies",
    "origin_name": "Marvel Zombies",
    "slug": "marvel-zombies",
    "poster_url": "https://phimimg.com/upload/vod/20250924-1/df6f49387bd279265fc99385dc2747aa.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250924-1/33922de46ec1e71e59c705ec316589e6.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (4/4)",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "e069ea4c9c233d36ff9c7f329bc08ff1",
    "name": "Đại Úy Marvel",
    "origin_name": "Captain Marvel",
    "slug": "dai-uy-marvel",
    "poster_url": "https://phimimg.com/upload/vod/20250921-1/fade94fa0cacab50a76740e1dbf1c18f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250921-1/68ec76eabfab720f03ac7c6e59c81c56.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "54ff9e9e3a2ec0300d4ce11261f5169f",
    "name": "Biệt Đội Marvel",
    "origin_name": "The Marvels",
    "slug": "biet-doi-marvel",
    "poster_url": "https://phimimg.com/upload/vod/20250921-1/9fbaf2be93c21c594912344105f0c73f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250921-1/86c9aacc40e9fce15886e03ed838f2da.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "d2817e5b9188a8fac590cb6c263f2222",
    "name": "Marvel's Ironheart",
    "origin_name": "Ironheart",
    "slug": "marvels-ironheart",
    "poster_url": "https://phimimg.com/upload/vod/20250625-1/affb242195ba90a9d8b976b7d61e2d0b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250625-1/ce0e1cbcc54be7bcf67a9eb0dfa9c708.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (6/6)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "92e2febe8d6183b8026d49448c382d0e",
    "name": "Marvel's Hit-Monkey (Phần 2)",
    "origin_name": "Marvel's Hit-Monkey (Season 2)",
    "slug": "marvels-hitmonkey-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20250603-1/fbd46350800ebe715f2ee5dac2250cde.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250603-1/bfcd83d53c60de5da82046520b704ff5.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "4b0634bf8e6c9d0289c1102ced741317",
    "name": "Marvel's Hit-Monkey (Phần 1)",
    "origin_name": "Marvel's Hit-Monkey (Season 1)",
    "slug": "marvels-hitmonkey-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20250603-1/9ed1b772ee4435056b86d4fd3f2cafe7.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250603-1/452869f39cd1cb7839542755a262a7d3.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "339e1f3c4cfdd33fa17637c74bf5df09",
    "name": "Marvel's Jessica Jones (Phần 3)",
    "origin_name": "Marvel's Jessica Jones (Season 3)",
    "slug": "marvels-jessica-jones-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20241231-1/d3d1e8f19288ff880c30bf6789163d88.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241231-1/d65c81a109b5cd40a8021484237a6ecf.jpg",
    "year": 2019,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "ad246a293bfd2f319f1a8b73e64903e3",
    "name": "Marvel's Jessica Jones (Phần 2)",
    "origin_name": "Marvel's Jessica Jones (Season 2)",
    "slug": "marvels-jessica-jones-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20240118-1/d514f62e15af96acc00d3ffea378e3ae.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240118-1/1c98b7c58ec377f94a0f11fd111a327a.jpg",
    "year": 2018,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "d758d419023e5a228ec696e53c735f17",
    "name": "Marvel's Jessica Jones (Phần 1)",
    "origin_name": "Marvel's Jessica Jones (Season 1)",
    "slug": "marvels-jessica-jones-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20240228-1/cafaeefcfca06cd08f473d993775f0bc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240228-1/422164f5570453970c97055928cae760.jpg",
    "year": 2015,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "ff5b376f952246bd12b516e765403906",
    "name": "Ms. Marvel",
    "origin_name": "Ms. Marvel",
    "slug": "ms-marvel",
    "poster_url": "https://phimimg.com/upload/vod/20240520-1/c36becf878e2b25b53448e5b6087592b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240520-1/1ead92c8c0144f57c6b28b7a77f65619.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (6/6)",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "f8b9c9905a91ffd593f4ddc8293eb900",
    "name": "Hộ Vệ Siêu Anh Hùng (Những Người Bảo Vệ)",
    "origin_name": "Marvel's The Defenders",
    "slug": "ho-ve-sieu-anh-hung-nhung-nguoi-bao-ve",
    "poster_url": "https://phimimg.com/upload/vod/20260624-1/e328eed8220a16e02d6057128de7e55c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260624-1/4a65941bf8a1168ebd96b57cc0e59ca5.jpg",
    "year": 2017,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "44fd3d54368ffe700c4d10c32fc61112",
    "name": "Siêu Nhân Mù (Phần 1)",
    "origin_name": "Marvel's Daredevil (Season 1)",
    "slug": "sieu-nhan-mu-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20250723-1/3b2a162ec097cb3982e59eb2619426d8.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250723-1/b77d26c43516a6d4ec8ffe8bc4364acf.jpg",
    "year": 2015,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "a2fa685f91421d4b7698f2399dcb1700",
    "name": "Siêu Nhân Mù (Phần 3)",
    "origin_name": "Marvel's Daredevil (Season 3)",
    "slug": "sieu-nhan-mu-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20250723-1/7900acd4a9e2e0b1ac954fcd91803a70.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250723-1/32994f3294f4ed769c7ed1477f268a7a.jpg",
    "year": 2018,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "2e99f39ee5ebc8f125c2c4c2a13d96ef",
    "name": "Đội Đặc Nhiệm SHIELD (Phần 7)",
    "origin_name": "Marvel's Agents Of S.H.I.E.L.D. (Season 7)",
    "slug": "doi-dac-nhiem-shield-phan-7",
    "poster_url": "https://phimimg.com/upload/vod/20260119-1/6875c96f5ff9937efa8de85b506bb655.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260119-1/3352657232c568805c3b93f0fc8b695f.jpg",
    "year": 2020,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "73619c7b11b447e069e92d80914bc329",
    "name": "Đội Đặc Nhiệm SHIELD (Phần 6)",
    "origin_name": "Marvel's Agents Of S.H.I.E.L.D. (Season 6)",
    "slug": "doi-dac-nhiem-shield-phan-6",
    "poster_url": "https://phimimg.com/upload/vod/20260119-1/fb091cf60d7c08f8a787db0d753a855e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260119-1/dfb004db9985e8dc98f8ae7a2d72b126.jpg",
    "year": 2019,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "bd0181690d928c05350f75ce49aecb2a",
    "name": "Đội Đặc Nhiệm SHIELD (Phần 5)",
    "origin_name": "Marvel's Agents Of S.H.I.E.L.D. (Season 5)",
    "slug": "doi-dac-nhiem-shield-phan-5",
    "poster_url": "https://phimimg.com/upload/vod/20260119-1/2b595832012a3ff70572705dcf746e22.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260119-1/a52ef6f82bda4a80a11e6e71bbaa86b2.jpg",
    "year": 2017,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "de584085097dbcc290d237ea48ccd97c",
    "name": "Đội Đặc Nhiệm SHIELD (Phần 4)",
    "origin_name": "Marvel's Agents Of S.H.I.E.L.D. (Season 4)",
    "slug": "doi-dac-nhiem-shield-phan-4",
    "poster_url": "https://phimimg.com/upload/vod/20260119-1/0292e63914d33cc0454dfbccf4872bc1.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260119-1/02f5e83b65629b6a2419813824104a69.jpg",
    "year": 2016,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "e1b036022a6aaa7d187caae163216533",
    "name": "Đội Đặc Nhiệm SHIELD (Phần 3)",
    "origin_name": "Marvel's Agents Of S.H.I.E.L.D. (Season 3)",
    "slug": "doi-dac-nhiem-shield-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20260119-1/1e9569bf27a2baf11e75ddc1ac350d4e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260119-1/5aa96df9c1fd07dd140c07512b86b17d.jpg",
    "year": 2015,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "51a62ca0b1205fd7144f29e468393531",
    "name": "Đội Đặc Nhiệm SHIELD (Phần 2)",
    "origin_name": "Marvel's Agents Of S.H.I.E.L.D. (Season 2)",
    "slug": "doi-dac-nhiem-shield-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20260119-1/78866c691cc69c3396ad5cf88e319c98.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260119-1/55f1530e6395098ad5ad90a1c747f913.jpg",
    "year": 2014,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "27a084143054dbde46bb43f0ccae1a55",
    "name": "Đội Đặc Nhiệm SHIELD (Phần 1)",
    "origin_name": "Marvel's Agents Of S.H.I.E.L.D. (Season 1)",
    "slug": "doi-dac-nhiem-shield-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20260119-1/2fd727db702095b3d48c9d0976625e96.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260119-1/5187c53856e1d51465665ceba84539b4.jpg",
    "year": 2013,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "d9d7b884b296bbafc640cd145acf5f1b",
    "name": "Siêu Nhân Mù (Phần 2)",
    "origin_name": "Marvel's Daredevil (Season 2)",
    "slug": "sieu-nhan-mu-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20250723-1/ddf93cc061e8f54d11f783e90a59aa43.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250723-1/2dc9a9f6decd616e1da56b68d10711b8.jpg",
    "year": 2016,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "da441fc259bec560a67460b17f4b657e",
    "name": "Avengers: Trận Chiến Cuối Cùng",
    "origin_name": "Ultimate Avengers: The Movie",
    "slug": "avengers-tran-chien-cuoi-cung",
    "poster_url": "https://phimimg.com/upload/vod/20240128-1/4278b5bc228cbc7963f50547e6c76cff.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240128-1/72824a2b39de2fbb3e9617058b2f9eb3.jpg",
    "year": 2006,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "24bfde45b5790f04b1d096565157f6a4",
    "name": "Ultimate Avengers 2: Rise of the Panther",
    "origin_name": "Ultimate Avengers 2: Rise of the Panther",
    "slug": "ultimate-avengers-2-rise-of-the-panther",
    "poster_url": "https://phimimg.com/upload/vod/20231119-1/e2e5512ceab4f3584e8efebd53da2b13.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231119-1/fe000efdddac2f8f3e3529ceddabbd85.jpg",
    "year": 2006,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "3e9e39fed3b8369ed940f52cf300cf88",
    "name": "Biệt Đội Siêu Anh Hùng 4: Hồi Kết",
    "origin_name": "Avengers: Endgame",
    "slug": "biet-doi-sieu-anh-hung-4-hoi-ket",
    "poster_url": "https://phimimg.com/upload/vod/20250517-1/12f7cc3c15c8532f362afd71fe9c2915.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250517-1/c9391052648953e135770cf4c7b10034.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "5ec829debe54b19a5f78d9a65b900a39",
    "name": "Biệt Đội Siêu Anh Hùng 3: Cuộc Chiến Vô Cực",
    "origin_name": "Avengers: Infinity War",
    "slug": "biet-doi-sieu-anh-hung-3-cuoc-chien-vo-cuc",
    "poster_url": "https://phimimg.com/upload/vod/20250517-1/ea70303d55b86c6badee2a80b839a739.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250517-1/ce91513c3f6e12457edea803bdd583d3.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "0a87257e5308197df43230edf4ad1dae",
    "name": "Biệt Đội Siêu Anh Hùng 2: Đế Chế Ultron",
    "origin_name": "Avengers: Age Of Ultron",
    "slug": "biet-doi-sieu-anh-hung-2-de-che-ultron",
    "poster_url": "https://phimimg.com/upload/vod/20250517-1/b5756037d7bacff075fe28fc3197da44.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250517-1/69229eba91fea0022837a2c21585e03b.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "814a9c18f5abff398787c9cfcbf3d80c",
    "name": "Biệt Đội Siêu Anh Hùng",
    "origin_name": "The Avengers",
    "slug": "biet-doi-sieu-anh-hung",
    "poster_url": "https://phimimg.com/upload/vod/20250517-1/2f379fa692f6cdbd440d34bf367cccfb.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250517-1/63af625c8e64e37cefb78667309cf9e1.jpg",
    "year": 2012,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "66abd1e4544beed37b65e72639d88850",
    "name": "Chiến Binh Cổ Đại",
    "origin_name": "Avengers Grimm",
    "slug": "chien-binh-co-dai",
    "poster_url": "https://phimimg.com/upload/vod/20240220-1/1faf55d9fa1de32d4ee8abfab0fd6ea2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240220-1/1faf55d9fa1de32d4ee8abfab0fd6ea2.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "88e1ce84f9feef5a08d0df0334c53468",
    "name": "Biệt Đội Siêu Anh Hùng Bí Mật: Black Widow và Punisher",
    "origin_name": "Avengers Confidential: Black Widow & Punisher",
    "slug": "biet-doi-sieu-anh-hung-bi-mat-black-widow-va-punisher",
    "poster_url": "https://phimimg.com/upload/vod/20231030-1/699269dedd1b86f2ee634d2a7bfe5821.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231030-1/1e1afb7e33282dd4b5f7756f72a6e308.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      }
    ],
    "country": [
      {
        "name": "Nhật Bản",
        "slug": "nhat-ban",
        "id": "d4097fbffa8f7149a61281437171eb83"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "54ac89ac6928fe968c150c002e74ebcb",
    "name": "Thượng Xuân Sơn",
    "origin_name": "The Spring Avenger",
    "slug": "thuong-xuan-son",
    "poster_url": "https://phimimg.com/upload/vod/20251015-1/4cb35633ef8bbdd001477407c92d3f78.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20251015-1/377d49087c7b29970297e59a23009d51.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (24/24)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "e96b520d898c746f81549b11832d7424",
    "name": "Siêu Anh Hùng Bá Dơ",
    "origin_name": "The Toxic Avenger Unrated",
    "slug": "sieu-anh-hung-ba-do",
    "poster_url": "https://phimimg.com/upload/vod/20251006-1/ecc53df28a10c320bf4fad2ff51c746d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20251006-1/decf0da9841906e7ecd47ffc949b734c.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "9e36d5294d8f32155b8178bb26fd024c",
    "name": "Người Hùng Nhiễm Độc Báo Thù",
    "origin_name": "The Toxic Avenger",
    "slug": "nguoi-hung-nhiem-doc-bao-thu",
    "poster_url": "https://phimimg.com/upload/vod/20240228-1/80e1665fe227aa5455739f2af40559ea.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240228-1/c778d5f422cf7431863c31795319806e.jpg",
    "year": 1984,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
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
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "ef0917ea498b1665ad6c701057155abe",
    "name": "Captain America: Kẻ Báo Thù Đầu Tiên",
    "origin_name": "Captain America: The First Avenger",
    "slug": "captain-america-ke-bao-thu-dau-tien",
    "poster_url": "https://phimimg.com/upload/vod/20231023-1/c57522ab9758306b8318fc880db5d43d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231023-1/52b540fe25106beae3fdf132bfe6fb01.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "avengers"
  },
  {
    "_id": "4275f89744278864da88c2fda68ec4e9",
    "name": "Iron Man & Hulk: Heroes United",
    "origin_name": "Iron Man & Hulk: Heroes United",
    "slug": "iron-man-hulk-heroes-united",
    "poster_url": "https://phimimg.com/upload/vod/20231113-1/66ab29b0e77ea7424b13ffda3ce84ecb.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231113-1/1f534463e172a3515d5b02df3eb7034a.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "9d28de8ff9bb6a3fa41fddfdc28f3bc1",
    "name": "Người Sắt: Sự Nổi Giận Của Technovore (Người Sắt: Sự Trỗi Dậy Của Technovore)",
    "origin_name": "Iron Man: Rise Of Technovore",
    "slug": "nguoi-sat-su-noi-gian-cua-technovore-nguoi-sat-su-troi-day-cua-technovore",
    "poster_url": "https://phimimg.com/upload/vod/20260515-1/9ee02be2725851f9d7187dc74a4fa76b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260515-1/36430f0db6e4fbd232870b8db39c44b0.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Nhật Bản",
        "slug": "nhat-ban",
        "id": "d4097fbffa8f7149a61281437171eb83"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "c55430fdfdac11fc3771a9b94e2bb854",
    "name": "Người Sắt Vô Địch",
    "origin_name": "The Invincible Iron Man",
    "slug": "nguoi-sat-vo-dich",
    "poster_url": "https://phimimg.com/upload/vod/20231125-1/2c7ca58ad0084d16c86633a691ea5c14.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231125-1/d3fd823383a8086297670eaf7d697334.jpg",
    "year": 2007,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Giả Tượng",
        "slug": "gia-tuong",
        "id": "97e7ed4c52ce3737e18bdf0bd1331ce8"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "dc2b690516158a874dd8aabe1365c6a0",
    "name": "Người Sắt",
    "origin_name": "Iron Man",
    "slug": "nguoi-sat",
    "poster_url": "https://phimimg.com/upload/vod/20231023-1/3d81f21c3c591a90d625f038d44a53de.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231023-1/95bcaaa3bbc20702755fc91569f0de3c.jpg",
    "year": 2008,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "bbaa9d6a1445eac881750bea6053f564",
    "name": "Người Sắt 3",
    "origin_name": "Iron Man 3",
    "slug": "nguoi-sat-3",
    "poster_url": "https://phimimg.com/upload/vod/20231019-1/6a2500b20b990f7c896c924a93c4e804.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231019-1/7e1f85a6b0c9f5c07afd7ad18d41a424.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "936a40b7e8eea0dc537e5f2edee1387a",
    "name": "Người Sắt 2",
    "origin_name": "Iron Man 2",
    "slug": "nguoi-sat-2",
    "poster_url": "https://phimimg.com/upload/vod/20231018-1/7cfe6b549fe9f94928b8bdc0016ac82f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231018-1/7ed100595fc14b75c63b540d27405bda.jpg",
    "year": 2010,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "1bf50aaf147b3b0ddd26a820d2ed394d",
    "name": "Tay Đấm Sắt",
    "origin_name": "The Man with the Iron Fists",
    "slug": "tay-dam-sat",
    "poster_url": "https://phimimg.com/upload/vod/20231103-1/f4c01b50c6f5631abc788993a654a34e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231103-1/08704e8f612a558138621ef0cdf30182.jpg",
    "year": 2012,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      }
    ],
    "country": [
      {
        "name": "Hồng Kông",
        "slug": "hong-kong",
        "id": "dcd5551cbd22ea2372726daafcd679c1"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "3dc430c160636fb3d2b8ffb62d9f1f3c",
    "name": "Doraemon: Nobita và Binh Đoàn Người Sắt",
    "origin_name": "Doraemon: Nobita and the Steel Troops",
    "slug": "doraemon-nobita-va-binh-doan-nguoi-sat-1986",
    "poster_url": "https://phimimg.com/upload/vod/20250521-1/59819ead79ded37a10d9a1da9a91b8a6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250521-1/24b9889ea71659f91ffc9b3554901b16.jpg",
    "year": 1986,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Thuyết Minh",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
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
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      }
    ],
    "country": [
      {
        "name": "Nhật Bản",
        "slug": "nhat-ban",
        "id": "d4097fbffa8f7149a61281437171eb83"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "571ac6dcf08ffecf9796cb9706c75eec",
    "name": "Doraemon: Nobita và Binh Đoàn Người Sắt",
    "origin_name": "Doraemon: Nobita and the New Steel Troops: Winged Angels",
    "slug": "doraemon-nobita-va-binh-doan-nguoi-sat",
    "poster_url": "https://phimimg.com/upload/vod/20250521-1/6f44d511f18614d6aa39a1031b18aa41.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250521-1/f4332a93f6fa5265a61c395c6022267c.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
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
        "name": "Nhật Bản",
        "slug": "nhat-ban",
        "id": "d4097fbffa8f7149a61281437171eb83"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "8bb6fe84b8bba85343f415936f15e878",
    "name": "Captain America: Thế Giới Mới",
    "origin_name": "Captain America: Brave New World",
    "slug": "captain-america-the-gioi-moi",
    "poster_url": "https://phimimg.com/upload/vod/20250218-1/3ff8eee9f7443ddc826546772c9b6e4e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250218-1/c4fc10824def45b2171d7a46516b6378.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "2b6921f2c64dee16ba21ebf17f3c2c92",
    "name": "Captain America: Chiến Binh Mùa Đông",
    "origin_name": "Captain America: The Winter Soldier",
    "slug": "captain-america-chien-binh-mua-dong",
    "poster_url": "https://phimimg.com/upload/vod/20231024-1/471cf661d9e63cae2b62daa1e033aae9.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231024-1/f929525997c4f9839b6c677a2507eb82.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "653ac11ca60b3e021a8c609c7198acfc",
    "name": "Captain America: Nội Chiến Siêu Anh Hùng",
    "origin_name": "Captain America: Civil War",
    "slug": "captain-america-noi-chien-sieu-anh-hung",
    "poster_url": "https://phimimg.com/upload/vod/20231019-1/8c7f1dd82969ab49e34d2adeee20a948.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231019-1/5627583170acd90f4a913dfb103a66b6.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "04c0e78a0e5ff3259fd1fc0239065a3a",
    "name": "Thần Sấm IV:  Tình Yêu Và Sấm Sét",
    "origin_name": "Thor: Love And Thunder",
    "slug": "than-sam-iv-tinh-yeu-va-sam-set",
    "poster_url": "https://phimimg.com/upload/vod/20250923-1/56b59045be261e78ae5a4aa6a3a2bbc1.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250923-1/2777ecb8ac6e48fb907b583df8f34117.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "e45823afe1e5120cec11fc4c379a0c67",
    "name": "Thần Sấm III: Tận Thế Ragnarok",
    "origin_name": "Thor: Ragnarok",
    "slug": "than-sam-iii-tan-the-ragnarok",
    "poster_url": "https://phimimg.com/upload/vod/20250923-1/59decafde7b70d889356c7b148296018.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250923-1/b3a03143b24418fea856bbee98426d35.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "69dafe8b58066478aea48f3d0f384820",
    "name": "Thần Sấm II: Thế Giới Bóng Tối",
    "origin_name": "Thor: The Dark World",
    "slug": "than-sam-ii-the-gioi-bong-toi",
    "poster_url": "https://phimimg.com/upload/vod/20250923-1/59eb1a450d1c31635548241d4ff3031b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250923-1/e4ba7b6bbd53ecef3e7740405648310b.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "16bda725ae44af3bb9316f416bd13b1b",
    "name": "Thần Sấm I",
    "origin_name": "Thor",
    "slug": "than-sam-i",
    "poster_url": "https://phimimg.com/upload/vod/20250923-1/a94f79bd7f548ae7004230dab689e8ef.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250923-1/9b0213e8ba9d51708e6d332ba90527c4.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "6b41f17abd11bbc46176560b301a4e24",
    "name": "Thiên Đường Quả Báo",
    "origin_name": "The Paradise of Thorns",
    "slug": "thien-duong-qua-bao",
    "poster_url": "https://phimimg.com/upload/vod/20250411-1/8065518b9fe42fcd98604ca6728a1128.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250411-1/92e42f7ea0bd92c52e429179ea2d216e.jpg",
    "year": 2024,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      }
    ],
    "country": [
      {
        "name": "Thái Lan",
        "slug": "thai-lan",
        "id": "cefbf1640a17bad1e13c2f6f2a811a2d"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "b44d430b7454e3e7eae0636defd68abb",
    "name": "Tiếng Chim Hót Trong Bụi Mận Gai",
    "origin_name": "The Thorn Birds",
    "slug": "tieng-chim-hot-trong-bui-man-gai",
    "poster_url": "https://phimimg.com/upload/vod/20250221-1/8a766d06c0c88dafc7693d90052a5616.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250221-1/147e82d2364de5f012e39039583a6ece.jpg",
    "year": 1983,
    "episode_current": "Hoàn Tất (4/4)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Úc",
        "slug": "uc",
        "id": "435a85571578e419ed511257881a1e75"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "68722b092586cf1d41e07bb366c760c6",
    "name": "Gai",
    "origin_name": "Thorn",
    "slug": "gai",
    "poster_url": "https://phimimg.com/upload/vod/20240829-1/1fb846ab6fa1bdf2b369c9685d921d0d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240829-1/566e96b103039d433755fdf08cc64fb9.jpg",
    "year": 2020,
    "episode_current": "Hoàn Tất (16/16)",
    "quality": "FHD",
    "lang": "Lồng Tiếng",
    "category": [
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "5159f683253665f2122788b700686d8b",
    "name": "Chiếc Búa Quyền Năng",
    "origin_name": "Almighty Thor",
    "slug": "chiec-bua-quyen-nang",
    "poster_url": "https://phimimg.com/upload/vod/20240108-1/dae69f8f119d750e38d6d31a20efd2fc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240108-1/4a668e92f6613566669e5866d13c912f.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "41d6c2482cdf34113f998e9df192e148",
    "name": "Kế Hoạch Giết Dượng",
    "origin_name": "Thoroughbreds",
    "slug": "ke-hoach-giet-duong",
    "poster_url": "https://phimimg.com/upload/vod/20231208-1/09d087923ae7fe3b72d9ddc010386e9e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231208-1/30517346d3476f77abf5b415643a4e3b.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      },
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "b11b7e3409b27e5c6e332399362105f8",
    "name": "Thần Sấm: Truyền Thuyết Về Asgard",
    "origin_name": "Thor: Tales of Asgard",
    "slug": "than-sam-truyen-thuyet-ve-asgard",
    "poster_url": "https://phimimg.com/upload/vod/20231129-1/c1c6723d3c7e28017eb9137e9dcac11a.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231129-1/7488f46024b79962a333e2bdae69a281.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "36908cc1066bd4fdd686b4d35de256d2",
    "name": "Người Nhện: Khởi Đầu Mới",
    "origin_name": "Spider-Man: Brand New Day",
    "slug": "nguoi-nhen-khoi-dau-moi",
    "poster_url": "https://phimimg.com/uploads/movies/20260827/nguoi-nhen-khoi-dau-moi-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260827/nguoi-nhen-khoi-dau-moi-thumb.webp",
    "year": 2026,
    "episode_current": "Full",
    "quality": "CAM",
    "lang": "Vietsub",
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
        "id": "9822be111d2ccc29c7172c78b8af8ff5",
        "name": "Hành Động",
        "slug": "hanh-dong"
      },
      {
        "id": "66c78b23908113d478d8d85390a244b4",
        "name": "Phiêu Lưu",
        "slug": "phieu-luu"
      }
    ],
    "country": [
      {
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a",
        "name": "Âu Mỹ",
        "slug": "au-my"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "6261bbab8e8fed648e4a4433d7a8cc1f",
    "name": "Người Nhện Hàng Xóm Thân Thiện",
    "origin_name": "Your Friendly Neighborhood Spider-Man",
    "slug": "nguoi-nhen-hang-xom-than-thien",
    "poster_url": "https://phimimg.com/uploads/movies/20260809/nguoi-nhen-hang-xom-than-thien-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260809/nguoi-nhen-hang-xom-than-thien-thumb.webp",
    "year": 2025,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "id": "d9983d88d8929b1d9f767884e2999e27",
        "name": "Hoạt Hình",
        "slug": "hoat-hinh"
      },
      {
        "id": "9822be111d2ccc29c7172c78b8af8ff5",
        "name": "Hành Động",
        "slug": "hanh-dong"
      },
      {
        "id": "66c78b23908113d478d8d85390a244b4",
        "name": "Phiêu Lưu",
        "slug": "phieu-luu"
      },
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "bdffc7973c9f8f88ab4effb397c59f92",
    "name": "Người Nhện 3",
    "origin_name": "Spider-Man 3",
    "slug": "nguoi-nhen-3",
    "poster_url": "https://phimimg.com/upload/vod/20250828-1/db24338194c1b2ec0ec3a77f20429d88.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250828-1/2b65f5542958b51e8ebe6a753c0037cb.jpg",
    "year": 2007,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "0d73a25092e5c1c9769a9f3255caa65a",
    "name": "Người Nhện",
    "origin_name": "Spider-Man",
    "slug": "nguoi-nhen-2002",
    "poster_url": "https://phimimg.com/upload/vod/20250828-1/32b691d8abf459ca3c8f0c4371971a88.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250828-1/8d06a88a548d9de439a2821242557e15.jpg",
    "year": 2002,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "96055f5b06bf9381ac43879351642cf5",
    "name": "Người Nhện: Không Còn Nhà",
    "origin_name": "Spider-Man: No Way Home",
    "slug": "nguoi-nhen-khong-con-nha",
    "poster_url": "https://phimimg.com/upload/vod/20250828-1/08fd0a68865ce452e959ae2bf58b7a8c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250828-1/db868e69da1af78d124ed464063b27a6.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "b5b03f06271f8917685d14cea7c6c50a",
    "name": "Người Nhện 2",
    "origin_name": "Spider-Man 2",
    "slug": "nguoi-nhen-2",
    "poster_url": "https://phimimg.com/upload/vod/20250828-1/05a7ca0a3b7469278e817e726dcd966d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250828-1/61c18f4cfb84ca64fc6182fa7ff3a3a4.jpg",
    "year": 2004,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "a012869311d64a44b5a0d567cd20de04",
    "name": "Người Nhện: Trở Về Nhà",
    "origin_name": "Spider-Man: Homecoming",
    "slug": "nguoi-nhen-tro-ve-nha",
    "poster_url": "https://phimimg.com/upload/vod/20250707-1/b31b4f5bb26376354ab897033b7ce0be.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250707-1/bba16cc8caa5fff4738e33d6c701b3e8.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "ee26fc66b1369c7625333bedafbfcaf6",
    "name": "Người Nhện Siêu Đẳng 2",
    "origin_name": "The Amazing Spider-Man 2",
    "slug": "nguoi-nhen-sieu-dang-2",
    "poster_url": "https://phimimg.com/upload/vod/20250707-1/319a8a56a4f40d488edfbe1034655ea0.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250707-1/76357d997a6d6ab4b72f5fc0b646c98f.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "24917db15c4e37e421866448c9ab23d8",
    "name": "Người Nhện Siêu Đẳng",
    "origin_name": "The Amazing Spider-Man",
    "slug": "nguoi-nhen-sieu-dang",
    "poster_url": "https://phimimg.com/upload/vod/20250707-1/5fe0d95859f9ab7b752352028971ed34.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250707-1/e85e85d591b947b1e639983d09d2de5d.jpg",
    "year": 2012,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "26f5bd4aa64fdadf96152ca6e6408068",
    "name": "Người Nhện: Xa Nhà",
    "origin_name": "Spider-Man: Far From Home",
    "slug": "nguoi-nhen-xa-nha",
    "poster_url": "https://phimimg.com/upload/vod/20250828-1/61e116cf5aa607aa7510817b03c2508f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250828-1/1442ca6c81ea534e0ae1f3865250eb5e.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "4ba3c163cd1efd4c14e3a415fa0a3010",
    "name": "Người Nhện: Vũ Trụ Mới",
    "origin_name": "Spider-Man: Into The Spider-Verse",
    "slug": "nguoi-nhen-vu-tru-moi",
    "poster_url": "https://phimimg.com/upload/vod/20250828-1/6672913138abd129cf77f96f4c4c2293.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250828-1/022629ae752aba04e97d0f36bbae7bef.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "ec8956637a99787bd197eacd77acce5e",
    "name": "Người Nhện: Du Hành Vũ Trụ Nhện",
    "origin_name": "Spider-Man: Across The Spider-Verse",
    "slug": "nguoi-nhen-du-hanh-vu-tru-nhen",
    "poster_url": "https://phimimg.com/upload/vod/20250828-1/a4b7cb04bd30ea4d6fdb3bdbf8058a8f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250828-1/8eb367ab5ba2a2b125205cbf4a21107f.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Lồng Tiếng",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "3f826f30bc252fb41b7ef03b98ee98c8",
    "name": "Vjeran Tomic: Người Nhện Paris",
    "origin_name": "Vjeran Tomic: The Spider-Man Of Paris",
    "slug": "vjeran-tomic-nguoi-nhen-paris",
    "poster_url": "https://phimimg.com/upload/vod/20240228-1/eb1c4e8d6633318737ddd17d1a0a5bee.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240228-1/46c2b65fb0cdb36cef0f8dc675c9599e.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Tài Liệu",
        "slug": "tai-lieu",
        "id": "1645fa23fa33651cef84428b0dcc2130"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "42a61b38226d9f4a3bdeef465b616eb7",
    "name": "Người Nhện Giang Hồ",
    "origin_name": "Spider-Noir",
    "slug": "nguoi-nhen-giang-ho",
    "poster_url": "https://phimimg.com/upload/vod/20260528-1/7372224b3c74d4749d1f30d1fd9876e3.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260528-1/ea5acca6b12635bd8fd6e03cf347936a.jpg",
    "year": 2026,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "f6ec706c08a1f5eb01539dafdc14b4a3",
    "name": "Deadpool Và Wolverine",
    "origin_name": "Deadpool & Wolverine",
    "slug": "deadpool-va-wolverine",
    "poster_url": "https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg",
    "year": 2024,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
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
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "f6e794a75c5d51de081dbefa224304f9",
    "name": "Deadpool 2",
    "origin_name": "Deadpool 2",
    "slug": "deadpool-2",
    "poster_url": "https://phimimg.com/upload/vod/20250821-1/dffaea6f42fda54f0cd5f74c548c90ae.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250821-1/a851456512f6c0df30a79e35ae0b756b.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "52dbb0686f8bd0c0c757acf716e28ec0",
    "name": "Deadpool",
    "origin_name": "Deadpool",
    "slug": "deadpool",
    "poster_url": "https://phimimg.com/upload/vod/20250821-1/48ae866185a5c4aeacc4323a8a32371f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250821-1/2eef3d1aac354dc42a07e0578b3d7438.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "a2790947391a51d18dc235eea344d981",
    "name": "X-Men 6: Người Sói Wolverine",
    "origin_name": "The Wolverine",
    "slug": "xmen-6-nguoi-soi-wolverine",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/6d644b549e62946d771b12bd8bb6bed4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/abae7b6648b9bd2ab78d3906c72e2f91.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "10112bde2ba78e674b21aaa84613bc8e",
    "name": "X-Men 4: Nguồn Gốc Người Sói",
    "origin_name": "X-Men Origins: Wolverine",
    "slug": "xmen-4-nguon-goc-nguoi-soi",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/d785cd546c2c095ee60a847849f5b902.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/b3f35d48041bfba9cc28ae7cb2eedca0.jpg",
    "year": 2009,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "e273b4b4631a6f6e22eb40b1df2339e9",
    "name": "X-Men 9: Logan - Trận Chiến Cuối Cùng",
    "origin_name": "Logan",
    "slug": "xmen-9-logan-tran-chien-cuoi-cung",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/69b267c24435b844ca4086a0f0ea65ff.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/4e1662277f178f7d79325ffc10657d27.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "e5afb0f2dbc6d39b312d7406054cb4c6",
    "name": "X-Men 7: Ngày Cũ Của Tương Lai",
    "origin_name": "X-Men: Days Of Future Past",
    "slug": "xmen-7-ngay-cu-cua-tuong-lai",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/1356ff3bb5781090cea857aaa1392acd.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/dfcb5c95da77476758999f9e4ad18c29.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "b06b5541a62ed438f956b662b4e1ec28",
    "name": "X-Men 10: Phượng Hoàng Bóng Tối",
    "origin_name": "Dark Phoenix",
    "slug": "xmen-10-phuong-hoang-bong-toi",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/d040c88d778ec6b68963fa6d8dbb8a70.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/908c9261f51f9c8d83b0cf9f134cb44f.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "b6cda17abb967ed28ec9610137aa45f7",
    "name": "X-Men 8: Cuộc Chiến Chống Apocalypse",
    "origin_name": "X-Men: Apocalypse",
    "slug": "xmen-8-cuoc-chien-chong-apocalypse",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/601c359a0ceb3dc3675f49ca62e99d26.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/ce6a1a5d70efe3e0c33998a9fe381c47.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "4e5046fc8d6a97d18a5f54beaed54dea",
    "name": "X-Men 5: Thế Hệ Thứ Nhất",
    "origin_name": "X-Men: First Class",
    "slug": "xmen-5-the-he-thu-nhat",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/8af518496b858826c7ed65edcbd37351.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/8f84a298f28649d20812b16605860320.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "4324e8d0d37b110ee1a4f1633ac52df5",
    "name": "X-Men 3: Phán Xét Cuối Cùng",
    "origin_name": "X-Men: The Last Stand",
    "slug": "xmen-3-phan-xet-cuoi-cung",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/fa40c39ee00b0c8fab9d01363afc7389.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/2978955c7d763ac05c01d1d15fe25337.jpg",
    "year": 2006,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "2cfa3753d6a524711acb5fce38eeca1a",
    "name": "X-Men 2: Liên Minh Dị Nhân",
    "origin_name": "X2",
    "slug": "xmen-2-lien-minh-di-nhan",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/84d775dcda2b44f1b9660c71fcdb21df.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/edcb9fef341ffcff366ff5fc030f3940.jpg",
    "year": 2003,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "2853427cee00e06272cf17d4be94f7d0",
    "name": "X-Men 1: Dị Nhân",
    "origin_name": "X-Men",
    "slug": "xmen-1-di-nhan",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/7596856ff41dce0eebb83d0dae8415fc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/f2b68e5c6917982406df569b6fe934bc.jpg",
    "year": 2000,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "eba62c424f4c5d83b7423290ff7ea552",
    "name": "Dị Nhân '97 (Phần 2)",
    "origin_name": "X-Men '97 (Season 2)",
    "slug": "di-nhan-97-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20260706-1/0609c0eee3d69c96d62a88463a2bb8dd.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260706-1/6be511ec53c47bedf73986c788280688.jpg",
    "year": 2026,
    "episode_current": "Hoàn Tất (9/9)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "id": "9822be111d2ccc29c7172c78b8af8ff5",
        "name": "Hành Động",
        "slug": "hanh-dong"
      },
      {
        "id": "0bcf4077916678de9b48c89221fcf8ae",
        "name": "Khoa Học",
        "slug": "khoa-hoc"
      },
      {
        "id": "66c78b23908113d478d8d85390a244b4",
        "name": "Phiêu Lưu",
        "slug": "phieu-luu"
      },
      {
        "id": "a7b065b92ad356387ef2e075dee66529",
        "name": "Tâm Lý",
        "slug": "tam-ly"
      },
      {
        "id": "68564911f00849030f9c9c144ea1b931",
        "name": "Viễn Tưởng",
        "slug": "vien-tuong"
      }
    ],
    "country": [
      {
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a",
        "name": "Âu Mỹ",
        "slug": "au-my"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "968f3d328fce0313aa636ba29c1b1fa9",
    "name": "Dị Nhân '97 (Phần 1)",
    "origin_name": "X-Men '97 (Season 1)",
    "slug": "di-nhan-97-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20260706-1/3b6b3679f3c76dcc329a9df6333ab36f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260706-1/1578b0b0bc853d20f595f85803113417.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "65ded5353c5ee48d0b7d48c591b8f430",
    "name": "Logan: Trận Chiến Cuối Cùng",
    "origin_name": "Logan",
    "slug": "logan-tran-chien-cuoi-cung",
    "poster_url": "https://phimimg.com/upload/vod/20230915-1/a8ba6ba4fe347ca3d83e2bdbdee7249b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230915-1/9d1fc16841fe99bf25f6f37732179457.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "4c56ff4ce4aaf9573aa5dff913df997a",
    "name": "Vụ Trộm May Rủi",
    "origin_name": "Logan Lucky",
    "slug": "vu-trom-may-rui",
    "poster_url": "https://phimimg.com/upload/vod/20230914-1/1d585f3b0c0a2deb660117ae6fd485da.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230914-1/622e3297b259fd1e09f7108bc1c3cb22.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "8c74b88f3daf0f4f918d501c1f90ac2f",
    "name": "Người Sói: Trận Chiến Cuối Cùng",
    "origin_name": "Logan",
    "slug": "nguoi-soi-tran-chien-cuoi-cung",
    "poster_url": "https://phimimg.com/upload/vod/20231211-1/2e9518c3fe59fec16a593d9b81f4a128.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231211-1/80d50d59bd88b9cce0902f41b3610971.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "xmen"
  },
  {
    "_id": "584b98aac2dddf59ee2cf19ca4ccb75e",
    "name": "Phù Thủy Tối Thượng: Đa Vũ Trụ Hỗn Loạn",
    "origin_name": "Doctor Strange In The Multiverse Of Madness",
    "slug": "phu-thuy-toi-thuong-da-vu-tru-hon-loan",
    "poster_url": "https://phimimg.com/upload/vod/20250917-1/7789e2225cc29a40aa5e520147aa2f05.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250917-1/5a1f97d583f6a3954526e134238bbd39.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "bc3ff3ecffc6ba348bbc43cb98ee4dcf",
    "name": "Phù Thuỷ Tối Thượng",
    "origin_name": "Doctor Strange",
    "slug": "phu-thuy-toi-thuong",
    "poster_url": "https://phimimg.com/upload/vod/20250625-1/49251d06f817df134b460eec552c75c5.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250625-1/024795a342c636e4f673591f2e2c73b9.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "d893016144cfc7f13dd5cab7204d1be1",
    "name": "Bác Sĩ Xứ Lạ",
    "origin_name": "Doctor Stranger",
    "slug": "bac-si-xu-la",
    "poster_url": "https://phimimg.com/upload/vod/20240824-1/e8127496f929e7dd4536c6646c504b8d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240824-1/8c017a611202f0adf07a8e1044e19269.jpg",
    "year": 2014,
    "episode_current": "Hoàn Tất (20/20)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Hàn Quốc",
        "slug": "han-quoc",
        "id": "05de95be5fc404da9680bbb3dd8262e6"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "9d8df73a3cfbf3c5b47bc9b50f214aff",
    "name": "Bác Sĩ Đa Tài",
    "origin_name": "Doctor Strange",
    "slug": "bac-si-da-tai",
    "poster_url": "https://phimimg.com/upload/vod/20231109-1/e8fcab1565a36d70cbe99919b0403444.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231109-1/1e5b71be27cef53a64e99a07be1d7609.jpg",
    "year": 2007,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Giả Tượng",
        "slug": "gia-tuong",
        "id": "97e7ed4c52ce3737e18bdf0bd1331ce8"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "2a34abd6ebbd7fcf5a4421229c946c0a",
    "name": "Black Panther: Chiến Binh Báo Đen",
    "origin_name": "Black Panther",
    "slug": "black-panther-chien-binh-bao-den",
    "poster_url": "https://phimimg.com/upload/vod/20251211-1/5704d0324651b14e2f8c39a66d6072b0.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20251211-1/b4977eac62969f488dcb292b9ba54098.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "08f90c1a417155361a5c4b8d297e0d78",
    "name": "Chiến Binh Báo Đen: Wakanda Bất Diệt",
    "origin_name": "Black Panther: Wakanda Forever",
    "slug": "chien-binh-bao-den-wakanda-bat-diet",
    "poster_url": "https://phimimg.com/upload/vod/20251211-1/81ec06db5fb6b1c0203870203c146696.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20251211-1/0bb7a7e7978799855942975949b2bb81.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "0fa66dc7ac7cc66a4c72f28e7742f27f",
    "name": "Chiến Binh Da Màu Thế Chiến II",
    "origin_name": "Black Panthers of WWII",
    "slug": "chien-binh-da-mau-the-chien-ii",
    "poster_url": "https://phimimg.com/upload/vod/20251024-1/e08960932732f469643f21c3d35b5c17.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20251024-1/956ae5cac08c3fccc3ee301538ee2248.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chiến Tranh",
        "slug": "chien-tranh",
        "id": "1bae5183d681b7649f9bf349177f7123"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Lịch Sử",
        "slug": "lich-su",
        "id": "f8ec3e9b77c509fdf64f0c387119b916"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "124243dcc405103dcf9419f38c89f078",
    "name": "Hắc Báo Thiên Hạ",
    "origin_name": "The Black Panther Warriors",
    "slug": "hac-bao-thien-ha",
    "poster_url": "https://phimimg.com/upload/vod/20240207-1/06aa3b10a88807d52beba8e7da4cc6e5.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240207-1/da0ab5a7b049cb04f3e18b25bc2ff8c5.jpg",
    "year": 1994,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Thuyết Minh",
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
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "8d5e957f297893487bd98fa830fa6413",
    "name": "Người Kiến Và Chiến Binh Ong: Thế Giới Lượng Tử",
    "origin_name": "Ant-Man And The Wasp: Quantumania",
    "slug": "nguoi-kien-va-chien-binh-ong-the-gioi-luong-tu",
    "poster_url": "https://phimimg.com/upload/vod/20250919-1/ef49e5ce4d3a81ee0bb6920d42753d4f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250919-1/a4fc837a2f4b7f03f4b3c0909fd88870.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "db0cf003e7db9592288d809665cfeb2a",
    "name": "Người Kiến Và Chiến Binh Ong",
    "origin_name": "Ant-Man And The Wasp",
    "slug": "nguoi-kien-va-chien-binh-ong",
    "poster_url": "https://phimimg.com/upload/vod/20250919-1/14305fb6ae345d13a64413096d3fcd64.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250919-1/f9a00d5d43980ebd93d5085c34c621ae.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "24e27b869b66e9e62724bd7725d5d9c1",
    "name": "Ant-Man: Người Kiến",
    "origin_name": "Ant-Man",
    "slug": "antman-nguoi-kien",
    "poster_url": "https://phimimg.com/upload/vod/20250919-1/e8d6232948847eba650172712d2b6d0b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250919-1/dd11033a6999f856f6a62541204e1b48.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "f64eac11f2cd8f0efa196f8ad173178e",
    "name": "Vệ Binh Dải Ngân Hà: Tập Đặc Biệt",
    "origin_name": "The Guardians of the Galaxy Holiday Special",
    "slug": "ve-binh-dai-ngan-ha-tap-dac-biet",
    "poster_url": "https://phimimg.com/upload/vod/20230925-1/8041f746fab55f252ec0aa0ab928e740.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230925-1/ebd6880c45177bc6c74a7a003e793435.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
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
        "name": "Âm Nhạc",
        "slug": "am-nhac",
        "id": "252e74b4c832ddb4233d7499f5ed122e"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "12b1e42dc0746f22cf361267de07073f",
    "name": "Black Widow: Góa Phụ Đen",
    "origin_name": "Black Widow",
    "slug": "black-widow-goa-phu-den",
    "poster_url": "https://phimimg.com/upload/vod/20231018-1/d18cbed50be0d1dbc9f14eca5795579c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231018-1/2037f73a3cc71998042d7a151c73a4ee.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "3b92d18aa7a6176dd37d372bc2f1eb71",
    "name": "Shang-Chi và Huyền Thoại Thập Luân",
    "origin_name": "Shang-Chi and the Legend of the Ten Rings",
    "slug": "shangchi-va-huyen-thoai-thap-luan",
    "poster_url": "https://phimimg.com/upload/vod/20231018-1/85c4ec4028a7260b8f0e2ba8114d3c51.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231018-1/ea19bd0b6240ca2f3a6d031b189ffadb.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "dd28e50635038e9cf3a648c2dd17ad0a",
    "name": "Eternals: Chủng Tộc Bất Tử",
    "origin_name": "Eternals",
    "slug": "eternals-chung-toc-bat-tu",
    "poster_url": "https://phimimg.com/upload/vod/20250219-1/779b6954e2fc00bf8613e42c1d9fcc01.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250219-1/6fd633fd7914b5e5bfda680942a877df.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "762dd577d6ff90976d1269075d4ebae5",
    "name": "Loki (Phần 2)",
    "origin_name": "Loki (Season 2)",
    "slug": "loki-phan-2",
    "poster_url": "https://phimimg.com/uploads/movies/20260713/loki-phan-2-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260713/loki-phan-2-thumb.webp",
    "year": 2023,
    "episode_current": "Hoàn Tất (6/6)",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "dd2bdf6cb881176bc2c0c568e1a180fa",
    "name": "Loki (Phần 1)",
    "origin_name": "Loki (Season 1)",
    "slug": "loki-phan-1",
    "poster_url": "https://phimimg.com/uploads/movies/20260713/loki-phan-1-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260713/loki-phan-1-thumb.webp",
    "year": 2021,
    "episode_current": "Hoàn Tất (6/6)",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "878cbc9ed11d6c167ef0065805a85392",
    "name": "The Good, The Bart, And The Loki",
    "origin_name": "The Good, The Bart, And The Loki",
    "slug": "the-good-the-bart-and-the-loki",
    "poster_url": "https://phimimg.com/upload/vod/20231227-1/06ea3d2010f0484f6931cfdf8b4a4cd9.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231227-1/0639003fc1a840e177ec1074cc180b0e.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "11ab8d1653073d047c16ede5947fc64d",
    "name": "Wanda Và Vision",
    "origin_name": "WandaVision",
    "slug": "wanda-va-vision",
    "poster_url": "https://phimimg.com/upload/vod/20240326-1/6243bec129ea3b16ca4eebc28f67b809.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240326-1/09604d88ca94efe44754cf0c71b32e01.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (9/9)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "90dcf50c3de27fa42a804a086202bdcf",
    "name": "Hawkeye: Thần Tiễn (Mắt Diều Hâu)",
    "origin_name": "Hawkeye",
    "slug": "hawkeye-than-tien-mat-dieu-hau",
    "poster_url": "https://phimimg.com/uploads/movies/20260810/hawkeye-than-tien-mat-dieu-hau-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260810/hawkeye-than-tien-mat-dieu-hau-thumb.webp",
    "year": 2021,
    "episode_current": "Hoàn Tất (6/6)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "id": "37a7b38b6184a5ebd3c43015aa20709d",
        "name": "Chính Kịch",
        "slug": "chinh-kich"
      },
      {
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db",
        "name": "Hài Hước",
        "slug": "hai-huoc"
      },
      {
        "id": "9822be111d2ccc29c7172c78b8af8ff5",
        "name": "Hành Động",
        "slug": "hanh-dong"
      },
      {
        "id": "66c78b23908113d478d8d85390a244b4",
        "name": "Phiêu Lưu",
        "slug": "phieu-luu"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "a584750e807e73159a3ec38cf03ec65f",
    "name": "Hiệp Sĩ Ánh Trăng",
    "origin_name": "Moon Knight",
    "slug": "hiep-si-anh-trang",
    "poster_url": "https://phimimg.com/upload/vod/20240520-1/5c5a721c16825622615a921f0aacf3e1.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240520-1/c104b0c88abfc9d31b09e4466d509f72.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (6/6)",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "7bc1ec1d9c3426357e69acd5bf320061",
    "name": "Venom",
    "origin_name": "Venom",
    "slug": "venom",
    "poster_url": "https://phimimg.com/uploads/movies/20260730/venom-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260730/venom-thumb.webp",
    "year": 2018,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "d860edd1dd83b36f02ce52bde626c653",
    "name": "Venom: Đối Mặt Tử Thù",
    "origin_name": "Venom: Let There Be Carnage",
    "slug": "venom-doi-mat-tu-thu",
    "poster_url": "https://phimimg.com/uploads/movies/20260726/venom-doi-mat-tu-thu-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260726/venom-doi-mat-tu-thu-thumb.webp",
    "year": 2021,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "bcaad45dcf4ad3e57d8f1c22266c69c8",
    "name": "Venom: Kèo Cuối",
    "origin_name": "Venom: The Last Dance",
    "slug": "venom-keo-cuoi",
    "poster_url": "https://phimimg.com/upload/vod/20250420-1/585fe9d01af1aa30a1051920e7e5bb02.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250420-1/831e394435dfd36bedad54d79d1884b5.jpg",
    "year": 2024,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "4666e8bd27ff43dd76982b7e27c6e4cd",
    "name": "Hoa Sơn Luận Kiếm: Đông Tà Tây Độc",
    "origin_name": "Eastern Heretic And Western Venom",
    "slug": "hoa-son-luan-kiem-dong-ta-tay-doc",
    "poster_url": "https://phimimg.com/upload/vod/20250801-1/e719685db54ac7994aa76e1bff229b8e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250801-1/8f5af6974e53b3b030030fab7005a18f.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Cổ Trang",
        "slug": "co-trang",
        "id": "3a17c7283b71fa84e5a8d76fb790ed3e"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "2e976ab88a42d723d9f2ee6027b707f5",
    "name": "Nọc Rắn",
    "origin_name": "Venom",
    "slug": "noc-ran",
    "poster_url": "https://phimimg.com/upload/vod/20231210-1/4adebad1055c4c6b53cb8a8ed790d892.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231210-1/5a76d9259ffed49519444122b433e360.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Thuyết Minh",
    "category": [
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "e48a900a95c8e0a3db31da9fbad6866e",
    "name": "Nọc Độc Tử Thần",
    "origin_name": "Silent Venom",
    "slug": "noc-doc-tu-than",
    "poster_url": "https://phimimg.com/upload/vod/20231202-1/9fbfe14af6fd0a394d4fc4037d7522b8.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231202-1/9fbfe14af6fd0a394d4fc4037d7522b8.jpg",
    "year": 2009,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "b42642e0e25d857ec10edd4bae859d1b",
    "name": "Cuộc Tàn Sát Bóng Đêm",
    "origin_name": "Night Carnage",
    "slug": "cuoc-tan-sat-bong-dem",
    "poster_url": "https://phimimg.com/upload/vod/20250808-1/9b5a4cf710bfc6cfd94b8864d90b47bc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250808-1/87ab1baff9560543544c9e3823eadce2.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "7e62803da514f1a8bd1437eb1b79c040",
    "name": "Khẩu Chiến",
    "origin_name": "Carnage",
    "slug": "khau-chien",
    "poster_url": "https://phimimg.com/upload/vod/20240104-1/f68ae49c7f4833600c17b921464edd21.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240104-1/fde471a5bce933acabd5c6f72bcc2788.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "1c6a0198177bfcc9bd93f6aab94aad3c",
    "name": "Ma Cà Rồng Morbius",
    "origin_name": "Morbius",
    "slug": "ma-ca-rong-morbius",
    "poster_url": "https://phimimg.com/upload/vod/20250823-1/73f768524ea6fd22fb45261a00c8bdcc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250823-1/9a40af0c2275c629e647828d24b8c317.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "spiderman"
  },
  {
    "_id": "a1ac769a261b4ac11e1fd4fd33b2ae8b",
    "name": "Hulk Hogan: Real American",
    "origin_name": "Hulk Hogan: Real American",
    "slug": "hulk-hogan-real-american",
    "poster_url": "https://phimimg.com/upload/vod/20260428-1/2662f138e696424753eed57125d4413d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260428-1/02518c74dcc80e96bcd6cb99bfc0c604.jpg",
    "year": 2026,
    "episode_current": "Hoàn Tất (4/4)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Tài Liệu",
        "slug": "tai-lieu",
        "id": "1645fa23fa33651cef84428b0dcc2130"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "a41acbd3ffd616b5fd306761bb865d23",
    "name": "Hulk Vs.",
    "origin_name": "Hulk Vs.",
    "slug": "hulk-vs",
    "poster_url": "https://phimimg.com/upload/vod/20231231-1/58c0d10cdf4618dd07a35443d1b4d734.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231231-1/ca7cd42c48148c000aef5c5e531d3ff6.jpg",
    "year": 2009,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "1a37546d1929c0ff3ca32d2ddacc41a9",
    "name": "Hulk: Người Khổng Lồ Xanh",
    "origin_name": "Hulk",
    "slug": "hulk-nguoi-khong-lo-xanh",
    "poster_url": "https://phimimg.com/upload/vod/20231125-1/4c87272c276aa430aa86c1b1d40c0681.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231125-1/e6c898a539c1339cf27f7b446d4cf65e.jpg",
    "year": 2003,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "59532cbbc31efd88a06ac63d294279db",
    "name": "Nữ Khổng Lồ Xanh",
    "origin_name": "She-Hulk: Attorney At Law",
    "slug": "nu-khong-lo-xanh",
    "poster_url": "https://phimimg.com/upload/vod/20240418-1/4936faa0db2a65e021a6f701e266697f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240418-1/1ab47fc8e8bd9aff05e6aa95813c3fd0.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (9/9)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "a5909bff60540745d3da1ccda2f99bff",
    "name": "Người Khổng Lồ Xanh 1977",
    "origin_name": "The Incredible Hulk",
    "slug": "nguoi-khong-lo-xanh-1977",
    "poster_url": "https://phimimg.com/upload/vod/20231209-1/cd79fdad3c9e29cc55167c26e0e39f5c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231209-1/48bc1734c9894dbed476743e63c4d016.jpg",
    "year": 1977,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "a11f9e533f28593768ebf87075ab34f2",
    "name": "Người Khổng Lồ Xanh Phi Thường",
    "origin_name": "The Incredible Hulk",
    "slug": "nguoi-khong-lo-xanh-phi-thuong",
    "poster_url": "https://phimimg.com/upload/vod/20231020-1/d032a0422019279076885d8b41c2cd2e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231020-1/f8f30edce05a0ef3495f9d6b65dbd0e1.jpg",
    "year": 2008,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "89f53faf95dedd155d17d200c2f2df2e",
    "name": "Doraemon: Nobita và Người Khổng Lồ Xanh",
    "origin_name": "Doraemon: Nobita and the Green Giant Legend",
    "slug": "doraemon-nobita-va-nguoi-khong-lo-xanh",
    "poster_url": "https://phimimg.com/upload/vod/20250521-1/63494f95ba57911f3f6a8e8d6ed66c06.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250521-1/6cac6d5c6085b0cd232d738aba3fec20.jpg",
    "year": 2008,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Lồng Tiếng + Thuyết Minh",
    "category": [
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
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
        "name": "Nhật Bản",
        "slug": "nhat-ban",
        "id": "d4097fbffa8f7149a61281437171eb83"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "072b030ba126b2f4b2374f342be9ed44",
    "name": "Bộ Tứ Siêu Đẳng",
    "origin_name": "Fantastic Four",
    "slug": "bo-tu-sieu-dang-2015",
    "poster_url": "https://phimimg.com/upload/vod/20230912-1/d0d204b1c53e473d5ae4f8d808d1be07.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230912-1/22e381f60682f1dd0c0c7f78361de03a.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "093f65e080a295f8076b1c5722a46aa2",
    "name": "Bộ Tứ Siêu Đẳng: Sứ Giả Bạc",
    "origin_name": "Fantastic Four: Rise of the Silver Surfer",
    "slug": "bo-tu-sieu-dang-su-gia-bac",
    "poster_url": "https://phimimg.com/upload/vod/20230912-1/c8aee8f475142816faaeaac478394176.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230912-1/3d5123604f2c848fc305a2542828b7ff.jpg",
    "year": 2007,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "66f041e16a60928b05a7e228a89c3799",
    "name": "Bộ Tứ Siêu Đẳng",
    "origin_name": "Fantastic Four",
    "slug": "bo-tu-sieu-dang-2005",
    "poster_url": "https://phimimg.com/upload/vod/20230912-1/85ab24dcbbc81ad028af739785aea1b1.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230912-1/e9b638eee0937169190cd65d39b33043.jpg",
    "year": 2005,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "b22c8dd80eaa4578ca19fc1c6e983da7",
    "name": "Bộ Tứ Siêu Đẳng: Bước Đi Đầu Tiên",
    "origin_name": "The Fantastic 4: First Steps",
    "slug": "bo-tu-sieu-dang-buoc-di-dau-tien",
    "poster_url": "https://phimimg.com/upload/vod/20250731-1/7aed471679716567816ac015ad586391.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250731-1/a5c1095978758ea02214ac005cecb377.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "b081b509da27866728d73c3f5d75ccaf",
    "name": "Daredevil: Tái Xuất (Phần 2)",
    "origin_name": "Daredevil: Born Again (Season 2)",
    "slug": "daredevil-tai-xuat-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20260325-1/7268bfab7c97370dad7a07d1c93ff834.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260325-1/4ba73b9444858633f1592a417fa2c0dc.jpg",
    "year": 2026,
    "episode_current": "Tập 8",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "542b9ce5413bbceea136fecb513df4c3",
    "name": "Daredevil: Tái Xuất (Phần 1)",
    "origin_name": "Daredevil: Born Again (Season 1)",
    "slug": "daredevil-tai-xuat-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20260325-1/0d99c8582577c164d7bd9d67108cb002.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250305-1/303eae75a310c312b12406a4e8448282.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (9/9)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "7cec85c75537840dad40251576e5b757",
    "name": "Daredevil: Hiệp Sĩ Mù",
    "origin_name": "Daredevil",
    "slug": "daredevil-hiep-si-mu",
    "poster_url": "https://phimimg.com/upload/vod/20240102-1/974b0616d9e986cf9f21b425a7d84f52.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240102-1/974b0616d9e986cf9f21b425a7d84f52.jpg",
    "year": 2003,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "eeb358fcbf46e89566ad3fe0707820a0",
    "name": "Siêu Nhân Mù",
    "origin_name": "Daredevil",
    "slug": "sieu-nhan-mu",
    "poster_url": "https://phimimg.com/upload/vod/20231211-1/89b791d5348cb5fab058052ecf408ad0.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231211-1/89b791d5348cb5fab058052ecf408ad0.jpg",
    "year": 2003,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "9752d873fa71c19dc602bf2a0696f9b5",
    "name": "Hiệp Sĩ Mù",
    "origin_name": "Daredevil",
    "slug": "hiep-si-mu",
    "poster_url": "https://phimimg.com/upload/vod/20231025-1/4c0c91bc52b10238d70712203601ea22.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231025-1/d41007995387c9bf90659a008fa26625.jpg",
    "year": 2003,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "6a6c0cd04de7972dbc0b62a3",
    "name": "The Punisher: Phát Súng Cuối Cùng",
    "origin_name": "The Punisher: One Last Kill",
    "slug": "the-punisher-phat-sung-cuoi-cung",
    "poster_url": "https://phimimg.com/uploads/movies/20260731/the-punisher-phat-sung-cuoi-cung-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260731/the-punisher-phat-sung-cuoi-cung-thumb.webp",
    "year": 2026,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "fd31e5cd85f0ec42b569b55b0b165d84",
    "name": "Kẻ Trừng Phạt (Phần 2)",
    "origin_name": "The Punisher (Season 2)",
    "slug": "ke-trung-phat-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20260513-1/0f0c3a8a71759fe0cbf01f9ec4f05227.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260513-1/bac4d1f29009e210b469da208ba25c6a.jpg",
    "year": 2019,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "7dd9884b559f0344c9254ce81e001ae4",
    "name": "Kẻ Trừng Phạt (Phần 1)",
    "origin_name": "The Punisher (Season 1)",
    "slug": "ke-trung-phat-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20260513-1/bc734cae8c0b5a89a52c12f6aef08a4a.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260513-1/ba9e8c60a809956d8c382ce38a24537d.jpg",
    "year": 2017,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "3968871ce7673ed3621a799f78f3e792",
    "name": "Thiên Tuần Giả",
    "origin_name": "The Devil Punisher",
    "slug": "thien-tuan-gia",
    "poster_url": "https://phimimg.com/upload/vod/20241118-1/226f6dd98245f65e235eee60cbd40b28.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241118-1/b57dbfc2bc78b3232d8b556ec0a04520.jpg",
    "year": 2020,
    "episode_current": "Hoàn Tất (20/20)",
    "quality": "FHD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Đài Loan",
        "slug": "dai-loan",
        "id": "559fea9881e3a6a3e374b860fa8fb782"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "dc1f1e86d49bb24cdec5c39d3f59143b",
    "name": "Kẻ Trừng Phạt: Vùng Chiến Sự",
    "origin_name": "Punisher: War Zone",
    "slug": "ke-trung-phat-vung-chien-su",
    "poster_url": "https://phimimg.com/upload/vod/20240108-1/d3eb1145305288f54c4f2d76de47fb50.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240108-1/fa800b160c8e4efe30122e411f717bcb.jpg",
    "year": 2008,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      },
      {
        "name": "Canada",
        "slug": "canada",
        "id": "445d337b5cd5de476f99333df6b0c2a7"
      },
      {
        "name": "Đức",
        "slug": "duc",
        "id": "24a5bf049aeef94ab79bad1f73f16b92"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "d210cf373cf002a04ec72ee395f66306",
    "name": "Kẻ Trừng Phạt",
    "origin_name": "The Punisher",
    "slug": "ke-trung-phat",
    "poster_url": "https://phimimg.com/upload/vod/20231024-1/697ebb383dabdb84be07b5e1883bb4ab.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231024-1/065b7ef7500fd63e5c172c41e8fab779.jpg",
    "year": 2004,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Đức",
        "slug": "duc",
        "id": "24a5bf049aeef94ab79bad1f73f16b92"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "ad349260e620cd077c06cc4d9144f55f",
    "name": "Phù Thủy Agatha",
    "origin_name": "Agatha All Along",
    "slug": "phu-thuy-agatha",
    "poster_url": "https://phimimg.com/upload/vod/20240920-1/a89c77993acc2463d820af6dfba4cdd0.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240920-1/fc946af9aaeb343ef9f393996049e05e.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (9/9)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "a97da629b098b75c294dffdc3e463904",
    "name": "What If",
    "origin_name": "What If",
    "slug": "what-if-2023",
    "poster_url": "https://phimimg.com/upload/vod/20230913-1/8a4e88b4be385dec4d5cf56ba55e0b22.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230913-1/4da9f83cf83b6b9c3be6774af1c8c9d7.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      }
    ],
    "country": [
      {
        "name": "Philippines",
        "slug": "philippines",
        "id": "77dab2f81a6c8c9136efba7ab2c4c0f2"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "721bc4c80edbce69921f70cb2d1920f1",
    "name": "Tam Mệnh",
    "origin_name": "What If",
    "slug": "tam-menh",
    "poster_url": "https://phimimg.com/upload/vod/20250619-1/a1724ee28dbfd96adce6ccc6b70a9cc2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250619-1/917c11e5154f0da6e8bc6079c6363066.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (12/12)",
    "quality": "FHD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Hồng Kông",
        "slug": "hong-kong",
        "id": "dcd5551cbd22ea2372726daafcd679c1"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "87b40a685b8d392c78eb59778f0ff2b5",
    "name": "Nếu Như…? (Mùa 3)",
    "origin_name": "What If...? (Season 3)",
    "slug": "neu-nhu-mua-3",
    "poster_url": "https://phimimg.com/upload/vod/20241225-1/0d38807cd3abf4635e893b92caf2aacc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241225-1/2dfc415cb3a1c6e8f3fd6077d83761f5.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "825ab77fe4eb3419db2fc9c6ceff7146",
    "name": "Tôi Sống Ở Nơi Khác",
    "origin_name": "What If",
    "slug": "toi-song-o-noi-khac",
    "poster_url": "https://phimimg.com/upload/vod/20240507-1/cf8abb4a6047e9616b3370fba9122f5e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240507-1/870f405cd889789a797387b2d6c72917.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (20/20)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "44788404a9a7eee60c80ad849e3efb7b",
    "name": "Nếu Như…? (Mùa 2)",
    "origin_name": "What If...? (Season 2)",
    "slug": "neu-nhu-mua-2",
    "poster_url": "https://phimimg.com/upload/vod/20240105-1/c8eef873633985cbdefd48f44432f0d9.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240105-1/439b0e4cbaca21f8424a3fe80b40989e.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (9/9)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "52c031e023c8a03f30f57246f9c3d4f9",
    "name": "Nếu Như…? (Mùa 1)",
    "origin_name": "What If...? (Season 1)",
    "slug": "neu-nhu-mua-1",
    "poster_url": "https://phimimg.com/upload/vod/20240105-1/2970bc48d0fa1833791ca964c8590dc1.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240105-1/6f14c5d3d6760054c444f89fd2e9b450.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (9/9)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "00e26af6ac3b1c1c49d7c3d79c60d000",
    "name": "Nếu Như…?",
    "origin_name": "What If...?",
    "slug": "neu-nhu-2021",
    "poster_url": "https://phimimg.com/upload/vod/20231006-1/585b9c054609c8528626063f2deefdec.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231006-1/f4f9031f173531b3546316b3d11dfacd.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (9/9)",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "ab3f9cab224141f869b28de5d0674580",
    "name": "Nếu Như",
    "origin_name": "What If",
    "slug": "neu-nhu-2013",
    "poster_url": "https://phimimg.com/upload/vod/20231109-1/e31ecaf7cb07132b9bd04f40f3280125.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231109-1/ad69a60e48a52adff1d1cf9198e89b3c.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "a9b7ba70783b617e9998dc4dd82eb3c5",
    "name": "Cuộc Xâm Lược Bí Mật",
    "origin_name": "Secret Invasion",
    "slug": "cuoc-xam-luoc-bi-mat",
    "poster_url": "https://phimimg.com/upload/vod/20230929-1/5d3b12cfe5129c13457ca1980a284834.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230929-1/da20ac896f2a5a77b0d8746cf1a70a7a.jpg",
    "year": 2023,
    "episode_current": "Hoàn tất (6/6)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "861e8bae74e22a572164fdb59b1caa8b",
    "name": "Trang Trại Echo Valley",
    "origin_name": "Echo Valley",
    "slug": "trang-trai-echo-valley",
    "poster_url": "https://phimimg.com/upload/vod/20250614-1/690b7e3bae414a4c366f4b1d0d82b0e3.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250614-1/67079837e4e1db2a4a8bb9508f0bd045.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "8e695f42b94d9a6ce647a0232d1b7c59",
    "name": "Echo 3",
    "origin_name": "Echo 3",
    "slug": "echo-3",
    "poster_url": "https://phimimg.com/upload/vod/20240418-1/5cb9cd262ebe50350bca3f24672416f6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240418-1/cbc3f30179a223d102f8d5178f4c2799.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "776a26e444979d5cd460744ae7ad4932",
    "name": "Echo",
    "origin_name": "Echo",
    "slug": "echo",
    "poster_url": "https://phimimg.com/upload/vod/20240111-1/f002cff4832305451f3b27a86feebea6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240111-1/ee1b8d6039ffeb7049d9010eb009feeb.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (5/5)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "7318eebbea30cea9561c1edfbf3a3451",
    "name": "Góc Tối Nhân Bản",
    "origin_name": "Orphan Black: Echoes",
    "slug": "goc-toi-nhan-ban",
    "poster_url": "https://phimimg.com/upload/vod/20260624-1/95306f54f4f39c93a66c6fca28c57ac2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260624-1/a5b24deb3ecb5891b80f4cc1e1263db2.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
        "name": "Canada",
        "slug": "canada",
        "id": "445d337b5cd5de476f99333df6b0c2a7"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "8c95f9565907b45c33de1c736be8cbda",
    "name": "Chẩm Hồng Trang",
    "origin_name": "Echoes Of Love",
    "slug": "cham-hong-trang",
    "poster_url": "https://phimimg.com/upload/vod/20260309-1/f7032bb84e5634288981956e5c7d7c33.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260309-1/237470dff7f7e995efeb684e116bf0fc.jpg",
    "year": 2026,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Cổ Trang",
        "slug": "co-trang",
        "id": "3a17c7283b71fa84e5a8d76fb790ed3e"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "2e904afa80a8ca949f187f64ff2d15b2",
    "name": "Tội Án Hằn Tích (Dấu Vết Tội Ác)",
    "origin_name": "Echoes Of Evidence",
    "slug": "toi-an-han-tich-dau-vet-toi-ac",
    "poster_url": "https://phimimg.com/upload/vod/20260524-1/87a88eed1c0fc2c525f8a90fcac8e102.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260524-1/2529705168c8822656c75bef862b80e1.jpg",
    "year": 2026,
    "episode_current": "Hoàn Tất (25/25)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
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
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "a1a9310fb733cdd49c0808731b68c048",
    "name": "Có Một Lá Thư Gửi Từ Thành Phố Cảng",
    "origin_name": "Echoes Of Gang City",
    "slug": "co-mot-la-thu-gui-tu-thanh-pho-cang",
    "poster_url": "https://phimimg.com/upload/vod/20260424-1/f67fcad1c1757fb69db83171f8d50acc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260424-1/42d8ab09e1c1a74eb88290ce759cb335.jpg",
    "year": 2026,
    "episode_current": "Hoàn Tất (28/28)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "ef246753a70fce661e16668898810624",
    "name": "Tám Nghìn Dặm Đường Mây Và Trăng",
    "origin_name": "Echoes Of A Thousand Moons",
    "slug": "tam-nghin-dam-duong-may-va-trang",
    "poster_url": "https://phimimg.com/upload/vod/20260411-1/25080e45410b1d8aae29adc7c6d3c136.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260411-1/6675afdbb380e65c1425bbc8b5c79947.jpg",
    "year": 2026,
    "episode_current": "Hoàn Tất (40/40)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "08b41ec0a7a71415ee6b932e222d8af3",
    "name": "Tam Nhân Hành",
    "origin_name": "The Triple Echo Of Time",
    "slug": "tam-nhan-hanh-2025",
    "poster_url": "https://phimimg.com/upload/vod/20251120-1/963a4c28736494dca25350e6d1e08bd6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20251120-1/1bca5cfc3f349cd16823851764293fc9.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (24/24)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "9c300b9f50804a3f7d559bf20f64a1c8",
    "name": "Vọng Âm Nơi Cố Đô Đã Mất (Phadaeng Nang Ai)",
    "origin_name": "Echoes Of The Lost City",
    "slug": "vong-am-noi-co-do-da-mat-phadaeng-nang-ai",
    "poster_url": "https://phimimg.com/upload/vod/20250717-1/c808b7ce358a3ffbf7f47fe3217dad7e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250717-1/ee986c9fac2f9a3f6e67d84af97ad194.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (38/38)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Thái Lan",
        "slug": "thai-lan",
        "id": "cefbf1640a17bad1e13c2f6f2a811a2d"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "1eb4505084d87118b8c710ac96b97cb2",
    "name": "Khúc Từ Biệt Trước Gương",
    "origin_name": "Echoes Of The Self",
    "slug": "khuc-tu-biet-truoc-guong",
    "poster_url": "https://phimimg.com/upload/vod/20250921-1/d0b150c300424223c6124bb4c1526fff.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250921-1/a3fecf59627620c4f79879354be8d6ca.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Cổ Trang",
        "slug": "co-trang",
        "id": "3a17c7283b71fa84e5a8d76fb790ed3e"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "dabec13d9ab3d2f9054e435162755ff8",
    "name": "Tiếng Vọng Của Người Sống Sót: Thảm Án Tại Hàn Quốc",
    "origin_name": "The Echoes Of Survivors: Inside Korea's Tragedies",
    "slug": "tieng-vong-cua-nguoi-song-sot-tham-an-tai-han-quoc",
    "poster_url": "https://phimimg.com/upload/vod/20250817-1/e977dbedbd739274d4bc680dc9a720c4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250817-1/b9854bd980287430bc9cdc2c2322ed15.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Tài Liệu",
        "slug": "tai-lieu",
        "id": "1645fa23fa33651cef84428b0dcc2130"
      }
    ],
    "country": [
      {
        "name": "Hàn Quốc",
        "slug": "han-quoc",
        "id": "05de95be5fc404da9680bbb3dd8262e6"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "5f679cac1ebdeda165eb49cc3015fd9e",
    "name": "Huyễn Nhạc Sâm Lâm",
    "origin_name": "Echo Of Her Voice",
    "slug": "huyen-nhac-sam-lam",
    "poster_url": "https://phimimg.com/upload/vod/20240922-1/cc743c9408eb98a6b275208dbf3e96e2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240922-1/711d06f2fc43a49c195faccb7b79245b.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (24/24)",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Cổ Trang",
        "slug": "co-trang",
        "id": "3a17c7283b71fa84e5a8d76fb790ed3e"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "19415392e1213854f465b52ba2abf0ed",
    "name": "Tiếng vọng của quá khứ",
    "origin_name": "Echoes of the Past",
    "slug": "tieng-vong-cua-qua-khu",
    "poster_url": "https://phimimg.com/upload/vod/20241208-1/991fed3f952e0cad9cccd9bc2666ebd6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241208-1/8307984c411b91bb572558e0281085b3.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Ai Cập",
        "slug": "ai-cap",
        "id": "293b99c02ff5616c67be8a23dd5b20a3"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "0b1a888bc5720fc6b2a1585f802f6964",
    "name": "Tiếng Vọng",
    "origin_name": "Echoes",
    "slug": "tieng-vong",
    "poster_url": "https://phimimg.com/upload/vod/20240302-1/4cf5e1b2dad49b1ed0c22b50d1fc94bf.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240302-1/0ce6da5c397435a5b57a8ef4fdcbf33e.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (7/7)",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "72fa288df9f22f7167dff80cf89fd4e5",
    "name": "Tiếng Vọng",
    "origin_name": "Echo",
    "slug": "tieng-vong-2023",
    "poster_url": "https://phimimg.com/upload/vod/20240302-1/1a19f9ef58e3e651dc924dcc9ac35166.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240302-1/5dad4aa809de332b980dfa09e321ba99.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "9806b902e654c2ddd3b611099436037a",
    "name": "Ký Ức Ảo Giác",
    "origin_name": "Stir Of Echoes",
    "slug": "ky-uc-ao-giac",
    "poster_url": "https://phimimg.com/upload/vod/20231231-1/01500bfb2d4994716e54f250c3583eb4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231231-1/38166c5347f150438024e7dc3cad2fe2.jpg",
    "year": 1999,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "79385312dbee4c9e7270b26e4b3e1459",
    "name": "Ký Ức Ảo Giác",
    "origin_name": "Stir of Echoes",
    "slug": "ky-uc-ao-giac-1999",
    "poster_url": "https://phimimg.com/upload/vod/20231116-1/caee7128ada79762c2a0eb676a51e7ac.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231116-1/792d51dc02dc39dcc5154dc80f0f367c.jpg",
    "year": 1999,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "98c56bce74669e2e4e7a9fc1caa8c326",
    "name": "Quả Bom Hẹn Giờ",
    "origin_name": "Double Echo",
    "slug": "qua-bom-hen-gio",
    "poster_url": "https://phimimg.com/upload/vod/20231111-1/d8ddec319f5ac0f01fd5587cc4bd15f9.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231111-1/9d2b61f7975aa00f33d08e5e5a9d1a1d.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "da974f5eba1948690c83e9c3b43ffd87",
    "name": "Giải Cứu Sinh Vật Ngoài Hành Tinh",
    "origin_name": "Earth to Echo",
    "slug": "giai-cuu-sinh-vat-ngoai-hanh-tinh",
    "poster_url": "https://phimimg.com/upload/vod/20231109-1/7e529de019c36d3350b06896d8ce3e64.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231109-1/e122a9c574b66f7cab75d96f2324f919.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  }
];

export const DC_UNIVERSE_FILMS: UniverseFilmItem[] = [
  {
    "_id": "23ec38142979c30e9845a4c845c59397",
    "name": "Batman: Sự Sụp Đổ Của Hiệp Sĩ - Phần 1",
    "origin_name": "Batman: Knightfall Part 1: Knightfall",
    "slug": "batman-su-sup-do-cua-hiep-si-phan-1",
    "poster_url": "https://phimimg.com/uploads/movies/20260828/batman-su-sup-do-cua-hiep-si-phan-1-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260828/batman-su-sup-do-cua-hiep-si-phan-1-thumb.webp",
    "year": 2026,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "id": "d9983d88d8929b1d9f767884e2999e27",
        "name": "Hoạt Hình",
        "slug": "hoat-hinh"
      },
      {
        "id": "9822be111d2ccc29c7172c78b8af8ff5",
        "name": "Hành Động",
        "slug": "hanh-dong"
      },
      {
        "id": "66c78b23908113d478d8d85390a244b4",
        "name": "Phiêu Lưu",
        "slug": "phieu-luu"
      },
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
        "id": "7a035ac0b37f5854f0f6979260899c90",
        "name": "Hình Sự",
        "slug": "hinh-su"
      },
      {
        "id": "37a7b38b6184a5ebd3c43015aa20709d",
        "name": "Chính Kịch",
        "slug": "chinh-kich"
      }
    ],
    "country": [
      {
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a",
        "name": "Âu Mỹ",
        "slug": "au-my"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "4423df30c2370b6c952d07397078b3ae",
    "name": "Batman Aztec: Đế Chế Huyết Chiến",
    "origin_name": "Aztec Batman: Clash Of Empires",
    "slug": "batman-aztec-de-che-huyet-chien",
    "poster_url": "https://phimimg.com/upload/vod/20250924-1/ede19fa45c2cddb3180bf74e12b6fe3d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250924-1/d4248a45bb568961ac921c364cd7d445.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
      },
      {
        "name": "Mexico",
        "slug": "mexico",
        "id": "8dbb07a18d46f63d8b3c8994d5ccc351"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "1cfcf0911a356ff7dec8682d2c5cdbaa",
    "name": "Batman Ninja Đối Đầu Liên Minh Yakuza",
    "origin_name": "Batman Ninja vs. Yakuza League",
    "slug": "batman-ninja-doi-dau-lien-minh-yakuza",
    "poster_url": "https://phimimg.com/upload/vod/20250328-1/844101bcb965fcf508838d4b9356649c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250328-1/7e743bf2f82e6a4383f9add3ac5fdec0.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Nhật Bản",
        "slug": "nhat-ban",
        "id": "d4097fbffa8f7149a61281437171eb83"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "bfdbc88767ec7e391c7ceb9dd747f440",
    "name": "Batman: Gotham Knight",
    "origin_name": "Batman: Gotham Knight",
    "slug": "batman-gotham-knight",
    "poster_url": "https://phimimg.com/upload/vod/20240207-1/11169aaa7809ed3af3ce553fe300302e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240207-1/964ca7695fa02a2f1725ccf96117627a.jpg",
    "year": 2008,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "3493d96f8fcb16313a77ecfd294734c9",
    "name": "Batman: Bí Ẩn Dơi Nữ",
    "origin_name": "Batman: Mystery Of The Batwoman",
    "slug": "batman-bi-an-doi-nu",
    "poster_url": "https://phimimg.com/upload/vod/20240207-1/fee39baa4ebeab6b1510f81fffe67ec3.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240207-1/808831194fceaefdf7835d6e8e0a8f98.jpg",
    "year": 2003,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "ca886eb9edb61a42256192745c72cd79",
    "name": "Batman Unlimited: Bản Năng Thú Tính",
    "origin_name": "Batman Unlimited: Animal Instincts",
    "slug": "batman-unlimited-ban-nang-thu-tinh",
    "poster_url": "https://phimimg.com/upload/vod/20231211-1/a70d220f78feb22840f72e2feb80420a.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231211-1/89b79126823c60580a55c2cdd7e8b272.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "62ce4772adc0fbeae29391fc0e22509c",
    "name": "Batman: Arkham Thất Thủ",
    "origin_name": "Batman: Assault on Arkham",
    "slug": "batman-arkham-that-thu",
    "poster_url": "https://phimimg.com/upload/vod/20231201-1/87f02232382cfb5fa6fba076f6517f3b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231201-1/7e3161f7efd5568f9dcf98a4bc96f6f6.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "3f24bb08a5741e4197af64e1f93a5029",
    "name": "Lego Batman: The Movie - DC Super Heroes Unite",
    "origin_name": "Lego Batman: The Movie - DC Super Heroes Unite",
    "slug": "lego-batman-the-movie-dc-super-heroes-unite",
    "poster_url": "https://phimimg.com/upload/vod/20231129-1/7d08317292e3081b0dfe5ed15b8300f6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231129-1/4ab404af98a3bc999b57db2f6d876032.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "7716d0fc31636914783865d34f6cdfd5",
    "name": "Batman: Mặt Nạ Ma",
    "origin_name": "Batman: Mask Of The Phantasm",
    "slug": "batman-mat-na-ma",
    "poster_url": "https://phimimg.com/upload/vod/20231108-1/cd9c34d207c862fe6ee81ff455af36d3.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231108-1/977449c01ec87ccda0b95bb592d06ea8.jpg",
    "year": 1993,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "f6185f0ef02dcaec414a3171cd01c697",
    "name": "Batman và Superman: Trận Chiến của Các Anh Hùng Nhí",
    "origin_name": "Batman and Superman: Battle of the Super Sons",
    "slug": "batman-va-superman-tran-chien-cua-cac-anh-hung-nhi",
    "poster_url": "https://phimimg.com/upload/vod/20231023-1/93bb31b1bd7a8a8d7d8911f3c2dd5e03.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231023-1/943776dd514ff428e155ade5b7f29bba.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "577fd60255d4bb0f466464849ffe6d8e",
    "name": "Câu Chuyện Lego Batman",
    "origin_name": "The Lego Batman Movie",
    "slug": "cau-chuyen-lego-batman",
    "poster_url": "https://phimimg.com/upload/vod/20231023-1/9d8f882ddd757634ae19028b8ca2c020.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231023-1/59272e776cb42561111ac7882e2b28fe.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Đan Mạch",
        "slug": "dan-mach",
        "id": "208c51751eff7e1480052cdb4e26176a"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "b38e5ff5f816ac6e4169bce9314b2996",
    "name": "Batman: Trò Đùa Chết Chóc",
    "origin_name": "Batman: The Killing Joke",
    "slug": "batman-tro-dua-chet-choc",
    "poster_url": "https://phimimg.com/upload/vod/20231023-1/f0f3615c4530d124f226368b459a0773.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231023-1/b7ab65090b9e3e85f5565695a26f409a.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "14ea0d5b0cf49525d1866cb1e95ada5d",
    "name": "Batman Đại Chiến Superman: Ánh Sáng Công Lý",
    "origin_name": "Batman v Superman: Dawn of Justice",
    "slug": "batman-dai-chien-superman-anh-sang-cong-ly",
    "poster_url": "https://phimimg.com/upload/vod/20231019-1/015a7255e2786e93e6a8df5d03e62264.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231019-1/40b2cd75b8405b51f42a912d53532515.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "8562ae5e286544710b2e7ebe9858833b",
    "name": "Batman: Sự Trở Lại Của Joker",
    "origin_name": "Batman Beyond: Return of the Joker",
    "slug": "batman-su-tro-lai-cua-joker",
    "poster_url": "https://phimimg.com/upload/vod/20231016-1/96da4f66afa2b54fb09a822ab914f8e6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231016-1/97b1d855c248435d2402e7ebf5185b76.jpg",
    "year": 2000,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "41f59478b82ac344e8f8e229d8e080f3",
    "name": "Pennyworth: Nguồn Gốc Quản Gia Của Người Dơi (Phần 3)",
    "origin_name": "Pennyworth: The Origin of Batman's Butler (Season 3)",
    "slug": "pennyworth-nguon-goc-quan-gia-cua-nguoi-doi-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20260531-1/ca8b815b41daa8189d4260efdc27bffe.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260531-1/081794eeb2702367f2a8413e5e94d8ed.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "7af1e47458962fa10f52faeef3319119",
    "name": "Người Dơi: Ngày Tàn Của Gotham",
    "origin_name": "Batman: The Doom That Came To Gotham",
    "slug": "nguoi-doi-ngay-tan-cua-gotham",
    "poster_url": "https://phimimg.com/upload/vod/20240227-1/a4d1b8f983e28dfea6da15a2c1e3d872.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240227-1/96dbbaf646db678c21a916723634725d.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "26a95b3bf6c0fa4ba909250facfb5ae9",
    "name": "Hậu Duệ Người Dơi",
    "origin_name": "Son Of Batman",
    "slug": "hau-due-nguoi-doi",
    "poster_url": "https://phimimg.com/upload/vod/20240111-1/6b29fd3a195f338f5ef96fd8d7e715b9.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240111-1/4370c204df8cd2665e693824bce4f946.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "c1fcffd51eb7c38b7209a6106d66cc84",
    "name": "Người Dơi Và Harley Quinn",
    "origin_name": "Batman And Harley Quinn",
    "slug": "nguoi-doi-va-harley-quinn",
    "poster_url": "https://phimimg.com/upload/vod/20240104-1/9eb30d07903aee3fca18ebc49d4a8198.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240104-1/74fb20e1bffc2f6b4ae54b3368878b54.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "5fb37d5bbdbbae16dea2f3104d7f9439",
    "name": "Người Dơi Lego: Vấn Đề Gia Đình",
    "origin_name": "LEGO DC Batman: Family Matters",
    "slug": "nguoi-doi-lego-van-de-gia-dinh",
    "poster_url": "https://phimimg.com/upload/vod/20240102-1/f728cb3a2f84e2d5558288def6e782f5.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240102-1/32074bb14e2c82051be29fc7840b029a.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "aae094199bf30b0b1a58e8ec1bbad5ec",
    "name": "Người Dơi: Mối Hận Thù",
    "origin_name": "Batman: Bad Blood",
    "slug": "nguoi-doi-moi-han-thu",
    "poster_url": "https://phimimg.com/upload/vod/20240102-1/3ab7722f6c3db17283bdd8ee068cfb56.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240102-1/93bfa7df70107c81399c7d3896db8a57.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "d6f1dd034aabde7657e6680444ceff62",
    "name": "Siêu Nhân Và Người Dơi: Khải Huyền",
    "origin_name": "Superman Batman: Apocalypse",
    "slug": "sieu-nhan-va-nguoi-doi-khai-huyen",
    "poster_url": "https://phimimg.com/upload/vod/20240102-1/7fd2268ed3b18251462797b9e972cd64.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240102-1/710a8217e2213920461ab8ccedd70939.jpg",
    "year": 2010,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "7792b558ca0c76d24d695582021ac501",
    "name": "Người Dơi: Gotham Của Gaslight",
    "origin_name": "Batman: Gotham By Gaslight",
    "slug": "nguoi-doi-gotham-cua-gaslight",
    "poster_url": "https://phimimg.com/upload/vod/20231215-1/640823b5fdad0b3881e5277d47739fe2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231215-1/e44476cd8a090c6271efd5b1437bbdaf.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "94cdbdb84e8e1de8a725fa2ed61498a4",
    "name": "Liên Minh Người Dơi Và Ninja Rùa",
    "origin_name": "Batman Vs. Teenage Mutant Ninja Turtles",
    "slug": "lien-minh-nguoi-doi-va-ninja-rua",
    "poster_url": "https://phimimg.com/upload/vod/20231214-1/e5d2a21cf2a6e4d644e7f0c090d5ee55.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231214-1/03ee7460ffd302f5288133ad7cd90778.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "722a7c7bd524abea0323c6ee7e2f8dcf",
    "name": "Người Dơi: Sát thủ Joke",
    "origin_name": "Batman: The Killing Joke",
    "slug": "nguoi-doi-sat-thu-joke",
    "poster_url": "https://phimimg.com/upload/vod/20231212-1/8e4fe98febadd47c2ff6a67115334b4c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231212-1/3d3801e809a2e70ffb793b87d12fe4c9.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "ca5fbbbddd0c0ff6c01f782c60c9d1b5",
    "name": "Siêu Nhân Và Người Dơi: Kẻ Thù Quốc Gia",
    "origin_name": "Superman - Batman: Public Enemies",
    "slug": "sieu-nhan-va-nguoi-doi-ke-thu-quoc-gia",
    "poster_url": "https://phimimg.com/upload/vod/20231211-1/5656c7734256ebb61ef07da22642fcf9.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231211-1/3b9c842ff217e276e1c3ef6afec7f8c0.jpg",
    "year": 2009,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "8ad3c1db0f3411d9825cb088de789857",
    "name": "Người Dơi: Đêm Trường Halloween",
    "origin_name": "Batman: The Long Halloween",
    "slug": "nguoi-doi-dem-truong-halloween",
    "poster_url": "https://phimimg.com/upload/vod/20231211-1/a12cd99a9a696aa8e1926ce3965a65b7.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231211-1/92d54f6e90d1b8114c1360c40f335d9d.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "d5ab8dc7ef67ca92e41d730982c5c602",
    "name": "Người Dơi: Ác Nhân Bí Ẩn",
    "origin_name": "Batman: Hush",
    "slug": "nguoi-doi-ac-nhan-bi-an",
    "poster_url": "https://phimimg.com/upload/vod/20231208-1/bc7f0214904001c1a18e4e144135d510.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231208-1/25092b15df59dd443d666acedd7ac18d.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "6b1a864b240fc77e3a901e3470b243f9",
    "name": "Người Dơi: Đêm Trường Halloween 2",
    "origin_name": "Batman: The Long Halloween 2",
    "slug": "nguoi-doi-dem-truong-halloween-2",
    "poster_url": "https://phimimg.com/upload/vod/20231207-1/d0d63a54dcdd0e8ff5f91dc2158d59f9.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231207-1/f32642d45ecda4d623715e32cebad1cb.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "7fc346397dc202259f27edc7d2adec88",
    "name": "Người Dơi: Kỵ Sĩ Bóng Đêm Trở Lại, Phần 1",
    "origin_name": "Batman: The Dark Knight Returns, Part 1",
    "slug": "nguoi-doi-ky-si-bong-dem-tro-lai-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20231202-1/5f93453a81b0581c475cda0321f53d57.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231202-1/2f54aa765727d6e091b99eec3c467e8d.jpg",
    "year": 2012,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "0d46839f6371fb84f6b6c682f5fc2c77",
    "name": "Người Dơi: Đêm Trường Halloween, Phần 2",
    "origin_name": "Batman: The Long Halloween, Part Two",
    "slug": "nguoi-doi-dem-truong-halloween-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20231129-1/cd30035e4ac1f7503401aede8608d12c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231129-1/6cbe5a253f7b1a5ef61cd25f8403708f.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "aebf7782a3d445f43cf30ee2c0d84dee",
    "name": "Người Dơi",
    "origin_name": "The Batman",
    "slug": "nguoi-doi-2022",
    "poster_url": "https://phimimg.com/upload/vod/20231018-1/6ca3f656e2cb638938dacd7ba3a3865d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231018-1/e58014050ad6ce7fbed8c3932b615073.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "88ccf9a98e8519b2011df33952832f2f",
    "name": "Người Dơi Đại Chiến Với Hai-Mặt",
    "origin_name": "Batman vs. Two-Face",
    "slug": "nguoi-doi-dai-chien-voi-haimat",
    "poster_url": "https://phimimg.com/upload/vod/20231120-1/b474c50ae5091cd73a4a14b90d1a78a9.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231120-1/e0cc11a9bbe31dc730a5d0137847b0bb.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "cf8c9be2a4508a24ae92c9d3d379131d",
    "name": "Người Dơi Và Bá Tước Dracula",
    "origin_name": "The Batman vs. Dracula",
    "slug": "nguoi-doi-va-ba-tuoc-dracula",
    "poster_url": "https://phimimg.com/upload/vod/20231113-1/8167f4b7221a4b2ba1da1802d6405b86.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231113-1/527cf097e32518a0023a750a1bfe660a.jpg",
    "year": 2005,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Giả Tượng",
        "slug": "gia-tuong",
        "id": "97e7ed4c52ce3737e18bdf0bd1331ce8"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "0b9e57c46de934cee33b0e8d1839bfc2",
    "name": "LEGO DC:  Người Dơi Và Vấn Đề Đại Gia Đình",
    "origin_name": "Lego DC Batman: Family Matters",
    "slug": "lego-dc-nguoi-doi-va-van-de-dai-gia-dinh",
    "poster_url": "https://phimimg.com/upload/vod/20231113-1/11181949396be177b6a8300248900ba3.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231113-1/654947e41640150e936b766bda5c47fe.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
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
      }
    ],
    "country": [
      {
        "name": "Đan Mạch",
        "slug": "dan-mach",
        "id": "208c51751eff7e1480052cdb4e26176a"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "0f65caf0a7d00afd2b87c028e88fe931",
    "name": "Người Dơi: Linh Hồn Của Rồng",
    "origin_name": "Batman: Soul of the Dragon",
    "slug": "nguoi-doi-linh-hon-cua-rong",
    "poster_url": "https://phimimg.com/upload/vod/20231109-1/ad193edef5cd856b13cab72620678e3d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231109-1/eb059e365e6592714d39d01184277b91.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Giả Tượng",
        "slug": "gia-tuong",
        "id": "97e7ed4c52ce3737e18bdf0bd1331ce8"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "f06ae085fe74cd78ad5e89496b197fe1",
    "name": "Người Dơi: Trận Chiến Những Kẻ Khổng Lồ",
    "origin_name": "Batman Unlimited: Mechs vs. Mutants",
    "slug": "nguoi-doi-tran-chien-nhung-ke-khong-lo",
    "poster_url": "https://phimimg.com/upload/vod/20231108-1/82465fcd35150a5d59362fefda53846e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231108-1/18d3d288d4a694d1391f22c4d50c4303.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "a5ff5d4b0a0d7b3e4d64147037d8c344",
    "name": "Người Dơi Ninja",
    "origin_name": "Batman Ninja",
    "slug": "nguoi-doi-ninja",
    "poster_url": "https://phimimg.com/upload/vod/20231107-1/f5722e560ee46dcec4fef080b1f411b1.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231107-1/5ac2250f34b0bcd1a29b48bf9bcb9aae.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
        "name": "Nhật Bản",
        "slug": "nhat-ban",
        "id": "d4097fbffa8f7149a61281437171eb83"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "ab24cd2b811ee48a416fc7a833d736a9",
    "name": "Người Dơi: Quái Vật Nổi Loạn",
    "origin_name": "Batman Unlimited: Monster Mayhem",
    "slug": "nguoi-doi-quai-vat-noi-loan",
    "poster_url": "https://phimimg.com/upload/vod/20231107-1/f1c95e8e33a564925f844326634f5f7f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231107-1/435cd7e22d2551a4d2e596a78a27f165.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "0e3e75d3095f3746ec2531e0bf543a5c",
    "name": "Kỵ Sĩ Bóng Đêm",
    "origin_name": "The Dark Knight",
    "slug": "ky-si-bong-dem",
    "poster_url": "https://phimimg.com/upload/vod/20240104-1/2cae46be24f514793c9e873f6de0fc32.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240104-1/b2748e456090a1c43b246c014b60fa1a.jpg",
    "year": 2008,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      },
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "8791dd6302cbe8cd557209ff026d8e08",
    "name": "Kỵ Sĩ Bóng Đêm Trỗi Dậy",
    "origin_name": "The Dark Knight Rises",
    "slug": "ky-si-bong-dem-troi-day",
    "poster_url": "https://phimimg.com/upload/vod/20231212-1/0944b2a5a2d6c69489f5d686691c5d4b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231212-1/68a89cc3ceb09c5280393df200682b4d.jpg",
    "year": 2012,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "4cdcf18ba72a7b28dc405b992f8cddcd",
    "name": "Kỵ Sĩ Bóng Đêm Trở Lại (Phần 2)",
    "origin_name": "Batman: The Dark Knight Returns, Part 2",
    "slug": "ky-si-bong-dem-tro-lai-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20231208-1/c441ab0f0a6dc2e62a2722f236b5c899.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231208-1/e512ceebe82fd16a48cf60d74843abd1.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "573eec40e4ef4f2089531dd5cbf629f8",
    "name": "Nguời Dơi: Kỵ Sĩ Bóng Đêm Trở Lại, Phần 2",
    "origin_name": "Batman: The Dark Knight Returns, Part 2",
    "slug": "nguoi-doi-ky-si-bong-dem-tro-lai-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20231023-1/d5ff1f10912a981c8f7a57fae1ccfd69.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231023-1/867756a712e0d86696f708c6c6ee99ff.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Khoa Học",
        "slug": "khoa-hoc",
        "id": "0bcf4077916678de9b48c89221fcf8ae"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "92bbd31f8e0e43a7da8a6295b251725f",
    "name": "Người Dơi: Kỵ Sĩ Bóng Đêm",
    "origin_name": "The Dark Knight",
    "slug": "nguoi-doi-ky-si-bong-dem",
    "poster_url": "https://phimimg.com/upload/vod/20231018-1/a41308af925ad176a3e88b90e4c5d6e8.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231018-1/ed5564edd98ab92763a06ce477ef4b5d.jpg",
    "year": 2008,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "6a616d777e12aa9c710edb7b",
    "name": "Những Cuộc Phiêu Lưu Cùng Superman (Phần 3)",
    "origin_name": "My Adventures With Superman (Season 3)",
    "slug": "nhung-cuoc-phieu-luu-cung-superman-phan-3",
    "poster_url": "https://phimimg.com/uploads/movies/20260723/nhung-cuoc-phieu-luu-cung-superman-phan-3-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260723/nhung-cuoc-phieu-luu-cung-superman-phan-3-thumb.webp",
    "year": 2026,
    "episode_current": "Tập 7",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "id": "d9983d88d8929b1d9f767884e2999e27",
        "name": "Hoạt Hình",
        "slug": "hoat-hinh"
      },
      {
        "id": "9822be111d2ccc29c7172c78b8af8ff5",
        "name": "Hành Động",
        "slug": "hanh-dong"
      },
      {
        "id": "0bcf4077916678de9b48c89221fcf8ae",
        "name": "Khoa Học",
        "slug": "khoa-hoc"
      },
      {
        "id": "66c78b23908113d478d8d85390a244b4",
        "name": "Phiêu Lưu",
        "slug": "phieu-luu"
      },
      {
        "id": "68564911f00849030f9c9c144ea1b931",
        "name": "Viễn Tưởng",
        "slug": "vien-tuong"
      }
    ],
    "country": [
      {
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a",
        "name": "Âu Mỹ",
        "slug": "au-my"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "6a616ce4fa2ddb12da042a96",
    "name": "Những Cuộc Phiêu Lưu Cùng Superman (Phần 2)",
    "origin_name": "My Adventures With Superman (Season 2)",
    "slug": "nhung-cuoc-phieu-luu-cung-superman-phan-2",
    "poster_url": "https://phimimg.com/uploads/movies/20260723/nhung-cuoc-phieu-luu-cung-superman-phan-2-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260723/nhung-cuoc-phieu-luu-cung-superman-phan-2-thumb.webp",
    "year": 2024,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "6a616c2a00af97cb05070739",
    "name": "Những Cuộc Phiêu Lưu Cùng Superman (Phần 1)",
    "origin_name": "My Adventures With Superman (Season 1)",
    "slug": "nhung-cuoc-phieu-luu-cung-superman-phan-1",
    "poster_url": "https://phimimg.com/uploads/movies/20260723/nhung-cuoc-phieu-luu-cung-superman-phan-1-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260723/nhung-cuoc-phieu-luu-cung-superman-phan-1-thumb.webp",
    "year": 2023,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "e8e5f71237c3b05761cda9e029a5b3d2",
    "name": "Superman: Người Con Cộng Sản",
    "origin_name": "Superman: Red Son",
    "slug": "superman-nguoi-con-cong-san",
    "poster_url": "https://phimimg.com/upload/vod/20231206-1/75a10f2c3142c448042cb0926c932bb1.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231206-1/ae7e22c8ed0dd2a5d08dd85b576bb8b5.jpg",
    "year": 2020,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "f953ad57910572bd6803da3faaa6e92b",
    "name": "Superman: Doomsday",
    "origin_name": "Superman: Doomsday",
    "slug": "superman-doomsday",
    "poster_url": "https://phimimg.com/upload/vod/20231129-1/78f0ba849fb3f2eccacfaa9246ba9655.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231129-1/9d4fa55c4d7b7a5fe66b5247bc6feb06.jpg",
    "year": 2007,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "df3533caf8f1bedde6a6633d90819e82",
    "name": "Siêu Nhân 3",
    "origin_name": "Superman III",
    "slug": "sieu-nhan-3",
    "poster_url": "https://phimimg.com/upload/vod/20260512-1/ae9405605ab37c17488caaf2a7355971.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260512-1/d3fcccb3f2a76ae34158af4c4d32c766.jpg",
    "year": 1983,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "4123c19231c19717ad706a848caa2842",
    "name": "Siêu Nhân 4: Nhiệm Vụ Gìn Giữ Hòa Bình",
    "origin_name": "Superman IV: The Quest For Peace",
    "slug": "sieu-nhan-4-nhiem-vu-gin-giu-hoa-binh",
    "poster_url": "https://phimimg.com/upload/vod/20260512-1/610e8988f5d14a4309ec2f14c8cd2a1b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260512-1/34b530e2fcc2f4034449246e81da8906.jpg",
    "year": 1987,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      },
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "0b6cf75f58aca50278bdcfc9c46576f4",
    "name": "Siêu Nhân Và Lois (Phần 1)",
    "origin_name": "Superman And Lois (Season 1)",
    "slug": "sieu-nhan-va-lois-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20250331-1/9faa4081d3ad9897d39303f15123086b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250331-1/b96ae5d461d0ea4edfd7cec155778e58.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (15/15)",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "83ceae014fabf2e56e69da4b132f4f6b",
    "name": "Siêu Nhân",
    "origin_name": "Superman",
    "slug": "sieu-nhan-2025",
    "poster_url": "https://phimimg.com/upload/vod/20250717-1/0f52ee982b3b734555934ea2198b8511.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250717-1/9db34f2c6ae544a645e5d8662afdbadc.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "64744829a161fdb5d0fb42af83c627cd",
    "name": "Siêu Nhân Và Lois (Phần 4)",
    "origin_name": "Superman And Lois (Season 4)",
    "slug": "sieu-nhan-va-lois-phan-4",
    "poster_url": "https://phimimg.com/upload/vod/20250331-1/db2e1dc880290f99303eeb3f416b772e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250331-1/d1340647eb121396d2cc7b8cc8bcacbb.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "7b4f363a4a6eae200c5096791b87dcf2",
    "name": "Siêu Nhân Và Lois (Phần 3)",
    "origin_name": "Superman And Lois (Season 3)",
    "slug": "sieu-nhan-va-lois-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20250331-1/904cac648ea6482c52cc1f1f321f41c9.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250331-1/0078b17306d1738ad27d257f3ac92baf.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Thuyết Minh",
    "category": [
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "51fda174c360f4ea5d21de87c4c9a792",
    "name": "Siêu Nhân Và Lois (Phần 2)",
    "origin_name": "Superman And Lois (Season 2)",
    "slug": "sieu-nhan-va-lois-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20250331-1/6986722058c0eb25c3dd7e3bd7032f8a.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231204-1/e64809d234b9e30a36d4947ac3dbb5f8.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (15/15)",
    "quality": "FHD",
    "lang": "Thuyết Minh",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "264a8d02fe9429236ad8796df3f16ec6",
    "name": "Siêu Nhân X",
    "origin_name": "X Superman",
    "slug": "sieu-nhan-x",
    "poster_url": "https://phimimg.com/upload/vod/20240911-1/4ea872973f6d8c7d399a320d14301b74.webp",
    "thumb_url": "https://phimimg.com/upload/vod/20240911-1/213c21905a18ef1973c4b7f8611b6b4f.webp",
    "year": 2014,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Quốc Gia Khác",
        "slug": "quoc-gia-khac",
        "id": "45a260effdd4ba38e861092ae2a1b96a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "717fb24cc33821afb4bcd529696cdfce",
    "name": "Siêu Nhân 2",
    "origin_name": "Superman II",
    "slug": "sieu-nhan-2",
    "poster_url": "https://phimimg.com/upload/vod/20240128-1/50f5b38f2f3603d40653e3d6a8e55b46.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240128-1/5344b9fd1a0f156886deb65e7a7e4a75.jpg",
    "year": 1980,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "4479d4f0fe2b922b8ab8875c429c0a72",
    "name": "Siêu Nhân Đối Đầu Nhóm Tinh Hoa",
    "origin_name": "Superman Vs. The Elite",
    "slug": "sieu-nhan-doi-dau-nhom-tinh-hoa",
    "poster_url": "https://phimimg.com/upload/vod/20240128-1/5935ede29d1c116400b8442e3d2c4bd6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240128-1/e7134c95503c39f25cf0f843af6cf399.jpg",
    "year": 2012,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "45b865d134d2c25cf5ed131317fe88de",
    "name": "Siêu Nhân Trở Lại",
    "origin_name": "Superman Returns",
    "slug": "sieu-nhan-tro-lai-2006",
    "poster_url": "https://phimimg.com/upload/vod/20240104-1/5d096eb68f9bab57706f7d68111a3add.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240104-1/74e87729efed4c765d210b5482f193d5.jpg",
    "year": 2006,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      },
      {
        "name": "Úc",
        "slug": "uc",
        "id": "435a85571578e419ed511257881a1e75"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "b4337d69a5afc0c2ff74d7c95065edf3",
    "name": "Ngày Tàn Của Siêu Nhân",
    "origin_name": "Superman: Doomsday",
    "slug": "ngay-tan-cua-sieu-nhan",
    "poster_url": "https://phimimg.com/upload/vod/20231215-1/afeaac3a59b94d4d40a742bb29aeeecf.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231215-1/d3705973f6937ce24c4607c9ce2ae1e1.jpg",
    "year": 2007,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "96f0a190986ed55124c246fd4c7e412f",
    "name": "Cái Chết Của Siêu Nhân",
    "origin_name": "The Death of Superman",
    "slug": "cai-chet-cua-sieu-nhan",
    "poster_url": "https://phimimg.com/upload/vod/20231129-1/971fdd9262bcf78b826f11bc8a12adfd.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231129-1/6f21be890ed6a97fac26f506e9eaa4d9.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "b9acb4ae6121c941324b2b1d3fac5c30",
    "name": "Siêu Nhân",
    "origin_name": "Superman",
    "slug": "sieu-nhan",
    "poster_url": "https://phimimg.com/upload/vod/20231129-1/cca69e0f0686c913950c11b5c82a2573.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231129-1/c1ef718a4b0cbfbcd1cca2e312cf966d.jpg",
    "year": 1978,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "9a3f263a5e5f63006098a05cd7491997",
    "name": "Trông Chờ Những Siêu Anh Hùng",
    "origin_name": "Waiting for \"Superman\"",
    "slug": "trong-cho-nhung-sieu-anh-hung",
    "poster_url": "https://phimimg.com/upload/vod/20231111-1/07550064605c954df3eac5007e36fb5e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231111-1/8eb613bb5de1c0765a1dfa0fbf9206b9.jpg",
    "year": 2010,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Tài Liệu",
        "slug": "tai-lieu",
        "id": "1645fa23fa33651cef84428b0dcc2130"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "6a0724f1d3e80fd5f761cacb7efe8593",
    "name": "Người Đàn Ông Thép",
    "origin_name": "Man Of Steel",
    "slug": "nguoi-dan-ong-thep",
    "poster_url": "https://phimimg.com/upload/vod/20231208-1/06637f167c35a1b3ff1ed7598a9e52f4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231208-1/0bcc613d9e0a1a18651813be4c2bc130.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      },
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "735475d64a23bbf3e94a5c49c5749349",
    "name": "Justice League X RWBY: Super Heroes & Huntsmen, Part One",
    "origin_name": "Justice League X RWBY: Super Heroes & Huntsmen, Part One",
    "slug": "justice-league-x-rwby-super-heroes-huntsmen-part-one",
    "poster_url": "https://phimimg.com/upload/vod/20240228-1/fef1c51026fb36332adb847a66519c69.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240228-1/679df7c04c22b036d03e7f0effdd24ac.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "b4e996f75bdf4c28209feba4693ff228",
    "name": "Lego DC Comics Superheroes: Justice League - Gotham City Breakout",
    "origin_name": "Lego DC Comics Superheroes: Justice League - Gotham City Breakout",
    "slug": "lego-dc-comics-superheroes-justice-league-gotham-city-breakout",
    "poster_url": "https://phimimg.com/upload/vod/20240123-1/f23f37309f3b96b3475841692b9836c2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240123-1/39bd5eaf70bef9f4de96da9be5cd2153.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "e7d4c8d4fe04d9b4539a075d809c6d01",
    "name": "LEGO DC Comics Super Heroes: Justice League: Cosmic Clash",
    "origin_name": "LEGO DC Comics Super Heroes: Justice League: Cosmic Clash",
    "slug": "lego-dc-comics-super-heroes-justice-league-cosmic-clash",
    "poster_url": "https://phimimg.com/upload/vod/20231112-1/da6d0e1dfecb0be2b7069b42d08236af.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231112-1/633f05645bce39964136e67eaadb54c5.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "9718db12cae6be37f7349779007ee589",
    "name": "Lego DC Comics Super Heroes: Justice League vs. Bizarro League",
    "origin_name": "Lego DC Comics Super Heroes: Justice League vs. Bizarro League",
    "slug": "lego-dc-comics-super-heroes-justice-league-vs-bizarro-league",
    "poster_url": "https://phimimg.com/upload/vod/20231111-1/8f5b2ca5374a9f6e508c5a490a77d5b4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231111-1/c59d4656c3b83e090159a975ebaaa454.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "ea0d596db885d871c96c206697b4878f",
    "name": "Liên Minh Công Lý: Khủng Hoảng Trái Đất Vô Cực (Phần 3)",
    "origin_name": "Justice League: Crisis on Infinite Earths (Part 3)",
    "slug": "lien-minh-cong-ly-khung-hoang-trai-dat-vo-cuc-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20240728-1/9a4b1c860bf9bd69d8f11b0f56cae8e8.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240728-1/263096072a5a42dbc24b57aa850dcdfe.jpg",
    "year": 2024,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "06e1133c97ef0f86dc7f8985896bcbb5",
    "name": "Liên Minh Công Lý: Khủng Hoảng Trái Đất Vô Cực (Phần 2)",
    "origin_name": "Justice League: Crisis on Infinite Earths (Part 2)",
    "slug": "lien-minh-cong-ly-khung-hoang-trai-dat-vo-cuc-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20240728-1/5bb9703477e39cdf56ef61912ba1ea01.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240728-1/83b9d30844313d4a02f65910c0a983db.jpg",
    "year": 2024,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "9d72602ab51415fbc2fad50252666445",
    "name": "Liên Minh Công Lý: Khủng Hoảng Trái Đất Vô Cực (Phần 1)",
    "origin_name": "Justice League: Crisis on Infinite Earths (Part 1)",
    "slug": "lien-minh-cong-ly-khung-hoang-trai-dat-vo-cuc-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20240728-1/f1786ea6f0596068577165afa61f9071.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240728-1/0e49894e1265d1e30cfb16675860cf60.jpg",
    "year": 2024,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "100d401be2079ef59caeaa7094fe9df4",
    "name": "Liên Minh Công Lý: Khủng Hoảng Trên Trái Đất Vô Tận Phần Ba",
    "origin_name": "Justice League: Crisis on Infinite Earths Part Three",
    "slug": "lien-minh-cong-ly-khung-hoang-tren-trai-dat-vo-tan-phan-ba",
    "poster_url": "https://phimimg.com/upload/vod/20240726-1/920b8e804ad0ed9c49849574a895bb9c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240726-1/cd74cccda9e668c195a73189e98f5a84.jpg",
    "year": 2024,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "20b3c39862ca1f0e8a12a96218615351",
    "name": "Liên Minh Công Lý Bóng Đêm",
    "origin_name": "Justice League Dark",
    "slug": "lien-minh-cong-ly-bong-dem",
    "poster_url": "https://phimimg.com/upload/vod/20240220-1/2a57d87a0ccfdf82985a85168aaf7df0.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240220-1/231c57a128b2901dda0a1ef3a79dcc87.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "94bdf49dcb9b7357c377c7310c411343",
    "name": "Liên Minh Công Lý: Biên Giới Mới",
    "origin_name": "Justice League: The New Frontier",
    "slug": "lien-minh-cong-ly-bien-gioi-moi",
    "poster_url": "https://phimimg.com/upload/vod/20240205-1/800b9a3675cf4e3cf71692b6e23e0e3d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240205-1/c43e037861f62983e7cf4206c00bfc01.jpg",
    "year": 2008,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "50bb4b781898459e99c81b050843896b",
    "name": "Liên Minh Công Lý Đối Đầu Fatal Five",
    "origin_name": "Justice League Vs The Fatal Five",
    "slug": "lien-minh-cong-ly-doi-dau-fatal-five",
    "poster_url": "https://phimimg.com/upload/vod/20231230-1/64c8ed11ddf27a9a33f529558886c5c7.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231230-1/0a366a7e63a6b472e7ca6f042505158c.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "e3670ce0c315396e4836d7024abcf3dd",
    "name": "Liên Minh Công Lý: Thiên Thần Và Quỷ Dữ",
    "origin_name": "Justice League: Gods And Monsters",
    "slug": "lien-minh-cong-ly-thien-than-va-quy-du",
    "poster_url": "https://phimimg.com/upload/vod/20231208-1/853c7b5336f2e5ce94c9ff13f19a0cff.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231208-1/ea6955f7535139563f9dbc1baca5d6a4.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "79fde5402cbc75ae0615c9ae4c335b46",
    "name": "Liên Minh Công Lý: Chiến Tranh",
    "origin_name": "Justice League: War",
    "slug": "lien-minh-cong-ly-chien-tranh",
    "poster_url": "https://phimimg.com/upload/vod/20231109-1/6a05ba5847b914ce0aef9aa760b435ca.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231109-1/27bf950a99c22698955aeead7115f1a8.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "1343777b8ead1cef5a79b78a1a48d805",
    "name": "Liên Minh Công Lý: Phán Quyết",
    "origin_name": "Justice League: Doom",
    "slug": "lien-minh-cong-ly-phan-quyet",
    "poster_url": "https://phimimg.com/upload/vod/20231108-1/9a5319bd1f61040d9a7d124a5d4e8a66.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231108-1/1f14d5067b1a882386805757d164da93.jpg",
    "year": 2012,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "147540e129e096fa91700e9db6588354",
    "name": "Liên Minh Công Lý: Thảm Họa Giữa Hai Trái Đất",
    "origin_name": "Justice League: Crisis on Two Earths",
    "slug": "lien-minh-cong-ly-tham-hoa-giua-hai-trai-dat",
    "poster_url": "https://phimimg.com/upload/vod/20231108-1/46c38605c2fe593beb2217105a16902a.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231108-1/bb9d31b4e52ddcca5096e84efd7a9ab7.jpg",
    "year": 2010,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "0668e20b3c9e9185b04b3d2a9dc8fa2d",
    "name": "Liên Minh Công Lý: Cuộc Tấn Công Của Binh Đoàn Hủy Diệt",
    "origin_name": "LEGO DC Comics Super Heroes: Justice League - Attack of the Legion of Doom!",
    "slug": "lien-minh-cong-ly-cuoc-tan-cong-cua-binh-doan-huy-diet",
    "poster_url": "https://phimimg.com/upload/vod/20231101-1/851179054d1ebe5cf05dd48d387ec2e7.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231101-1/42804819dac4a7880cf81cf823545240.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "16fc18d787294ad5171100e33d05d4e2",
    "name": "Liên Minh Công Lý vs. Teen Titans",
    "origin_name": "Justice League vs. Teen Titans",
    "slug": "lien-minh-cong-ly-vs-teen-titans",
    "poster_url": "https://phimimg.com/upload/vod/20231030-1/ea15ae7bc3b1fec9dbd767d65d54fb35.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231030-1/02b0654c90762781c83da8b0719b7eec.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "040a99f23e8960763e680041c601acab",
    "name": "Liên Minh Công Lý Bóng Đêm: Cuộc Chiến Apokolips",
    "origin_name": "Justice League Dark: Apokolips War",
    "slug": "lien-minh-cong-ly-bong-dem-cuoc-chien-apokolips",
    "poster_url": "https://phimimg.com/upload/vod/20231030-1/bfe5bcbb0faae669cb7a7d8a2c5bce07.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231030-1/135cca929048e195f564011824534b97.jpg",
    "year": 2020,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "130f1a8e9e102707f3f91b010f151b0b",
    "name": "Liên Minh Công Lý",
    "origin_name": "Justice League",
    "slug": "lien-minh-cong-ly",
    "poster_url": "https://phimimg.com/upload/vod/20231019-1/0ee36367ccf53c1c471f0b3c08ac1354.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231019-1/d571e3972a8f40e47c342daa1c129dec.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "c5a4e7e6882845ea7bb4d9462868219b",
    "name": "Liên Minh Công Lý của Zack Snyder",
    "origin_name": "Zack Snyder's Justice League",
    "slug": "lien-minh-cong-ly-cua-zack-snyder",
    "poster_url": "https://phimimg.com/upload/vod/20231016-1/bea0be39324578ada5fba0b9c11c6f7a.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231016-1/ffd14feb9753f59f0c5424947e686aaa.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "352fe25daf686bdb4edca223c921acea",
    "name": "Liên Minh Công Lý: Thế Chiến",
    "origin_name": "Justice League: Warworld",
    "slug": "lien-minh-cong-ly-the-chien",
    "poster_url": "https://phimimg.com/upload/vod/20230920-1/ded103dd75009f9a3a7d3daca6a3deb4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230920-1/bde188029d7af2ec06f70c131f05e8d1.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "301af7614f87909bb1649e27087db4af",
    "name": "Liên Minh Công Lý: Trở Về Quá Khứ",
    "origin_name": "JLA Adventures: Trapped In Time",
    "slug": "lien-minh-cong-ly-tro-ve-qua-khu",
    "poster_url": "https://phimimg.com/upload/vod/20240205-1/7aba0654f95fcb65e9c1b632c6700623.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240205-1/f576882e4e0dea470d8b5eef77e5dd2b.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "59b5a32ef22091b6057d844141c0bafd",
    "name": "Liên Minh Công Lý: Bất Công",
    "origin_name": "Injustice",
    "slug": "lien-minh-cong-ly-bat-cong",
    "poster_url": "https://phimimg.com/upload/vod/20231209-1/90197bd16ec0877df5bd8edcaf77b821.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231209-1/d5a5b44f3058a8500a5e3ca58d011bbe.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "bb921944c8c4531826da3fa99b494c1a",
    "name": "Wonder Woman: Nữ Thần Chiến Binh",
    "origin_name": "Wonder Woman",
    "slug": "wonder-woman-nu-than-chien-binh",
    "poster_url": "https://phimimg.com/upload/vod/20231129-1/10f37ff918b85bf97889759018ad3eae.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231129-1/89a44eb06f9c334df1c043886ca874a7.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Giả Tượng",
        "slug": "gia-tuong",
        "id": "97e7ed4c52ce3737e18bdf0bd1331ce8"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "f1461909ac11780acf665caf329c10b9",
    "name": "Người Phụ Nữ Tuyệt Vời",
    "origin_name": "The Wonder Woman",
    "slug": "nguoi-phu-nu-tuyet-voi",
    "poster_url": "https://phimimg.com/upload/vod/20250712-1/0c3304753a04c6924be46b492d1a7a65.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250712-1/cd3e99e6217e8386629cc0da5c3c56f7.jpg",
    "year": 2020,
    "episode_current": "Hoàn Tất (29/29)",
    "quality": "FHD",
    "lang": "Lồng Tiếng",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Đài Loan",
        "slug": "dai-loan",
        "id": "559fea9881e3a6a3e374b860fa8fb782"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "5f5d472067f77b5c88f69f1bcfda1e08",
    "name": "Nữ Thần Chiến Binh 1984",
    "origin_name": "Wonder Woman 1984",
    "slug": "nu-than-chien-binh-1984",
    "poster_url": "https://phimimg.com/upload/vod/20231208-1/e571ef3df59f545959065d1c3b4bb42f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231208-1/d19d277cd0cc49f15f069fba8b9afd83.jpg",
    "year": 2020,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
      },
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      },
      {
        "name": "Tây Ban Nha",
        "slug": "tay-ban-nha",
        "id": "8a40abac202ab3659bb98f71f05458d1"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "b20706935de35bbe643733f856d9e5d6",
    "name": "Công Chúa Biến Binh",
    "origin_name": "Wonder Woman",
    "slug": "cong-chua-bien-binh",
    "poster_url": "https://phimimg.com/upload/vod/20231125-1/0def17e1f496d449c88e9e01fb426a90.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231125-1/ef16e976e7b17dad904fe3bcd8e423f1.jpg",
    "year": 2009,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Giả Tượng",
        "slug": "gia-tuong",
        "id": "97e7ed4c52ce3737e18bdf0bd1331ce8"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "ef41d488755367316f04fc0e0e9dc9fc",
    "name": "Aquaman và Vương Quốc Thất Lạc",
    "origin_name": "Aquaman and the Lost Kingdom",
    "slug": "aquaman-va-vuong-quoc-that-lac",
    "poster_url": "https://phimimg.com/upload/vod/20231018-1/24656800bf1f179f0b5eb6010ad224e3.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231018-1/891efb14c090af1c018d611a9e604d58.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "64d29f56aa43279ba07617b9724d5597",
    "name": "Aquaman: Đế Vương Atlantis",
    "origin_name": "Aquaman",
    "slug": "aquaman-de-vuong-atlantis",
    "poster_url": "https://phimimg.com/upload/vod/20231231-1/ddad618023d47450a28bdc2ee2e75f2b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231231-1/e0ac7e0d1fbf27b94a4292d6563c2ad5.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "a8f15eda80c50adb0e71943adc8015cf",
    "name": "Flash",
    "origin_name": "The Flash",
    "slug": "flash",
    "poster_url": "https://phimimg.com/upload/vod/20230915-1/b736540e934fe99e07146ca8e9157e0f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230915-1/e50bfb110fad81abfd8d90aaf95c6559.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "96f4303c756ba84f75fdbcc92d0f0414",
    "name": "Người Hùng Tia Chớp",
    "origin_name": "The Flash",
    "slug": "nguoi-hung-tia-chop-1990",
    "poster_url": "https://phimimg.com/upload/vod/20250801-1/f22b8ca4d1978a4bf42e6dc72c039c00.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250801-1/166d57e34574bd485d36e4111d727e0d.jpg",
    "year": 1990,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "5c18451ace5d9c3f7e8b54576eb89ee8",
    "name": "Người Hùng Tia Chớp (Phần 9)",
    "origin_name": "The Flash (Season 9)",
    "slug": "nguoi-hung-tia-chop-phan-9",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/341fcfebbb3c3aa10cce59e4b13280ac.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/b3f83a585bab3206906db280588f8a74.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "28e2ec06c30bf13443769498502ed048",
    "name": "Người Hùng Tia Chớp (Phần 8)",
    "origin_name": "The Flash (Season 8)",
    "slug": "nguoi-hung-tia-chop-phan-8",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/2048b0a5b6b06199a2ab7fc01b679255.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/bcf50b7305a1a381b596dce4b148bf78.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (20/20)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "68a2d3d7b5423bc30cd12d789b6b24d2",
    "name": "Người Hùng Tia Chớp (Phần 7)",
    "origin_name": "The Flash (Season 7)",
    "slug": "nguoi-hung-tia-chop-phan-7",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/ad3273b3857dc0004ca91680e6312c24.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/5bfaf075e231573cfc86637bb06b6dfc.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (18/18)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "ec22d55c1fae7968b5a5ddd2a95239e3",
    "name": "Người Hùng Tia Chớp (Phần 6)",
    "origin_name": "The Flash (Season 6)",
    "slug": "nguoi-hung-tia-chop-phan-6",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/36b6c2be06baddd75e890504311cefff.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/e5f4b99b5d8a5e8825deb889e946cd77.jpg",
    "year": 2019,
    "episode_current": "Hoàn Tất (19/19)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "2d6304a207cd9469f776e651e81ed7f8",
    "name": "Người Hùng Tia Chớp (Phần 5)",
    "origin_name": "The Flash (Season 5)",
    "slug": "nguoi-hung-tia-chop-phan-5",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/e1d218103ac53d3e12c9753c0ab74ad4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/ce26f13b92c6397f3f42e940d33515b2.jpg",
    "year": 2018,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "02d1941438bbd398f00e76203eeee9ea",
    "name": "Người Hùng Tia Chớp (Phần 4)",
    "origin_name": "The Flash (Season 4)",
    "slug": "nguoi-hung-tia-chop-phan-4",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/c3b52029af7f40f73c4b1f65f49ed0bc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/dd6795f7a76e1aba9af932269eb60278.jpg",
    "year": 2017,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "2d98fcc24951b689312a941144269ee7",
    "name": "Người Hùng Tia Chớp (Phần 3)",
    "origin_name": "The Flash (Season 3)",
    "slug": "nguoi-hung-tia-chop-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/4b3d0a99dcd2aad28406bd1cb70350b5.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/dc58bd041d2c0c3efee610111d471d4a.jpg",
    "year": 2016,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "eaef056473008c7fe947a09daeb8f592",
    "name": "Người Hùng Tia Chớp (Phần 2)",
    "origin_name": "The Flash (Season 2)",
    "slug": "nguoi-hung-tia-chop-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/6de54a19a48569cd2fc26b6c43f4c679.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/09cc63421a51ec6a1d2352f146f952d2.jpg",
    "year": 2015,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "af921d3f4ba622035a8eb3ec4cb87659",
    "name": "Người Hùng Tia Chớp (Phần 1)",
    "origin_name": "The Flash (Season 1)",
    "slug": "nguoi-hung-tia-chop-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20250729-1/22791ba99326cf41eca9c883e57864d8.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250729-1/09773b06adbf5e19b89129fb5cac5844.jpg",
    "year": 2014,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "6e0a4f925e3788a47317b77fa13ec531",
    "name": "Lego DC Comics Super Heroes: Tia Chớp",
    "origin_name": "Lego DC Comics Super Heroes: The Flash",
    "slug": "lego-dc-comics-super-heroes-tia-chop",
    "poster_url": "https://phimimg.com/upload/vod/20240207-1/7eadad7e07c269f5abb7e7411ce57999.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240207-1/161188498952cc8057fc36d638b96fc2.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "29cee1957d9ca76292bf5fe62c8129f2",
    "name": "Mobile Suit Gundam: Tia Chớp Hathaway / Mobile Suit Gundam: Hathaway Ma Thuật Nữ Thần Circe",
    "origin_name": "MOBILE SUIT GUNDAM HATHAWAY The Sorcery of Nymph Circe",
    "slug": "mobile-suit-gundam-tia-chop-hathaway-mobile-suit-gundam-hathaway-ma-thuat-nu-than-circe",
    "poster_url": "https://phimimg.com/uploads/movies/20260831/mobile-suit-gundam-tia-chop-hathaway-mobile-suit-gundam-hathaway-ma-thuat-nu-than-circe-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260831/mobile-suit-gundam-tia-chop-hathaway-mobile-suit-gundam-hathaway-ma-thuat-nu-than-circe-thumb.webp",
    "year": 2026,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "id": "d9983d88d8929b1d9f767884e2999e27",
        "name": "Hoạt Hình",
        "slug": "hoat-hinh"
      },
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
        "id": "1bae5183d681b7649f9bf349177f7123",
        "name": "Chiến Tranh",
        "slug": "chien-tranh"
      },
      {
        "id": "37a7b38b6184a5ebd3c43015aa20709d",
        "name": "Chính Kịch",
        "slug": "chinh-kich"
      },
      {
        "id": "a7b065b92ad356387ef2e075dee66529",
        "name": "Tâm Lý",
        "slug": "tam-ly"
      }
    ],
    "country": [
      {
        "id": "d4097fbffa8f7149a61281437171eb83",
        "name": "Nhật Bản",
        "slug": "nhat-ban"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "9e04a739ebd144fa784a334e6365bdc1",
    "name": "Siêu Nhân Tia Chớp",
    "origin_name": "Power Rangers Lightspeed Rescue",
    "slug": "sieu-nhan-tia-chop",
    "poster_url": "https://phimimg.com/upload/vod/20250320-1/f5011fde3119ff0d2e4f7bd49d9a38e1.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250320-1/23941b9e79c9879b4cd45d75e13434cf.jpg",
    "year": 2000,
    "episode_current": "Hoàn Tất (40/40)",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "8d2eee28cb5170c58b8e7c9a9a648a25",
    "name": "Tia Chớp Đen (Phần 4)",
    "origin_name": "Black Lightning (Season 4)",
    "slug": "tia-chop-den-phan-4",
    "poster_url": "https://phimimg.com/upload/vod/20241001-1/f4d5717ba2fa3d891e47213ea04d909c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241001-1/735f12194c9097d5ee2e6e96488973c2.jpg",
    "year": 2021,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "4ed7d66a7373aab4a4ff4258e9b1c51f",
    "name": "Tia Chớp Đen (Phần 3)",
    "origin_name": "Black Lightning (Season 3)",
    "slug": "tia-chop-den-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20241001-1/012c1adf2f1bbed9c67c0b9986cb6699.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241001-1/46fdc31209e75b1ef75b834f627f15c8.jpg",
    "year": 2019,
    "episode_current": "Hoàn Tất (16/16)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "6a979d4a9cf85135408529edc8a133d0",
    "name": "Tia Chớp Đen (Phần 2)",
    "origin_name": "Black Lightning (Season 2)",
    "slug": "tia-chop-den-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20241001-1/56d0c0792d6698635bc202a8cc47d38f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241001-1/248358ef04f01ac7a03bb3662884ddff.jpg",
    "year": 2018,
    "episode_current": "Hoàn Tất (16/16)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "72f9f967c43ce5c44ea12bf78ae63eaf",
    "name": "Tia Chớp Đen (Phần 1)",
    "origin_name": "Black Lightning (Season 1)",
    "slug": "tia-chop-den-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20241001-1/c3b75dc5c26995206b940f37abe8fedc.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241001-1/4c1ee7fe05e1f0c598314dd222376d96.jpg",
    "year": 2018,
    "episode_current": "Hoàn Tất (13/13)",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "2107931de60c5a7c5d526bd1d6a8a34d",
    "name": "Tia chớp đen",
    "origin_name": "Black Lightning",
    "slug": "tia-chop-den",
    "poster_url": "https://phimimg.com/upload/vod/20231120-1/47b5bef3920245656a71e3e861963787.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231120-1/c3ee3a3be039e8f23f5d3029f0a43f96.jpg",
    "year": 2009,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Nga",
        "slug": "nga",
        "id": "2dbf49dd0884691f87e44769a3a3a29e"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "852c296dfa59522f563aef29d8d0adf6",
    "name": "Tia Chớp Mặt Nạ Đen",
    "origin_name": "Sparks",
    "slug": "tia-chop-mat-na-den",
    "poster_url": "https://phimimg.com/upload/vod/20231119-1/232181571d8ddad2df1ee334a0588c2e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231119-1/aab1ac312c555bb5a0f489a6843cf338.jpg",
    "year": 2013,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "856b503e276cc491e7e6e0ac1b9f4b17",
    "name": "Chiến Sĩ Cơ Động Gundam: Tia Chớp Hathaway",
    "origin_name": "Mobile Suit Gundam Hathaway",
    "slug": "chien-si-co-dong-gundam-tia-chop-hathaway",
    "poster_url": "https://phimimg.com/upload/vod/20231101-1/61e47da8879f6c9689f95ef074093f13.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231101-1/1ce3dbd3c99cf24c3fc0246dce4b72b5.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
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
        "name": "Nhật Bản",
        "slug": "nhat-ban",
        "id": "d4097fbffa8f7149a61281437171eb83"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "f8f5161cf94df05793592f5fab95138b",
    "name": "Tia Chớp Murali",
    "origin_name": "Minnal Murali",
    "slug": "tia-chop-murali",
    "poster_url": "https://phimimg.com/upload/vod/20231101-1/3b42413e2a4bd9123059342db77a48fe.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231101-1/f6efd0afc15ab210380c4a6d341d2ae6.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
        "name": "Giả Tượng",
        "slug": "gia-tuong",
        "id": "97e7ed4c52ce3737e18bdf0bd1331ce8"
      }
    ],
    "country": [
      {
        "name": "Ấn Độ",
        "slug": "an-do",
        "id": "aadd510492662beef1a980624b26c685"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "87682805257e619d49b8e0dfdc14affa",
    "name": "Tia Chớp",
    "origin_name": "Bolt",
    "slug": "tia-chop",
    "poster_url": "https://phimimg.com/upload/vod/20231022-1/94d510b9eca18f6eab13977c6ce5ba03.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231022-1/e7fffc74b7840a82e63fa987dcb0a36c.jpg",
    "year": 2008,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "26505e0494662534f633586941b77d0c",
    "name": "Percy Jackson: Kẻ Cắp Tia Chớp",
    "origin_name": "Percy Jackson & the Olympians: The Lightning Thief",
    "slug": "percy-jackson-ke-cap-tia-chop",
    "poster_url": "https://phimimg.com/upload/vod/20231019-1/577089d02f4bd8ee8e321286771abee6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231019-1/12f63d956bb6f12c1074fcb0fae12aeb.jpg",
    "year": 2010,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "eb1e78328c46506b46a4ac4a1e378b91",
    "name": "Tia Chớp Xanh",
    "origin_name": "Blue Thunder",
    "slug": "tia-chop-xanh",
    "poster_url": "https://phimimg.com/upload/vod/20231016-1/58482ff2990dcd7b2c775484af110c15.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231016-1/b29a505351431b6df357c0a90cc87372.jpg",
    "year": 1983,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "f9e858932ebbaeef3db480c1eae382eb",
    "name": "Joker: Điên Có Đôi",
    "origin_name": "Joker: Folie à Deux",
    "slug": "joker-dien-co-doi",
    "poster_url": "https://phimimg.com/upload/vod/20241031-1/fa75c11414056c54a989e0cdc5ada689.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241031-1/2c811ceac1d82f7f86b26dcae67f4368.jpg",
    "year": 2024,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Thuyết Minh",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "eb0f8365fc175ccab38fa0486702641b",
    "name": "Jack And Joker: Người Đánh Cắp Trái Tim Tôi!",
    "origin_name": "Jack & Joker: U Steal My Heart!",
    "slug": "jack-and-joker-nguoi-danh-cap-trai-tim-toi",
    "poster_url": "https://phimimg.com/upload/vod/20240910-1/cf674b2ebb7c83278b9cd3ff86047d21.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240910-1/9b3bb1a646e6d7bed4b7d7eb9e06fd14.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (12/12)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
        "name": "Thái Lan",
        "slug": "thai-lan",
        "id": "cefbf1640a17bad1e13c2f6f2a811a2d"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "0342c9a7b54450830e9727b98f8e3cb7",
    "name": "Joker Game",
    "origin_name": "Joker Game",
    "slug": "joker-game",
    "poster_url": "https://phimimg.com/upload/vod/20231111-1/701f71bad78ad6de16bb18b768ce6b5f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231111-1/f0df11b1e76615807a31dec40ea54c27.jpg",
    "year": 2015,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Nhật Bản",
        "slug": "nhat-ban",
        "id": "d4097fbffa8f7149a61281437171eb83"
      },
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "8929c70f8d710e412d38da624b21c3c8",
    "name": "Joker: Gã Hề",
    "origin_name": "Joker",
    "slug": "joker-ga-he",
    "poster_url": "https://phimimg.com/upload/vod/20231018-1/8caf81b5a7c17308ace50c3b1e486988.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231018-1/77ddf9d17ed4388b5b6ba438ee072ea3.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
        "name": "Canada",
        "slug": "canada",
        "id": "445d337b5cd5de476f99333df6b0c2a7"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "e2092c4ee512ec443f048dc33198cd08",
    "name": "Những Kẻ Thích Đùa Dại Dột (Phần 5)",
    "origin_name": "Impractical Jokers (Season 5)",
    "slug": "nhung-ke-thich-dua-dai-dot-phan-5",
    "poster_url": "https://phimimg.com/uploads/movies/20260905/nhung-ke-thich-dua-dai-dot-phan-5-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260905/nhung-ke-thich-dua-dai-dot-phan-5-thumb.webp",
    "year": 2016,
    "episode_current": "Hoàn Tất (18/18)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db",
        "name": "Hài Hước",
        "slug": "hai-huoc"
      },
      {
        "id": "a7b065b92ad356387ef2e075dee66529",
        "name": "Tâm Lý",
        "slug": "tam-ly"
      },
      {
        "id": "37a7b38b6184a5ebd3c43015aa20709d",
        "name": "Chính Kịch",
        "slug": "chinh-kich"
      }
    ],
    "country": [
      {
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a",
        "name": "Âu Mỹ",
        "slug": "au-my"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "3f53d7190148675e3cd472fc826828c5",
    "name": "Birds of Prey: Cuộc Lột Xác Huy Hoàng Của Harley Quinn",
    "origin_name": "Birds of Prey (and the Fantabulous Emancipation of One Harley Quinn)",
    "slug": "birds-of-prey-cuoc-lot-xac-huy-hoang-cua-harley-quinn",
    "poster_url": "https://phimimg.com/upload/vod/20231020-1/1ea00d7b733c563f3844fb30582b0f10.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231020-1/73e4382345ecc4fbcec59eedb7bd5b8b.jpg",
    "year": 2020,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "02b1be0d48924c327124732726097157",
    "name": "Suicide Squad: Điệp Vụ Cảm Tử",
    "origin_name": "The Suicide Squad",
    "slug": "suicide-squad-diep-vu-cam-tu",
    "poster_url": "https://phimimg.com/upload/vod/20231018-1/ef5603d981230be525a226c1210cd646.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231018-1/cc2742e0d2fe391e1d954ca77ed35ca5.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "6048ff4e8cb07aa60b6777b6f7384d52",
    "name": "Biệt Đội Cảm Tử",
    "origin_name": "Suicide Squad",
    "slug": "biet-doi-cam-tu",
    "poster_url": "https://phimimg.com/upload/vod/20231022-1/c2144a79dfafc62d54a7a6a2b0b6095e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231022-1/b443ed1c1cd7579172b3ed8a151d33ba.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "439d8c975f26e5005dcdbf41b0d84161",
    "name": "Biệt Đội Cảm Tử: Cuộc Thanh Toán Địa Ngục",
    "origin_name": "Suicide Squad: Hell to Pay",
    "slug": "biet-doi-cam-tu-cuoc-thanh-toan-dia-nguc",
    "poster_url": "https://phimimg.com/upload/vod/20231202-1/8fa433f29c5a8c50392642a2f4c915a2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231202-1/b893eff7442d846ffcd7955c7b7027fe.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "f8e918489f1e0a81ff11312f4d0630c1",
    "name": "Biệt Đội Cảm Tử Alpha",
    "origin_name": "Project E.1337: ALPHA",
    "slug": "biet-doi-cam-tu-alpha",
    "poster_url": "https://phimimg.com/upload/vod/20231203-1/cd737ba12ae26a1c2a1f609ea26d8a3e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231203-1/b9d6f5845630db0136dcace4c7123ce2.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "71e8991cd0a67bcc371061aa0a95bf82",
    "name": "Siêu Anh Hùng Shazam",
    "origin_name": "Shazam!",
    "slug": "sieu-anh-hung-shazam",
    "poster_url": "https://phimimg.com/upload/vod/20240207-1/c18500bc4642751b8c2263bcaa1bd7b4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240207-1/053c4b2f083023becfbddc4222b5877d.jpg",
    "year": 2019,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "6e2713a6efee97bacb63e52c54f0ada0",
    "name": "Shazam! Cơn Thịnh Nộ Của Các Vị Thần",
    "origin_name": "Shazam! Fury of the Gods",
    "slug": "shazam-con-thinh-no-cua-cac-vi-than",
    "poster_url": "https://phimimg.com/upload/vod/20230922-1/fd7d0e017d13a02fa9cf33fa63917228.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230922-1/f8a71575bcf284fa83d239e8d51e93a8.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "b8b4b727d6f5d1b61fff7be687f7970f",
    "name": "Black Adam",
    "origin_name": "Black Adam",
    "slug": "black-adam",
    "poster_url": "https://phimimg.com/upload/vod/20240920-1/f896d2b2c6a26ea2676e760ca29c772b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240920-1/25e7ec547ec0a70be677ef10ee877fbb.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "5737c6ec2e0716f3d8a7a5c4e0de0d9a",
    "name": "Bọ Hung Xanh",
    "origin_name": "Blue Beetle",
    "slug": "bo-hung-xanh",
    "poster_url": "https://phimimg.com/upload/vod/20230919-1/3a2781241b049c1601e90d22c615fc77.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230919-1/f2decb35bccc896b9696d0ca6cf642c0.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "389c96d539ed67bd670f0a32d9765469",
    "name": "Người Hòa Giải (Phần 2)",
    "origin_name": "Peacemaker (Season 2)",
    "slug": "nguoi-hoa-giai-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20250823-1/d5572eba2fae7bd0f4d79d282e707716.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250823-1/220d2cbada9f05b2d43488bc4f33f657.jpg",
    "year": 2025,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "d85753f9fffd5bc75de09475aed5b3f1",
    "name": "Người Hòa Giải (Phần 1)",
    "origin_name": "Peacemaker (Season 1)",
    "slug": "nguoi-hoa-giai-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20250823-1/7c5399f59aae76afaf50ed1dbdf54d45.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250823-1/d2bd002656b41b36c2a8e8bb7a14b1d0.jpg",
    "year": 2022,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "dd409260aea46a90e61b9a69fb9726ef",
    "name": "Sứ Giả Hòa Bình",
    "origin_name": "The Peacemaker",
    "slug": "su-gia-hoa-binh",
    "poster_url": "https://phimimg.com/upload/vod/20231119-1/82b5b3820fce8bddd747922893c0642b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231119-1/2ace1b0d59298469ba921bee2a2e8a65.jpg",
    "year": 1997,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "villains"
  },
  {
    "_id": "f7e2b2b75b04175610e5a00c1e221ebb",
    "name": "Người Hùng Báo Thù",
    "origin_name": "Watchmen",
    "slug": "nguoi-hung-bao-thu",
    "poster_url": "https://phimimg.com/upload/vod/20231020-1/cdac5432f3cad77693c2bd6d6a2ee629.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231020-1/0878a1c80f1a08980c5ec61e066d94ea.jpg",
    "year": 2009,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "standalone"
  },
  {
    "_id": "c71df24045cfddab4a963d3ac9bdc9a3",
    "name": "Người Đi Dưới Địa Ngục",
    "origin_name": "Constantine",
    "slug": "nguoi-di-duoi-dia-nguc",
    "poster_url": "https://phimimg.com/upload/vod/20231211-1/dfb5ab108c8a60f6031435bf0d797675.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231211-1/5d9210405fad5a09e04ddec7a113374d.jpg",
    "year": 2005,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
      },
      {
        "name": "Đức",
        "slug": "duc",
        "id": "24a5bf049aeef94ab79bad1f73f16b92"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "af44c4c56f385c43f2529f9b1b018f6a",
    "name": "Thành Phố Quỷ",
    "origin_name": "Constantine: City of Demons - The Movie",
    "slug": "thanh-pho-quy",
    "poster_url": "https://phimimg.com/upload/vod/20231026-1/86be3c1e54347dc9330e1a204962ba4e.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231026-1/9864d7f2d6a8db2435be1ef6342fe33b.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Giả Tượng",
        "slug": "gia-tuong",
        "id": "97e7ed4c52ce3737e18bdf0bd1331ce8"
      },
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "e77dbaf6759253c7c6d0efc5690369c7",
    "name": "Người Đến Từ Địa Ngục",
    "origin_name": "Constantine",
    "slug": "nguoi-den-tu-dia-nguc",
    "poster_url": "https://phimimg.com/upload/vod/20231020-1/65241b67b021ac701f53ae9aeade41a8.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231020-1/028b25ad12ae1692f202e4064843eb06.jpg",
    "year": 2005,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      }
    ],
    "country": [
      {
        "name": "Đức",
        "slug": "duc",
        "id": "24a5bf049aeef94ab79bad1f73f16b92"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "6a67822e07def6ef71021d5a",
    "name": "Nữ Siêu Nhân",
    "origin_name": "Supergirl",
    "slug": "nu-sieu-nhan-2026",
    "poster_url": "https://phimimg.com/uploads/movies/20260727/nu-sieu-nhan-2026-poster.webp",
    "thumb_url": "https://phimimg.com/uploads/movies/20260727/nu-sieu-nhan-2026-thumb.webp",
    "year": 2026,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "7d3599b51843974f0e36e2cb2397ed32",
    "name": "Nữ Siêu Nhân (Phần 5)",
    "origin_name": "Supergirl (Season 5)",
    "slug": "nu-sieu-nhan-phan-5",
    "poster_url": "https://phimimg.com/upload/vod/20240109-1/ba41cc15001a4ed1342bfa70583915b7.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240109-1/90ac50aa9e23b0608c836c388249253b.jpg",
    "year": 2019,
    "episode_current": "Hoàn Tất (19/19)",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "5644fb01b5333e2548d12dfbc3d5a0c8",
    "name": "Quyền Năng Của Green Lantern",
    "origin_name": "Green Lantern: Beware My Power",
    "slug": "quyen-nang-cua-green-lantern",
    "poster_url": "https://phimimg.com/upload/vod/20240104-1/54d7d65c68bd44ce208b9b801bd57adb.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240104-1/0b1790186b77b9b0860afb75a8ea46b7.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "33abffcedac43a654ac7f501856bf700",
    "name": "Chiến Binh Xanh: Trận Chiến Đầu Tiên",
    "origin_name": "Green Lantern: First Flight",
    "slug": "chien-binh-xanh-tran-chien-dau-tien",
    "poster_url": "https://phimimg.com/upload/vod/20231219-1/28e4a289fa2c8fef7c744c14c407cfe8.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231219-1/0fd6ee81768b5a7dde993752a6b87042.jpg",
    "year": 2009,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "99296ad1eb8cd89661d163ddea3f16f1",
    "name": "Chiến Binh Lồng Đèn Xanh: Hiệp Sĩ Ngọc Bích",
    "origin_name": "Green Lantern: Emerald Knights",
    "slug": "chien-binh-long-den-xanh-hiep-si-ngoc-bich",
    "poster_url": "https://phimimg.com/upload/vod/20231108-1/b30a333ad8cb1b5dc19168b221eb912b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231108-1/378fdf3bcfc33fb95b8b4190062d27fb.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "2ef35a8b78b572a47f56846acbeef5d3",
    "name": "Chiến Binh Đèn Lồng Xanh",
    "origin_name": "Green Lantern",
    "slug": "chien-binh-den-long-xanh",
    "poster_url": "https://phimimg.com/upload/vod/20231026-1/287258dd5df1fef9ab33ff8c82f55c71.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231026-1/8c3b0b0199ea956064ba957e40976174.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "justice-league"
  },
  {
    "_id": "c80e2e3dfd073a58a7868ba33aed57a9",
    "name": "Bài Học Từ Chú Chim Cánh Cụt",
    "origin_name": "The Penguin Lessons",
    "slug": "bai-hoc-tu-chu-chim-canh-cut",
    "poster_url": "https://phimimg.com/upload/vod/20250607-1/0a950dc47f8df2a7cb72002fe4f1933a.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250607-1/f4630a08021aa224d1bb61242a437572.jpg",
    "year": 2025,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      }
    ],
    "country": [
      {
        "name": "Tây Ban Nha",
        "slug": "tay-ban-nha",
        "id": "8a40abac202ab3659bb98f71f05458d1"
      },
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "a6df0bdb9111011bb923c11b2bc2e5fd",
    "name": "Ác Nhân Chim Cánh Cụt",
    "origin_name": "The Penguin",
    "slug": "ac-nhan-chim-canh-cut",
    "poster_url": "https://phimimg.com/upload/vod/20240922-1/e2f5381bcbaa3e5efda0d358d9816916.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240922-1/cd356b077be20de245dc985730779bc3.jpg",
    "year": 2024,
    "episode_current": "Hoàn Tất (8/8)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      }
    ],
    "country": [
      {
        "name": "Ireland",
        "slug": "ireland",
        "id": "06e415f918c577f07328a52e24f75d43"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "7c21c080c204c2ec7523ae6fc12033a6",
    "name": "Biệt Đội Giải Cứu Gotham",
    "origin_name": "Scooby-Doo! & Batman: The Brave And The Bold",
    "slug": "biet-doi-giai-cuu-gotham",
    "poster_url": "https://phimimg.com/upload/vod/20231208-1/1ed6bc8afe8d22d363fd300089effa40.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231208-1/3158935112ff89b1d84a1d72cdee5bc3.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "c9892a989183de32e976c6f04e700201",
    "name": "Người Dơi: Gotham Diệt Vong",
    "origin_name": "Batman: The Doom That Came to Gotham",
    "slug": "nguoi-doi-gotham-diet-vong",
    "poster_url": "https://phimimg.com/upload/vod/20230922-1/e0b0d9e037c9dab420cf33f247212400.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20230922-1/b97f8c944dd02802da4eb242c0f4a6f4.jpg",
    "year": 2023,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Kinh Dị",
        "slug": "kinh-di",
        "id": "4db8d7d4b9873981e3eeb76d02997d58"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Bí Ẩn",
        "slug": "bi-an",
        "id": "2fb53017b3be83cd754a08adab3e916c"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "8651920f3ba2e5f8bcd3e58ba0b48584",
    "name": "Thành Phố Tội Lỗi (Phần 5)",
    "origin_name": "Gotham (Season 5)",
    "slug": "thanh-pho-toi-loi-phan-5",
    "poster_url": "https://phimimg.com/upload/vod/20240729-1/64fca540c91d9017f97ae2c48e8cf6d7.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240729-1/0c9906a910950b5dd333f644eb097f90.jpg",
    "year": 2019,
    "episode_current": "Hoàn Tất (12/12)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "cfbb42c99e65131d097db1bd8a8d2d1f",
    "name": "Thành Phố Tội Lỗi (Phần 4)",
    "origin_name": "Gotham (Season 4)",
    "slug": "thanh-pho-toi-loi-phan-4",
    "poster_url": "https://phimimg.com/upload/vod/20240729-1/2abba4030e6daf0e2610097a822b4092.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240729-1/71389f113633445bcc2a9623af842dc0.jpg",
    "year": 2017,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "548669c53491d7595c0e6f4609795265",
    "name": "Thành Phố Tội Lỗi (Phần 2)",
    "origin_name": "Gotham (Season 2)",
    "slug": "thanh-pho-toi-loi-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20240729-1/3ac984316e2547929753d337a524a152.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240729-1/d86c3375fbc27e97df4c7c7656d0641a.jpg",
    "year": 2015,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "2330b630a226a3c65689e546084fcdfc",
    "name": "Thành Phố Tội Lỗi (Phần 3)",
    "origin_name": "Gotham (Season 3)",
    "slug": "thanh-pho-toi-loi-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20240302-1/6f5e89ea7f23ed09f1b66809254e1541.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240302-1/39a479ba3be5e94457b01200403f9d6b.jpg",
    "year": 2016,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "4251c47fdf0b43ddd1e5bf28bc6f3dba",
    "name": "Thành Phố Tội Lỗi (Phần 1)",
    "origin_name": "Gotham (Season 1)",
    "slug": "thanh-pho-toi-loi-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20240118-1/4886ede08a380a33a6a6eb1d7a18c46f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240118-1/0df6eadff4658e544cac1bc333e850ea.jpg",
    "year": 2014,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Tâm Lý",
        "slug": "tam-ly",
        "id": "a7b065b92ad356387ef2e075dee66529"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "8d643e95685617e013417f26f7d0f825",
    "name": "Biệt Đội Titans (Phần 4)",
    "origin_name": "Titans (Season 4)",
    "slug": "biet-doi-titans-phan-4",
    "poster_url": "https://phimimg.com/upload/vod/20240314-1/be6761e2b8b3d600532f955a8db54f4b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240314-1/604c4027d470d73d7cb8f9996bfbf31c.jpg",
    "year": 2023,
    "episode_current": "Hoàn Tất (12/12)",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      },
      {
        "name": "Anh",
        "slug": "anh",
        "id": "932bbaca386ee0436ad0159117eabae4"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "d8c1d317721776ba9d38a3cccd33a79a",
    "name": "Teen Titans: Rắc Rối Ở Tokyo",
    "origin_name": "Teen Titans: Trouble In Tokyo",
    "slug": "teen-titans-rac-roi-o-tokyo",
    "poster_url": "https://phimimg.com/upload/vod/20240104-1/b0d4b458a7944fff8a7ee5314365070f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240104-1/c3eb8fe69c13f553f8a4bbe4c2dbea24.jpg",
    "year": 2006,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "2c2dc47463ad7f389023f2b0fe1058cf",
    "name": "Clash of the Titans",
    "origin_name": "Clash of the Titans",
    "slug": "clash-of-the-titans",
    "poster_url": "https://phimimg.com/upload/vod/20231206-1/0f21988b1613f8846602d3b5ed59f17b.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231206-1/ff165f1b4b7d742fc5ba2a62ed55201c.jpg",
    "year": 1981,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Tình Cảm",
        "slug": "tinh-cam",
        "id": "bb2b4b030608ca5984c8dd0770f5b40b"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "1aa7a8773e6a7fdacbcedf9999009a38",
    "name": "Teen Titans Go! To the Movies",
    "origin_name": "Teen Titans Go! To the Movies",
    "slug": "teen-titans-go-to-the-movies",
    "poster_url": "https://phimimg.com/upload/vod/20231204-1/7a47142ce1c2fc80c8ada197337a97e6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231204-1/ea7eb613e55675411038edbf2a511064.jpg",
    "year": 2018,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "0a988fc2992add2d3233e19c7aadfdea",
    "name": "Teen Titans Go! & Các nữ siêu anh hùng DC: Mayhem trong Đa vũ trụ",
    "origin_name": "Teen Titans Go! & DC Super Hero Girls: Mayhem in the Multiverse",
    "slug": "teen-titans-go-cac-nu-sieu-anh-hung-dc-mayhem-trong-da-vu-tru",
    "poster_url": "https://phimimg.com/upload/vod/20231115-1/9321363d34f5efbf9d770730ce249470.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231115-1/553f83255a1c091febf590716c579c9a.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "f4f691ac947fd92b7ab3c33d3f90bfed",
    "name": "Teen Titans: Thỏa Thuận Judas",
    "origin_name": "Teen Titans: The Judas Contract",
    "slug": "teen-titans-thoa-thuan-judas",
    "poster_url": "https://phimimg.com/upload/vod/20231114-1/663224917150cc7337a6898bd0e48525.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231114-1/cc3656bee92100732c86870ec2a7cbd0.jpg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "e2eacaff46787bfeefcaa24cf35264c7",
    "name": "Thợ Săn Yêu Tinh: Titan Trỗi Dậy",
    "origin_name": "Trollhunters: Rise of the Titans",
    "slug": "tho-san-yeu-tinh-titan-troi-day",
    "poster_url": "https://phimimg.com/upload/vod/20250524-1/1756340d37fdd9cd94ff8f1f64caac11.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20250524-1/7e173470c7997615b7db43992c63a23b.jpg",
    "year": 2021,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub + Lồng Tiếng",
    "category": [
      {
        "name": "Viễn Tưởng",
        "slug": "vien-tuong",
        "id": "68564911f00849030f9c9c144ea1b931"
      },
      {
        "name": "Gia Đình",
        "slug": "gia-dinh",
        "id": "a2492d6cbc4d58f115406ca14e5ec7b6"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "22a8b63c93772c6b53efc3e83f3b0ebd",
    "name": "Biệt Đội Thiếu Niên Titan Xuất Kích Và Các Nữ Siêu Anh Hùng DC: Hỗn Loạn Trong Đa Vũ Trụ",
    "origin_name": "Teen Titans Go! & DC Super Hero Girls: Mayhem In The Multiverse",
    "slug": "biet-doi-thieu-nien-titan-xuat-kich-va-cac-nu-sieu-anh-hung-dc-hon-loan-trong-da-vu-tru",
    "poster_url": "https://phimimg.com/upload/vod/20241224-1/28abaeea3c9868083cdf5f5ba3dd1f8b.jpeg",
    "thumb_url": "https://phimimg.com/upload/vod/20241224-1/7c3de1d7940b092d5acbdf9151f65d45.jpeg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      },
      {
        "name": "Trẻ Em",
        "slug": "tre-em",
        "id": "0c853f6238e0997ee318b646bb1978bc"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "44ae4524880502f96721515663652d04",
    "name": "Biệt Đội Thiếu Niên Titan Xuất Kích Đêm Tối Bắt Đầu Bừng Sáng (Phần 2)",
    "origin_name": "Teen Titans Go!: Night Begins To Shine 2",
    "slug": "biet-doi-thieu-nien-titan-xuat-kich-dem-toi-bat-dau-bung-sang-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20241224-1/11cee4ac1d0b590d1717973f21ae5b7f.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241224-1/41b6ec338dde5445bd4a7b4e7dfc8f87.jpg",
    "year": 2020,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Thuyết Minh",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      },
      {
        "name": "Trẻ Em",
        "slug": "tre-em",
        "id": "0c853f6238e0997ee318b646bb1978bc"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "0eec9cfc8ea6b4edc679b19030b78d03",
    "name": "Biệt Đội Thiếu Niên Titan Xuất Kích: Đêm Tối Bắt Đầu Bừng Sáng (Phần 1)",
    "origin_name": "Teen Titans Go!: Night Begins To Shine Special",
    "slug": "biet-doi-thieu-nien-titan-xuat-kich-dem-toi-bat-dau-bung-sang-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20241224-1/7aa39d5f715a92619b7003e4583b19b6.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241224-1/6348dd6c6c4f74bc832c6ebca849686c.jpeg",
    "year": 2017,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Thuyết Minh",
    "category": [
      {
        "name": "Hài Hước",
        "slug": "hai-huoc",
        "id": "ba6fd52e5a3aca80eaaf1a3b50a182db"
      },
      {
        "name": "Trẻ Em",
        "slug": "tre-em",
        "id": "0c853f6238e0997ee318b646bb1978bc"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "29b2cd4a11745fefecc14912d2f95dd8",
    "name": "Biệt Đội Titan (Phần 1)",
    "origin_name": "Titans (Season 1)",
    "slug": "biet-doi-titan-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20240126-1/0665c3715230b0b747db7a3c5ba861e2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240126-1/40a81c9a96c98656bbaff0b25c48e179.jpg",
    "year": 2018,
    "episode_current": "Hoàn Tất (11/11)",
    "quality": "HD",
    "lang": "Vietsub",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "79e0effe60c1d4c057037f430cd25b73",
    "name": "Đội Bóng Phi Thường",
    "origin_name": "Remember The Titans",
    "slug": "doi-bong-phi-thuong",
    "poster_url": "https://phimimg.com/upload/vod/20231213-1/1742251a785ea9dd4e615307cd6fa8e4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231213-1/2cfb5593f59d7412725cf32ff09b39f8.jpg",
    "year": 2000,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "4fc848051e4459b8a6afeb210c3664ec",
    "name": "Sự Phẫn Nộ Của Các Vị Thần",
    "origin_name": "Wrath of the Titans",
    "slug": "su-phan-no-cua-cac-vi-than",
    "poster_url": "https://phimimg.com/upload/vod/20231103-1/96dc40c4f5a7e85e9c886b02af0e45c2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231103-1/36ce54eb61785676982be64f1548b8a7.jpg",
    "year": 2012,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Giả Tượng",
        "slug": "gia-tuong",
        "id": "97e7ed4c52ce3737e18bdf0bd1331ce8"
      },
      {
        "name": "Phiêu Lưu",
        "slug": "phieu-luu",
        "id": "66c78b23908113d478d8d85390a244b4"
      }
    ],
    "country": [
      {
        "name": "Tây Ban Nha",
        "slug": "tay-ban-nha",
        "id": "8a40abac202ab3659bb98f71f05458d1"
      },
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "8f125da0b3432ed853c0b6f7ee5aaa6b",
    "name": "Cuộc Chiến Giữa Các Vị Thần",
    "origin_name": "Clash of the Titans",
    "slug": "cuoc-chien-giua-cac-vi-than",
    "poster_url": "https://phimimg.com/upload/vod/20231023-1/55f975ae009d9365a62e2c6ad11b1d6c.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231023-1/1dd96a418e9aea73024168de3493b677.jpg",
    "year": 2010,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "b62682b1aee36c174fb06aa3527f43e8",
    "name": "Đại Chiến Titan: Cung Tên Đỏ Thẫm",
    "origin_name": "Attack On Titan: Crimson Bow And Arrow",
    "slug": "dai-chien-titan-cung-ten-do-tham",
    "poster_url": "https://phimimg.com/upload/vod/20231212-1/3a73fba79e5c4d6c1404f118b2b2847d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231212-1/7204cbde1970bf8727a23a55d96af9e9.jpg",
    "year": 2014,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "id": "9822be111d2ccc29c7172c78b8af8ff5",
        "name": "Hành Động",
        "slug": "hanh-dong"
      },
      {
        "id": "66c78b23908113d478d8d85390a244b4",
        "name": "Phiêu Lưu",
        "slug": "phieu-luu"
      }
    ],
    "country": [
      {
        "id": "d4097fbffa8f7149a61281437171eb83",
        "name": "Nhật Bản",
        "slug": "nhat-ban"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "c61aed648da48aa3893fb3eaadd88a7f",
    "name": "Mũi Tên Xanh (Phần 5)",
    "origin_name": "Arrow (Season 5)",
    "slug": "mui-ten-xanh-phan-5",
    "poster_url": "https://phimimg.com/upload/vod/20260126-1/35e5b3ac2edcc68088dc4a26b57a90d4.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20260126-1/631806d7fd23cde8ca13a5aa12b1d9aa.jpg",
    "year": 2016,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "8945e380613d55b5fc2968c42b1a58fd",
    "name": "Mũi Tên Xanh (Phần 2)",
    "origin_name": "Arrow (Season 2)",
    "slug": "mui-ten-xanh-phan-2",
    "poster_url": "https://phimimg.com/upload/vod/20240624-1/09ee5b95904f4981060b9edaf38b5c28.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240624-1/242d24823637e49f12ef3cbb3852d944.jpg",
    "year": 2013,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "a1678dfef412e43ad6e202e65ac6fff9",
    "name": "Linh Sơn Thần Tiễn",
    "origin_name": "The Sacred Arrow Of Spirit Mountain",
    "slug": "linh-son-than-tien",
    "poster_url": "https://phimimg.com/upload/vod/20241028-1/739b1c399ffafa11f1ca4837c92d75ba.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20241028-1/e7e68057094c43e3fe558e2cbc40f09e.jpg",
    "year": 1987,
    "episode_current": "Hoàn Tất (30/30)",
    "quality": "FHD",
    "lang": "Lồng Tiếng",
    "category": [
      {
        "name": "Cổ Trang",
        "slug": "co-trang",
        "id": "3a17c7283b71fa84e5a8d76fb790ed3e"
      },
      {
        "name": "Võ Thuật",
        "slug": "vo-thuat",
        "id": "578f80eb493b08d175c7a0c29687cbdf"
      }
    ],
    "country": [
      {
        "name": "Đài Loan",
        "slug": "dai-loan",
        "id": "559fea9881e3a6a3e374b860fa8fb782"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "31910e7811999746bcaec5c692b7f04d",
    "name": "Cung thủ siêu phàm",
    "origin_name": "An Arrow Through the Heart",
    "slug": "cung-thu-sieu-pham-2024",
    "poster_url": "https://phimimg.com/upload/vod/20240910-1/bb84f6a8977593bb428f4770da4e25be.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240910-1/bfd2e3fe07e642549942e87f4d4154aa.jpg",
    "year": 2024,
    "episode_current": "Full",
    "quality": "FHD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Chiến Tranh",
        "slug": "chien-tranh",
        "id": "1bae5183d681b7649f9bf349177f7123"
      }
    ],
    "country": [
      {
        "name": "Trung Quốc",
        "slug": "trung-quoc",
        "id": "3e075636c731fe0f889c69e0bf82c083"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "62d3acf0e33805d5309154e95195fea1",
    "name": "Mũi Tên Xanh (Phần 8)",
    "origin_name": "Arrow (Season 8)",
    "slug": "mui-ten-xanh-phan-8",
    "poster_url": "https://phimimg.com/upload/vod/20240624-1/0e89eb835c9e4aa9d0bfa15f76e30bc1.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240624-1/2476fae869e6861d22782765b8745272.jpg",
    "year": 2019,
    "episode_current": "Hoàn Tất (10/10)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Chính Kịch",
        "slug": "chinh-kich",
        "id": "37a7b38b6184a5ebd3c43015aa20709d"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "dfb61b74af460c2fd68bb8266f9f0814",
    "name": "Mũi Tên Xanh (Phần 7)",
    "origin_name": "Arrow (Season 7)",
    "slug": "mui-ten-xanh-phan-7",
    "poster_url": "https://phimimg.com/upload/vod/20240624-1/3d68187adaa95b5db76be0927d38d3ae.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240624-1/168049d33f6a7d3e0837dc8e6cfb561f.jpg",
    "year": 2018,
    "episode_current": "Hoàn Tất (22/22)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "8cad7770bea867c44a6cd63bae19903d",
    "name": "Mũi Tên Xanh (Phần 6)",
    "origin_name": "Arrow (Season 6)",
    "slug": "mui-ten-xanh-phan-6",
    "poster_url": "https://phimimg.com/upload/vod/20240624-1/18e37d50fdb5c7363af8a68128cd497d.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240624-1/5574b9b0bbc709982476d93f1961a313.jpg",
    "year": 2017,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "4de7729ea5daf28540ee79b3dca73d19",
    "name": "Mũi Tên Xanh (Phần 4)",
    "origin_name": "Arrow (Season 4)",
    "slug": "mui-ten-xanh-phan-4",
    "poster_url": "https://phimimg.com/upload/vod/20240624-1/c96504e894da576df35e6faf580ca437.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240624-1/d86e075e13d1719c2a8fdb985da9643c.jpg",
    "year": 2015,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "4a7d2be8648d00c3d1090ed4168a5748",
    "name": "Mũi Tên Xanh (Phần 3)",
    "origin_name": "Arrow (Season 3)",
    "slug": "mui-ten-xanh-phan-3",
    "poster_url": "https://phimimg.com/upload/vod/20240624-1/2253286b27c969b83c5dc9c42cea05a2.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240624-1/a59311c95413ea12fb6490a39ed37165.jpg",
    "year": 2014,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "a53d1388191884b75c48bebb18709bfb",
    "name": "Cung Thủ Siêu Phàm",
    "origin_name": "War Of The Arrows",
    "slug": "cung-thu-sieu-pham",
    "poster_url": "https://phimimg.com/upload/vod/20231211-1/aadb17eb61724c75bc52295cd6d1a447.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231211-1/a51487c359dfbc95cf19cef0763f45d6.jpg",
    "year": 2011,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      }
    ],
    "country": [
      {
        "name": "Hàn Quốc",
        "slug": "han-quoc",
        "id": "05de95be5fc404da9680bbb3dd8262e6"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "0a118184382a407bba7aef472932273e",
    "name": "Mũi Tên Xanh (Phần 1)",
    "origin_name": "Arrow (Season 1)",
    "slug": "mui-ten-xanh-phan-1",
    "poster_url": "https://phimimg.com/upload/vod/20231207-1/442878ab7f3917ecd25618d2be84e5ea.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231207-1/878bd31c07705993492dbcf1a4f5080a.jpg",
    "year": 2012,
    "episode_current": "Hoàn Tất (23/23)",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "1074cf6dee6fd3a453ea3fa9d190a430",
    "name": "Hành Tinh Chết",
    "origin_name": "Arrowhead",
    "slug": "hanh-tinh-chet",
    "poster_url": "https://phimimg.com/upload/vod/20231208-1/bfa42068a158b6585b47c1c2c44ff549.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231208-1/bfa42068a158b6585b47c1c2c44ff549.jpg",
    "year": 2016,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Thuyết Minh",
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
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "3202111cf90e7c816a472aaceb72b0df",
    "name": "Mũi Tên Gãy",
    "origin_name": "Broken Arrow",
    "slug": "mui-ten-gay",
    "poster_url": "https://phimimg.com/upload/vod/20231111-1/6eb19e7a4ed646026edd83f2b109c482.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231111-1/f96f5d81a1698f96c9127372b7b64957.jpg",
    "year": 1996,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
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
    ],
    "vote_average": 8.2,
    "subFranchise": "series"
  },
  {
    "_id": "4efa8b668ee1198289bb15965d9705b6",
    "name": "Catwoman: Hunted",
    "origin_name": "Catwoman: Hunted",
    "slug": "catwoman-hunted",
    "poster_url": "https://phimimg.com/upload/vod/20231202-1/e34a890f5b312bb9398b7b8ea9242523.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20231202-1/38fce7bd253d56c7e8f1bf06b127deb1.jpg",
    "year": 2022,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
      {
        "name": "Hoạt Hình",
        "slug": "hoat-hinh",
        "id": "d9983d88d8929b1d9f767884e2999e27"
      },
      {
        "name": "Hành Động",
        "slug": "hanh-dong",
        "id": "9822be111d2ccc29c7172c78b8af8ff5"
      },
      {
        "name": "Hình Sự",
        "slug": "hinh-su",
        "id": "7a035ac0b37f5854f0f6979260899c90"
      }
    ],
    "country": [
      {
        "name": "Âu Mỹ",
        "slug": "au-my",
        "id": "74d9fa92f4dea9ecea8fc2233dc7921a"
      }
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  },
  {
    "_id": "a9db15913897019149a2807337f4a0f8",
    "name": "Miêu Nữ",
    "origin_name": "Catwoman",
    "slug": "mieu-nu",
    "poster_url": "https://phimimg.com/upload/vod/20240128-1/3ce57ca3c648a203418a70eaa13783fa.jpg",
    "thumb_url": "https://phimimg.com/upload/vod/20240128-1/803b0686a7aa36f8aba79f7a7d40e850.jpg",
    "year": 2004,
    "episode_current": "Full",
    "quality": "HD",
    "lang": "Vietsub",
    "category": [
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
    ],
    "vote_average": 8.2,
    "subFranchise": "batman"
  }
];

export const MARVEL_SUB_FRANCHISES = [
  { id: "all", label: "Tất Cả Marvel" },
  { id: "avengers", label: "Avengers & Sự Kiện" },
  { id: "spiderman", label: "Spider-Man & Venom" },
  { id: "xmen", label: "X-Men & Deadpool" },
  { id: "series", label: "Marvel Series (Disney+)" },
  { id: "standalone", label: "Anh Hùng Khác" },
];

export const DC_SUB_FRANCHISES = [
  { id: "all", label: "Tất Cả DC" },
  { id: "batman", label: "Kỵ Sĩ Bóng Đêm & Gotham" },
  { id: "justice-league", label: "Liên Minh Công Lý" },
  { id: "villains", label: "Phản Diện & Joker" },
  { id: "series", label: "DC Series & Truyền Hình" },
  { id: "standalone", label: "Anh Hùng Khác" },
];

export type UniverseType = "marvel" | "dc" | "doraemon" | "conan";

export {
  DORAEMON_SPOTLIGHTS,
  DORAEMON_SUB_FRANCHISES,
  DORAEMON_UNIVERSE_FILMS,
} from "./doraemon-catalog";

export {
  CONAN_SPOTLIGHTS,
  CONAN_SUB_FRANCHISES,
  CONAN_UNIVERSE_FILMS,
} from "./conan-catalog";

import {
  DORAEMON_SPOTLIGHTS,
  DORAEMON_UNIVERSE_FILMS,
} from "./doraemon-catalog";

import {
  CONAN_SPOTLIGHTS,
  CONAN_UNIVERSE_FILMS,
} from "./conan-catalog";

export function getUniverseSpotlights(universe: UniverseType): UniverseSpotlightItem[] {
  if (universe === "marvel") return MARVEL_SPOTLIGHTS;
  if (universe === "dc") return DC_SPOTLIGHTS;
  if (universe === "doraemon") return DORAEMON_SPOTLIGHTS;
  if (universe === "conan") return CONAN_SPOTLIGHTS;
  return [];
}

export const getUniverseCatalog = getUniverseFilms;

export function getUniverseFilms(
  universe: UniverseType,
  options?: {
    subFranchise?: string;
    year?: string;
    quality?: string;
    audio?: string;
    search?: string;
    sort?: string;
  }
): UniverseFilmItem[] {
  let baseList: UniverseFilmItem[] = [];
  if (universe === "marvel") baseList = MARVEL_UNIVERSE_FILMS;
  else if (universe === "dc") baseList = DC_UNIVERSE_FILMS;
  else if (universe === "doraemon") baseList = DORAEMON_UNIVERSE_FILMS;
  else if (universe === "conan") baseList = CONAN_UNIVERSE_FILMS;
  let list = [...baseList];

  if (options?.subFranchise && options.subFranchise !== "all") {
    list = list.filter((f) => f.subFranchise === options.subFranchise);
  }

  if (options?.year) {
    list = list.filter((f) => String(f.year) === String(options.year));
  }

  if (options?.quality && options.quality !== "all") {
    const q = options.quality.toLowerCase();
    if (q === "4k") {
      list = list.filter(
        (f) =>
          (f.quality || "").toLowerCase().includes("4k") ||
          (f.name || "").toLowerCase().includes("4k")
      );
    } else if (q === "fhd") {
      list = list.filter(
        (f) =>
          (f.quality || "").toLowerCase().includes("1080") ||
          (f.quality || "").toLowerCase().includes("fhd")
      );
    } else if (q === "hd") {
      list = list.filter(
        (f) =>
          (f.quality || "").toLowerCase().includes("720") ||
          (f.quality || "").toLowerCase().includes("hd")
      );
    }
  }

  if (options?.audio && options.audio !== "all") {
    if (options.audio === "thuyet-minh") {
      list = list.filter(
        (f) =>
          (f.lang || "").toLowerCase().includes("thuyết minh") ||
          (f.lang || "").toLowerCase().includes("lồng tiếng")
      );
    } else if (options.audio === "vietsub") {
      list = list.filter((f) =>
        (f.lang || "").toLowerCase().includes("vietsub")
      );
    } else if (options.audio === "long-tieng") {
      list = list.filter((f) =>
        (f.lang || "").toLowerCase().includes("lồng tiếng")
      );
    }
  }

  if (options?.search && options.search.trim()) {
    const term = options.search
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
    list = list.filter((f) => {
      const target = (f.name + " " + f.origin_name + " " + f.slug)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
      return target.includes(term);
    });
  }

  if (options?.sort === "rating") {
    list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  } else if (options?.sort === "year") {
    list.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  return list;
}
