import { Suspense } from "react";
import type { Metadata } from "next";
import { SongNguClient } from "./SongNguClient";
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b10] pt-20 pb-28 px-3.5 sm:px-6 md:pl-20 md:pr-6 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-12 max-w-[1720px] mx-auto animate-pulse">
          <div className="h-10 w-48 rounded-xl bg-white/[0.04] mb-6" />
          <div className="h-8 w-full max-w-xl rounded-xl bg-white/[0.03] mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3.5 lg:gap-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        </div>
      }
    >
      <SongNguClient initialPage={initialPage} />
    </Suspense>
  );
}
