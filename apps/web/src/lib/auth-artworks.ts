/**
 * Curated Artworks for Auth Sidebar and Modals
 * Sử dụng 2 ảnh bìa collage điện ảnh sắc nét trong thư mục /images/auth/login:
 * - login-1.webp: Collage các bom tấn đình đám (Rick and Morty, Superman, House of the Dragon,...)
 * - login-2.webp: Toàn cảnh vũ trụ điện ảnh NetPhim độ phân giải siêu nét
 */

export interface AuthArtwork {
  title: string;
  category: "login_cover" | "korean_romance";
  url: string;
}

export const LOGIN_COVER_ARTWORKS: AuthArtwork[] = [
  {
    title: "NetPhim Cinema Universe Collage 1",
    category: "login_cover",
    url: "/images/auth/login/login-1.webp",
  },
  {
    title: "NetPhim Cinema Universe Collage 2",
    category: "login_cover",
    url: "/images/auth/login/login-2.webp",
  },
];

export const STATIC_AUTH_ARTWORKS: AuthArtwork[] = [
  ...LOGIN_COVER_ARTWORKS,
];

/**
 * Chọn ngẫu nhiên 1 trong 2 ảnh bìa login do người dùng cung cấp
 */
export function getRandomAuthArtwork(): AuthArtwork {
  const index = Math.floor(Math.random() * LOGIN_COVER_ARTWORKS.length);
  return LOGIN_COVER_ARTWORKS[index] || LOGIN_COVER_ARTWORKS[0];
}

