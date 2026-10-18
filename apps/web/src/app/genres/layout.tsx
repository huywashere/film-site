import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Chủ Đề & Vũ Trụ Điện Ảnh Đỉnh Cao | FlexPhim",
  description:
    "Khám phá 6 vũ trụ điện ảnh và chủ đề thịnh hành: Marvel Studios, DC Universe, Doraemon, Conan, Điện ảnh Hàn Quốc, Trung Quốc, Anime và Song Ngữ AI.",
  path: "/genres",
  imageUrl: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
  imageAlt: "Chủ Đề & Vũ Trụ Điện Ảnh FlexPhim",
  keywords: [
    "Chủ đề điện ảnh",
    "Vũ trụ điện ảnh",
    "Marvel",
    "DC",
    "Doraemon",
    "Conan",
    "Anime",
    "Phim Hàn Quốc",
    "FlexPhim",
  ],
});

export default function GenresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
