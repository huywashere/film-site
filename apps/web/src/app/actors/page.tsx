import type { Metadata } from "next";
import ActorsPageClient from "./ActorsPageClient";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Danh Sách Diễn Viên & Ngôi Sao Điện Ảnh | FlexPhim",
  description:
    "Khám phá hồ sơ diễn viên, đạo diễn hàng đầu thế giới và xem các bộ phim nổi bật của thần tượng tại FlexPhim.",
  path: "/actors",
  keywords: ["diễn viên", "ngôi sao điện ảnh", "tiểu sử diễn viên", "FlexPhim"],
});

export default function ActorsPage() {
  return <ActorsPageClient />;
}
