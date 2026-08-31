/**
 * Curated Artworks for Auth Sidebar and Modals
 * Chuẩn xác đúng 4 bộ phim ngôn tình Hàn Quốc kinh điển & lãng mạn nhất:
 * 1. Nữ Hoàng Nước Mắt (Queen of Tears - Kim Soo-hyun & Kim Ji-won)
 * 2. Hạ Cánh Nơi Anh (Crash Landing on You - Hyun Bin & Son Ye-jin)
 * 3. Yêu Tinh (Goblin - Gong Yoo & Kim Go-eun)
 * 4. Điên Thì Có Sao (It's Okay to Not Be Okay - Kim Soo-hyun & Seo Yea-ji)
 */

export interface AuthArtwork {
  title: string;
  category: "korean_romance";
  url: string;
}

export const STATIC_AUTH_ARTWORKS: AuthArtwork[] = [
  {
    title: "Nữ Hoàng Nước Mắt (Queen of Tears)",
    category: "korean_romance",
    url: "/images/auth/queen-of-tears.webp",
  },
  {
    title: "Hạ Cánh Nơi Anh (Crash Landing on You)",
    category: "korean_romance",
    url: "/images/auth/crash-landing-on-you.webp",
  },
  {
    title: "Yêu Tinh (Goblin)",
    category: "korean_romance",
    url: "/images/auth/goblin.webp",
  },
  {
    title: "Điên Thì Có Sao (It's Okay to Not Be Okay)",
    category: "korean_romance",
    url: "/images/auth/its-okay-to-not-be-okay.webp",
  },
];

export function getRandomAuthArtwork(): AuthArtwork {
  const index = Math.floor(Math.random() * STATIC_AUTH_ARTWORKS.length);
  return STATIC_AUTH_ARTWORKS[index] || STATIC_AUTH_ARTWORKS[0];
}
