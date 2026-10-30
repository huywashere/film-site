import { Suspense } from "react";
import type { Metadata } from "next";
import { SongNguClient } from "./SongNguClient";
import { SongNguSkeleton } from "@/components/loading/CatalogPageSkeletons";
import { buildSeoMetadata } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = buildSeoMetadata({
  title: "Kho Phim Song Ngữ Chuẩn Full HD | Phụ Đề Kép Anh - Việt | FlexPhim",
  description:
    "Xem phim song ngữ Anh - Việt chất lượng cao Full HD. Hỗ trợ hiển thị phụ đề kép song song, tra từ vựng và luyện phản xạ tiếng Anh tự nhiên.",
  path: "/song-ngu",
  type: "website",
  keywords: [
    "phim song ngữ",
    "phim song ngu anh viet",
    "học tiếng anh qua phim",
    "phụ đề kép",
    "dual subtitles",
    "FlexPhim",
  ],
});

interface SongNguPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export default async function SongNguPage({ searchParams }: SongNguPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const rawPage = Array.isArray(resolvedSearchParams.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams.page;
  const initialPage = Number.isInteger(Number(rawPage)) && Number(rawPage) > 0 ? Number(rawPage) : 1;

  return (
    <Suspense fallback={<SongNguSkeleton />}>
      <SongNguClient initialPage={initialPage} />
    </Suspense>
  );
}
