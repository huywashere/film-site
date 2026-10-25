import { FilmItem } from "@/components/film/FilmCard";

export interface CharacterCard {
  actorId: number;
  actorName: string;
  characterName: string;
  roleTitle: string;
  quote?: string;
  avatarUrl: string;
}

export interface AsianHeroItem extends FilmItem {
  topBadge?: string;
  genres: string[];
  totalEpisodesText?: string;
  calligraphyTitle?: string;
  logoUrl?: string;
  charactersUrl?: string;
  characterCards?: CharacterCard[];
}

/**
 * Builds a robust fallback chain for curated Asian hero assets:
 * 1. Direct correctly-sized CDN asset
 * 2. Cloudflare Edge resize fallback (wsrv.nl)
 * 3. Self-hosted Next.js Server Image Proxy (/api/image-proxy)
 */
export function buildAsianHeroImageCandidates(url?: string | null): string[] {
  if (!url) return [];
  const list: string[] = [];
  const clean = url.trim();
  if (!clean) return [];

  if (clean.includes("image.tmdb.org")) {
    const isLogo = clean.includes(".png") || clean.includes("logo");
    // For backdrops, prioritize original 4K/1080p full-detail resolution first!
    if (!isLogo && (clean.includes("/w1280/") || clean.includes("/w780/"))) {
      const original = clean.replace(/\/t\/p\/w\d+\//, "/t/p/original/");
      if (original !== clean) list.push(original);
    }
    // Direct TMDB CDN
    if (!list.includes(clean)) list.push(clean);
    const widthParam = isLogo
      ? "&w=640"
      : clean.includes("w500")
        ? "&w=500"
        : clean.includes("w780")
          ? "&w=1080"
          : "&w=1920";
    list.push(
      `https://wsrv.nl/?url=${encodeURIComponent(clean)}${widthParam}&output=webp&q=88&we=1`,
    );
    // Local Next.js server image proxy is the final fallback.
    list.push(`/api/image-proxy?url=${encodeURIComponent(clean)}&strict=1`);
  } else {
    // Direct provider CDN first or local public asset
    list.push(clean);
    if (!clean.startsWith("/") && !clean.startsWith("/api/image-proxy")) {
      list.push(`/api/image-proxy?url=${encodeURIComponent(clean)}&strict=1`);
    }
  }

  return list;
}

export const CURATED_CHINESE_HERO_POOL: AsianHeroItem[] = [
  {
    _id: "truc-ngoc",
    name: "Trục Ngọc",
    origin_name: "Pursuit Of Jade",
    slug: "truc-ngoc",
    type: "series",
    topBadge: "🏮 SIÊU PHẨM CỔ TRANG 2026",
    year: 2026,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.7,
    rating: 9.7,
    totalEpisodesText: "Trọn bộ 40 tập",
    genres: ["Cổ Trang", "Chính Kịch", "Tâm Lý", "Tình Cảm"],
    poster_url: "https://phimimg.com/upload/vod/20260307-1/7e5b11b1d5ce3514f6d62787d164b816.jpg",
    thumb_url: "/Folder-Background/China/truc-ngoc/truc-ngoc-backdrop.jpg",
    logoUrl: "/Folder-Background/China/truc-ngoc/truc-ngoc-logo-hd.png",
    titleLogo: "/Folder-Background/China/truc-ngoc/truc-ngoc-logo-hd.png",
    charactersUrl: "/Folder-Background/China/truc-ngoc/truc-ngoc-chars.png",
    content:
      "Cô nàng bán thịt Phàn Trường Ngọc có cuộc gặp gỡ định mệnh với hầu gia lưu lạc Tạ Chinh trong đêm tuyết rơi. Một người quyết chí tự lập làm chủ gia môn, một kẻ ẩn nhẫn gầy dựng lại cơ đồ, cùng viết nên thiên tình sử hào hùng.",
    calligraphyTitle: "Trục Ngọc",
  },
  {
    _id: "cho-hoang-va-xuong",
    name: "Chó Hoang Và Xương",
    origin_name: "Love For You",
    slug: "cho-hoang-va-xuong",
    type: "series",
    topBadge: "🔥 BẠO PHẨM THANH XUÂN 2026",
    year: 2026,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.6,
    rating: 9.6,
    totalEpisodesText: "Trọn bộ 32 tập",
    genres: ["Chính Kịch", "Tâm Lý", "Tình Cảm", "Thanh Xuân"],
    poster_url: "https://phimimg.com/upload/vod/20260705-1/cf344e4d8b5bb10f4eefa2a3ec5463f1.jpg",
    thumb_url: "/Folder-Background/China/cho-hoang-va-xuong/cho-hoang-va-xuong-backdrop.jpg",
    logoUrl: "/Folder-Background/China/cho-hoang-va-xuong/cho-hoang-va-xuong-logo-hd.png",
    titleLogo: "/Folder-Background/China/cho-hoang-va-xuong/cho-hoang-va-xuong-logo-hd.png",
    charactersUrl: "/Folder-Background/China/cho-hoang-va-xuong/cho-hoang-va-xuong-chars.png",
    content:
      "Đôi thanh mai trúc mã Trần Dị và Miêu Tĩnh tưởng chừng đã cắt đứt sau biến cố thời niên thiếu. Cho đến khi Miêu Tĩnh lựa chọn trở về sau nhiều năm tha phương, những xúc cảm âm ỉ năm nào một lần nữa trỗi dậy mãnh liệt.",
    calligraphyTitle: "Chó Hoang Và Xương",
  },
];

export const CURATED_KOREAN_HERO_POOL: AsianHeroItem[] = [
  {
    _id: "keo-ngot-tinh-yeu",
    name: "Kẹo Ngọt Tình Yêu",
    origin_name: "Our Sticky Love",
    slug: "keo-ngot-tinh-yeu",
    type: "series",
    topBadge: "🍬 TOP 1 ROM-COM MỚI",
    year: 2026,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.6,
    rating: 9.6,
    totalEpisodesText: "Trọn bộ 12 tập",
    genres: ["Tình Cảm", "Hài Hước", "Tâm Lý", "Chính Kịch"],
    poster_url: "https://phimimg.com/uploads/movies/20260807/keo-ngot-tinh-yeu-poster.webp",
    thumb_url: "/Folder-Background/Korea/keo-ngot-tinh-yeu/our-sticky-love-backdrop.jpg",
    logoUrl: "/Folder-Background/Korea/keo-ngot-tinh-yeu/our-sticky-love-logo-hd.png",
    titleLogo: "/Folder-Background/Korea/keo-ngot-tinh-yeu/our-sticky-love-logo-hd.png",
    charactersUrl: "/Folder-Background/Korea/keo-ngot-tinh-yeu/our-sticky-love-chars.png",
    content:
      "Một công tố viên đầy tham vọng bị mất trí nhớ và chuyển đến sống cùng một huấn luyện viên quyền Anh tự nhận là bạn trai cô. Liệu tình huống éo le này có dẫn đến tình yêu đích thực?",
    calligraphyTitle: "Kẹo Ngọt Tình Yêu",
  },
  {
    _id: "cong-anh-ma-chay",
    name: "Cõng Anh Mà Chạy",
    origin_name: "Lovely Runner",
    slug: "cong-anh-ma-chay",
    type: "series",
    topBadge: "✨ HIỆN TƯỢNG THANH XUÂN",
    year: 2024,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.7,
    rating: 9.7,
    totalEpisodesText: "Trọn bộ 16 tập",
    genres: ["Lãng Mạn", "Kỳ Ảo", "Xuyên Không", "Thanh Xuân"],
    poster_url: "https://phimimg.com/upload/vod/20260509-1/ca355fb74afa0dbfa2717e91fd7be5c4.jpg",
    thumb_url: "/Folder-Background/Korea/cong-anh-ma-chay/lovely-runner-backdrop.jpg",
    logoUrl: "/Folder-Background/Korea/cong-anh-ma-chay/lovely-runner-logo-hd.png",
    titleLogo: "/Folder-Background/Korea/cong-anh-ma-chay/lovely-runner-logo-hd.png",
    charactersUrl: "/Folder-Background/Korea/cong-anh-ma-chay/lovely-runner-chars.png",
    content:
      "Im Sol, một người hâm mộ cuồng nhiệt vô tình xuyên không về 15 năm trước để cứu thần tượng Ryu Sun-jae khỏi định mệnh bi kịch, từ đó mở ra mối lương duyên ngọt ngào vượt thời gian.",
    calligraphyTitle: "Cõng Anh Mà Chạy",
  },
];

export const CURATED_ANIME_HERO_POOL: AsianHeroItem[] = [
  {
    _id: "thanh-guom-diet-quy",
    name: "Thanh Gươm Diệt Quỷ",
    origin_name: "Demon Slayer: Kimetsu no Yaiba",
    slug: "thanh-guom-diet-quy",
    type: "series",
    topBadge: "🔥 BOM TẤN ANIME TOÀN CẦU",
    year: 2024,
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    vote_average: 9.8,
    rating: 9.8,
    totalEpisodesText: "Trọn bộ các mùa",
    genres: ["Hành Động", "Siêu Nhiên", "Kiếm Hiệp", "Shounen"],
    poster_url: "https://image.tmdb.org/t/p/w780/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/ecghlDeabR3X3Vv8tXIOeXHQvQe.png",
    content:
      "Hành trình của chàng thiếu niên Kamado Tanjirou gia nhập Sát Quỷ Đoàn để tiêu diệt chúa quỷ Muzan và tìm cách biến em gái Nezuko trở lại thành người.",
    calligraphyTitle: "Demon Slayer",
  },
  {
    _id: "toi-thang-cap-mot-minh",
    name: "Tôi Thăng Cấp Một Mình",
    origin_name: "Solo Leveling",
    slug: "toi-thang-cap-mot-minh",
    type: "series",
    topBadge: "👑 ĐẠI BẠO ACTION 2024",
    year: 2024,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.6,
    rating: 9.6,
    totalEpisodesText: "Mùa 1 Trọn bộ",
    genres: ["Hành Động", "Hầm Ngục", "Trọng Sinh", "Kỳ Ảo"],
    poster_url: "https://image.tmdb.org/t/p/w780/geCRueV3ElhRTr0xtJuEWJt6dJ1.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/xMNH87maNLt9n2bMDYeI6db5VFm.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/soogvWTvbW2YVpZwUz0SgPBKiVa.png",
    content:
      "Sung Jin-Woo - thợ săn yếu nhất nhân loại bất ngờ thức tỉnh hệ thống nhiệm vụ độc nhất, từng bước thăng cấp trở thành Thợ Săn Bóng Tối mạnh nhất thế giới.",
    calligraphyTitle: "Solo Leveling",
  },
  {
    _id: "chu-thuat-hoi-chien",
    name: "Chú Thuật Hồi Chiến",
    origin_name: "Jujutsu Kaisen",
    slug: "chu-thuat-hoi-chien",
    type: "series",
    topBadge: "⚡ SIÊU PHẨM CHÚ THUẬT",
    year: 2023,
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    vote_average: 9.7,
    rating: 9.7,
    totalEpisodesText: "Trọn bộ 47 tập",
    genres: ["Hành Động", "Huyền Huyễn", "Siêu Nhiên", "Shounen"],
    poster_url: "https://image.tmdb.org/t/p/w780/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/qpin8cASXEVtwhzNsprHYFiOAGk.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/tEmqJ1k4MdjuaKaetn8wGyZGcyC.png",
    content:
      "Itadori Yuuji nuốt phải ngón tay của Nguyền Vương Sukuna và bước vào trường Chú thuật Tokyo để đối đầu với những nguyền hồn tàn ác nhất.",
    calligraphyTitle: "Jujutsu Kaisen",
  },
  {
    _id: "dai-chien-titan",
    name: "Đại Chiến Titan",
    origin_name: "Attack on Titan",
    slug: "dai-chien-titan",
    type: "series",
    topBadge: "⚔️ HUYỀN THOẠI THẾ KỶ",
    year: 2023,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.9,
    rating: 9.9,
    totalEpisodesText: "Trọn bộ Final Season",
    genres: ["Chiến Tranh", "Kỳ Ảo", "Hành Động", "Tâm Lý"],
    poster_url: "https://image.tmdb.org/t/p/w780/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/eHMfVTIwen9anB4HuvQlFRGZFms.png",
    content:
      "Trận chiến sinh tồn khốc liệt bảo vệ nhân loại sau bức tường trước loài Titan ăn thịt người và sự thật tàn khốc về tự do thế giới.",
    calligraphyTitle: "Attack on Titan",
  },
  {
    _id: "dao-hai-tac-one-piece",
    name: "Đảo Hải Tặc",
    origin_name: "One Piece",
    slug: "dao-hai-tac",
    type: "series",
    topBadge: "🏴‍☠️ HUYỀN THOẠI SHIPPEN",
    year: 2024,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.9,
    rating: 9.9,
    totalEpisodesText: "Hơn 1100+ tập",
    genres: ["Hành Động", "Phiêu Lưu", "Hài Hước", "Shounen"],
    poster_url: "https://image.tmdb.org/t/p/w780/dB4EDhre2dsC2kxYDavyKWqLQwi.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/2rmK7mnchw9Xr3XdiTFSxTTLXqv.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/9F7daAmibx8ZHTE17CdM5FAwiHE.png",
    content:
      "Hành trình giương buồm ra Đại Hải Trình của thuyền trưởng Monkey D. Luffy và băng Mũ Rơm để tìm kiếm kho báu huyền thoại One Piece và trở thành Vua Hải Tặc.",
    calligraphyTitle: "One Piece",
  },
  {
    _id: "ten-cau-la-gi",
    name: "Tên Cậu Là Gì?",
    origin_name: "Your Name (Kimi no Na wa)",
    slug: "ten-cau-la-gi",
    type: "single",
    topBadge: "🌌 SIÊU PHẨM ĐIỆN ẢNH CHIẾU RẠP",
    year: 2016,
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    vote_average: 9.8,
    rating: 9.8,
    totalEpisodesText: "Phim Lẻ Chiếu Rạp",
    genres: ["Lãng Mạn", "Kỳ Ảo", "Học Đường", "Chính Kịch"],
    poster_url: "https://image.tmdb.org/t/p/w780/vfJFJPepRKapMd5G2ro7klIRysq.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/8x9iKH8kWA0zdkgNdpAew7OstYe.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/zKI7UKmsB5ywy6Rjs3wWvBfhafJ.png",
    content:
      "Mối liên kết diệu kỳ xuyên qua không gian và thời gian giữa Mitsuha - nữ sinh vùng quê và Taki - nam sinh Tokyo qua những giấc mơ hoán đổi thân xác.",
    calligraphyTitle: "Your Name",
  },
  {
    _id: "phap-su-tien-tang-frieren",
    name: "Pháp Sư Tiễn Táng Frieren",
    origin_name: "Sousou no Frieren",
    slug: "phap-su-tien-tang-frieren",
    type: "series",
    topBadge: "🌟 TOP 1 ANIME MỌI THỜI ĐẠI",
    year: 2024,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.9,
    rating: 9.9,
    totalEpisodesText: "Trọn bộ 28 tập",
    genres: ["Phiêu Lưu", "Kỳ Ảo", "Chính Kịch", "Phép Thuật"],
    poster_url: "https://image.tmdb.org/t/p/w780/cHhJzdUGcEBq6av4wr9jsIvUITH.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/yQuc8JcBxRWXfRHrNUSM47gCXOo.png",
    content:
      "Hành trình chiêm nghiệm ý nghĩa của thời gian và tình người của nữ pháp sư yêu tinh Frieren sau khi cùng nhóm dũng sĩ đánh bại Quỷ Vương.",
    calligraphyTitle: "Frieren",
  },
  {
    _id: "gia-dinh-diep-vien",
    name: "Gia Đình Điệp Viên",
    origin_name: "Spy x Family",
    slug: "gia-dinh-diep-vien",
    type: "series",
    topBadge: "🕵️ SIÊU PHẨM HÀI HƯỚC GIA ĐÌNH",
    year: 2023,
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    vote_average: 9.6,
    rating: 9.6,
    totalEpisodesText: "Trọn bộ 2 Mùa",
    genres: ["Hài Hước", "Hành Động", "Gia Đình", "Shounen"],
    poster_url: "https://image.tmdb.org/t/p/w780/7NAvPYPAu7MeHwP8E9sn81PqsRh.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/lysUnU6V0VfcthDbviuVlIqgHOR.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/hbZ7fVgxEg50plxtQHpVyXAppCq.png",
    content:
      "Để thực hiện nhiệm vụ bí mật giữ gìn hòa bình thế giới, chàng điệp viên Twilight lập nên một gia đình giả với vợ là sát thủ và con gái là siêu năng lực gia đọc suy nghĩ.",
    calligraphyTitle: "Spy x Family",
  },
  {
    _id: "tho-san-quy-chainsaw-man",
    name: "Thợ Săn Quỷ",
    origin_name: "Chainsaw Man",
    slug: "tho-san-quy",
    type: "series",
    topBadge: "🪚 SIÊU PHẨM BẠO LỰC MÃN NHÃN",
    year: 2022,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.7,
    rating: 9.7,
    totalEpisodesText: "Trọn bộ Mùa 1",
    genres: ["Hành Động", "Kinh Dị", "Siêu Nhiên", "Shounen"],
    poster_url: "https://image.tmdb.org/t/p/w780/iFM1dyFi0rByvEomEkmm7NpQeeb.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/5DUMPBSnHOZsbBv81GFXZXvDpo6.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/8X3AdUA5q3owusAXOiCOn3FwXUa.png",
    content:
      "Chàng trai trẻ Denji hồi sinh sau khi hợp nhất với chú quỷ cưa Pochita, trở thành Chainsaw Man và gia nhập Cục An Toàn Công Cộng để săn lùng loài quỷ.",
    calligraphyTitle: "Chainsaw Man",
  },
  {
    _id: "naruto-shippuden",
    name: "Naruto Shippuden",
    origin_name: "Naruto Shippūden",
    slug: "naruto-shippuden",
    type: "series",
    topBadge: "🍥 HUYỀN THOẠI NINJA",
    year: 2024,
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    vote_average: 9.9,
    rating: 9.9,
    totalEpisodesText: "Trọn bộ 500 tập",
    genres: ["Hành Động", "Ninja", "Phiêu Lưu", "Shounen"],
    poster_url: "https://image.tmdb.org/t/p/w780/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/z0YhJvomqedHF85bplUJEotkN5l.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/qopvxH4C4YIoeJWss0EVLv13rgW.png",
    content:
      "Sau 2 năm rưỡi rèn luyện cùng Tiên Nhân Háo Sắc Jiraiya, Naruto trở về Làng Lá để giải cứu Sasuke và đối đầu với tổ chức Akatsuki nguy hiểm nhất giới Ninja.",
    calligraphyTitle: "Naruto Shippuden",
  },
  {
    _id: "tho-san-ti-hon-hunter-x-hunter",
    name: "Thợ Săn Tí Hon",
    origin_name: "Hunter x Hunter",
    slug: "tho-san-ti-hon",
    type: "series",
    topBadge: "🏹 KIỆT TÁC PHIÊU LƯU SHOUNEN",
    year: 2023,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.9,
    rating: 9.9,
    totalEpisodesText: "Trọn bộ 148 tập",
    genres: ["Hành Động", "Phiêu Lưu", "Kỳ Ảo", "Shounen"],
    poster_url: "https://image.tmdb.org/t/p/w780/i2EEr2uBvRlAwJ8d8zTG2Y19mIa.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/bFKKyCI89Xq98Gul8cGox8K3sZa.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/upEvx63ZDsbT9VJyDNEb2WSLhUR.png",
    content:
      "Cậu bé Gon Freecss bắt đầu cuộc hành trình trở thành Hunter huyền thoại để tìm kiếm người cha mất tích và gặp gỡ những người bạn chí cốt Killua, Kurapika, Leorio.",
    calligraphyTitle: "Hunter x Hunter",
  },
  {
    _id: "khoa-chat-cua-nao-suzume",
    name: "Khóa Chặt Cửa Nào Suzume",
    origin_name: "Suzume no Tojimari",
    slug: "khoa-chat-cua-nao-suzume",
    type: "single",
    topBadge: "🚪 KIỆT TÁC ĐIỆN ẢNH MAKOTO SHINKAI",
    year: 2023,
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    vote_average: 9.8,
    rating: 9.8,
    totalEpisodesText: "Phim Lẻ Chiếu Rạp",
    genres: ["Kỳ Ảo", "Lãng Mạn", "Phiêu Lưu", "Chính Kịch"],
    poster_url: "https://image.tmdb.org/t/p/w780/yStW1TXF5s7Tbtu9KjIZEaWl6HL.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/4tdV5AeojEdbvn6VpeQrbuDlmzs.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/q543yE9gmhqbMkVUtwE0YzRFMzO.png",
    content:
      "Cô nữ sinh 17 tuổi Suzume cùng chàng trai bí ẩn Souta du hành khắp Nhật Bản để đóng những cánh cửa tai họa đang đe dọa nuốt chửng cả quốc gia.",
    calligraphyTitle: "Suzume",
  },
  {
    _id: "one-punch-man",
    name: "Đấm Phát Chết Luôn (One-Punch Man)",
    origin_name: "One-Punch Man",
    slug: "dam-phat-chet-luon-phan-1",
    type: "series",
    topBadge: "🥊 THÁNH PHỒNG TÔM BẤT BẠI",
    year: 2024,
    quality: "FHD",
    lang: "Vietsub + Lồng Tiếng",
    vote_average: 9.8,
    rating: 9.8,
    totalEpisodesText: "Trọn bộ 2 Mùa",
    genres: ["Hành Động", "Hài Hước", "Siêu Anh Hùng", "Shounen"],
    poster_url: "https://image.tmdb.org/t/p/w780/dT10AxJIXVvRwFAew4tt2RhzJrD.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/s0w8JbuNNxL1YgaHeDWih12C3jG.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/s4c20xXgSDjbYAcpKchuWRU3zuR.png",
    content:
      "Saitama - chàng trai trở thành anh hùng chỉ vì đam mê sau 3 năm khổ luyện đến mức rụng hết tóc. Sở hữu sức mạnh vô song đến mức có thể hạ gục mọi quái vật khủng khiếp nhất chỉ bằng một cú đấm duy nhất.",
    calligraphyTitle: "One-Punch Man",
  },
  {
    _id: "dragon-ball-super",
    name: "Bảy Viên Ngọc Rồng Siêu Cấp",
    origin_name: "Dragon Ball Super",
    slug: "dragon-ball-super",
    type: "series",
    topBadge: "💥 SIÊU PHẨM CHIẾN ĐẤU VŨ TRỤ",
    year: 2023,
    quality: "FHD",
    lang: "Vietsub + Thuyết Minh",
    vote_average: 9.7,
    rating: 9.7,
    totalEpisodesText: "Trọn bộ 131 tập",
    genres: ["Hành Động", "Võ Thuật", "Kỳ Ảo", "Shounen"],
    poster_url: "https://image.tmdb.org/t/p/w780/qEUrbXJ2qt4Rg84Btlx4STOhgte.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/qA2UwUQbj05aeBMCuC0mHSQ4loE.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/qpkdM5lO3Kfpcuzjz2fxSLVRWCf.png",
    content:
      "Goku và các chiến binh Z bước vào những trận chiến đỉnh cao vượt ngoài vũ trụ khi Thần Hủy Diệt Beerus thức tỉnh và Giải đấu Sức mạnh Đa Vũ Trụ mở ra.",
    calligraphyTitle: "Dragon Ball Super",
  },
];

/**
 * Hero pool for the AI Bilingual Dubbing (Song Ngữ AI) universe hub.
 * These are blockbuster Hollywood / international titles available via ViCDN's
 * AI-generated bilingual dubbing track.
 */
export const CURATED_SONG_NGU_AI_HERO_POOL: AsianHeroItem[] = [
  {
    _id: "avengers-endgame",
    name: "Avengers: Hồi Kết",
    origin_name: "Avengers: Endgame",
    slug: "avengers-endgame",
    type: "single",
    topBadge: "🎙️ SONG NGỮ AI · BOM TẤN MARVEL",
    year: 2019,
    quality: "FHD",
    lang: "Song Ngữ AI",
    vote_average: 9.8,
    rating: 9.8,
    totalEpisodesText: "Phim Lẻ · 181 phút",
    genres: ["Hành Động", "Khoa Học Viễn Tưởng", "Siêu Anh Hùng", "Phiêu Lưu"],
    poster_url: "https://image.tmdb.org/t/p/w780/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/9yjP4c6GBpBmFiqKh5MRFGbhvYP.png",
    content:
      "Sau thất bại thảm khốc trước Thanos, các siêu anh hùng còn sót lại bắt tay thực hiện kế hoạch du hành thời gian táo bạo để thay đổi vận mệnh vũ trụ và hồi sinh những người đã biến mất.",
    calligraphyTitle: "Avengers: Endgame",
  },
  {
    _id: "interstellar",
    name: "Hành Trình Giữa Các Vì Sao",
    origin_name: "Interstellar",
    slug: "interstellar",
    type: "single",
    topBadge: "🌌 SONG NGỮ AI · CHRISTOPHER NOLAN",
    year: 2014,
    quality: "FHD",
    lang: "Song Ngữ AI",
    vote_average: 9.7,
    rating: 9.7,
    totalEpisodesText: "Phim Lẻ · 169 phút",
    genres: ["Khoa Học Viễn Tưởng", "Phiêu Lưu", "Chính Kịch", "Triết Học"],
    poster_url: "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/pbrkL804c8yAv3zBZR4QPEafpAR.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/m7n3KQFcajHJFioCwhwpHRXSN9l.png",
    content:
      "Khi Trái Đất đứng trước thảm họa diệt vong, nhóm phi hành gia dũng cảm vượt qua lỗ sâu đục không-thời gian để tìm hành tinh mới cho nhân loại, chấp nhận hy sinh mọi thứ — kể cả gia đình.",
    calligraphyTitle: "Interstellar",
  },
  {
    _id: "the-dark-knight",
    name: "Hiệp Sĩ Bóng Đêm",
    origin_name: "The Dark Knight",
    slug: "the-dark-knight",
    type: "single",
    topBadge: "🦇 SONG NGỮ AI · HUYỀN THOẠI DC",
    year: 2008,
    quality: "FHD",
    lang: "Song Ngữ AI",
    vote_average: 9.9,
    rating: 9.9,
    totalEpisodesText: "Phim Lẻ · 152 phút",
    genres: ["Hành Động", "Tội Phạm", "Siêu Anh Hùng", "Thriller"],
    poster_url: "https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/eSmmYVkYfpwRqBCrDs2hjNxFrTK.png",
    content:
      "Batman đối mặt với kẻ thù hỗn loạn và thiên tài tội ác nhất Gotham — Joker. Cuộc chiến không hồi kết giữa trật tự và hỗn loạn đặt ra câu hỏi: con người tốt đẹp sẽ đứng vững được bao lâu?",
    calligraphyTitle: "The Dark Knight",
  },
  {
    _id: "inception",
    name: "Kẻ Đánh Cắp Giấc Mơ",
    origin_name: "Inception",
    slug: "inception",
    type: "single",
    topBadge: "💭 SONG NGỮ AI · MIND-BLOWING NOLAN",
    year: 2010,
    quality: "FHD",
    lang: "Song Ngữ AI",
    vote_average: 9.6,
    rating: 9.6,
    totalEpisodesText: "Phim Lẻ · 148 phút",
    genres: ["Khoa Học Viễn Tưởng", "Hành Động", "Thriller", "Bí Ẩn"],
    poster_url: "https://image.tmdb.org/t/p/w780/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/tJHB0fq4k5b8QLEqNiVwqmWFX9E.png",
    content:
      "Dom Cobb — chuyên gia xâm nhập tiềm thức thông qua giấc mơ — nhận nhiệm vụ bất khả thi: không phải đánh cắp ý tưởng mà cấy ghép một ý tưởng vào đầu người khác mà không bị phát hiện.",
    calligraphyTitle: "Inception",
  },
  {
    _id: "oppenheimer",
    name: "Cha Đẻ Bom Nguyên Tử",
    origin_name: "Oppenheimer",
    slug: "oppenheimer",
    type: "single",
    topBadge: "⚛️ SONG NGỮ AI · OSCAR 2024",
    year: 2023,
    quality: "FHD",
    lang: "Song Ngữ AI",
    vote_average: 9.4,
    rating: 9.4,
    totalEpisodesText: "Phim Lẻ · 180 phút",
    genres: ["Lịch Sử", "Tiểu Sử", "Chính Kịch", "Khoa Học"],
    poster_url: "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/dSi8wWlDQXDUq7GJOVAEZPtmEJT.png",
    content:
      "Thiên tài vật lý J. Robert Oppenheimer vật lộn giữa sứ mệnh khoa học và gánh nặng đạo đức khi dẫn đầu Dự án Manhattan — cha đẻ của vũ khí hủy diệt đã thay đổi lịch sử nhân loại mãi mãi.",
    calligraphyTitle: "Oppenheimer",
  },
  {
    _id: "dune-part-two",
    name: "Hành Tinh Cát 2",
    origin_name: "Dune: Part Two",
    slug: "dune-part-two",
    type: "single",
    topBadge: "🏜️ SONG NGỮ AI · SỬ THI VŨ TRỤ 2024",
    year: 2024,
    quality: "FHD",
    lang: "Song Ngữ AI",
    vote_average: 9.3,
    rating: 9.3,
    totalEpisodesText: "Phim Lẻ · 166 phút",
    genres: ["Khoa Học Viễn Tưởng", "Sử Thi", "Hành Động", "Phiêu Lưu"],
    poster_url: "https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlDjQ92zSIOdMOs.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/6ueJU8HpZwBCNxRJ2grPKYqLN7.png",
    content:
      "Paul Atreides liên minh cùng người Fremen để trả thù cho cha và bảo vệ hành tinh cát Arrakis. Nhưng định mệnh tiên tri đẩy anh tới một sự lựa chọn không thể tránh: trở thành vị cứu tinh hay kẻ hủy diệt.",
    calligraphyTitle: "Dune: Part Two",
  },
];
