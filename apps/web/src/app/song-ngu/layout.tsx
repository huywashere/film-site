import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Kho Phim Song Ngữ Chuẩn Full HD | Phụ Đề Kép ViCDN & VodPhim | FlexPhim",
  description:
    "Xem phim song ngữ Anh - Việt chất lượng cao Full HD từ nguồn ViCDN và VodPhim. Hỗ trợ phụ đề kép song song, tra từ vựng và luyện phản xạ tiếng Anh tự nhiên.",
  path: "/song-ngu",
  type: "website",
  keywords: [
    "phim song ngữ",
    "học tiếng anh qua phim",
    "phụ đề kép",
    "dual subtitles",
    "vicdn",
    "vodphim",
    "FlexPhim",
  ],
});

export default function SongNguLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
