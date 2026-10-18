import { Suspense } from "react";
import type { Metadata } from "next";
import { SongNguClient, type BilingualSource } from "./SongNguClient";
import { buildSeoMetadata } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = buildSeoMetadata({
  title: "Kho Phim Song Ngữ Chuẩn Full HD | Phụ Đề Kép Anh - Việt | FlexPhim",
  description:
    "Xem phim song ngữ Anh - Việt chất lượng cao Full HD từ nguồn ViCDN và VodPhim. Hỗ trợ hiển thị phụ đề kép song song, tra từ vựng và luyện phản xạ tiếng Anh tự nhiên.",
  path: "/song-ngu",
  type: "website",
  keywords: [
    "phim song ngữ",
    "phim song ngu anh viet",
    "học tiếng anh qua phim",
    "phụ đề kép",
    "dual subtitles",
    "phim vicdn",
    "vodphim",
    "FlexPhim",
  ],
});

interface SongNguPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export default async function SongNguPage({ searchParams }: SongNguPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const rawSource = Array.isArray(resolvedSearchParams.source)
    ? resolvedSearchParams.source[0]
    : resolvedSearchParams.source;
  const initialSource: BilingualSource =
    rawSource === "vicdn" || rawSource === "vodphim" ? rawSource : "all";

  const rawPage = Array.isArray(resolvedSearchParams.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams.page;
  const initialPage = Number.isInteger(Number(rawPage)) && Number(rawPage) > 0 ? Number(rawPage) : 1;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0d12] pt-24 pb-28 px-4 sm:px-8 max-w-[1400px] mx-auto animate-pulse">
          <div className="h-48 rounded-2xl bg-white/[0.03] mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        </div>
      }
    >
      <SongNguClient initialSource={initialSource} initialPage={initialPage} />
    </Suspense>
  );
}
