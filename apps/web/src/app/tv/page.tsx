import { Metadata } from "next";
import { Suspense } from "react";
import TvClient from "./TvClient";
import { getDefaultChannel } from "@/lib/tv-channels";

export const metadata: Metadata = {
  title: "Truyền Hình Trực Tuyến - Xem Kênh VTV, HTV, THVL & Quốc Tế Miễn Phí | FlexPhim",
  description:
    "Xem truyền hình trực tuyến tốc độ cao, chuẩn Full HD 1080p miễn phí. Tổng hợp đầy đủ các kênh VTV1, VTV2, VTV3, HTV7, HTV9, THVL1, THVL2, ANTV, kênh thể thao và quốc tế.",
  keywords: [
    "truyền hình trực tuyến",
    "xem tivi online",
    "xem vtv3 hd",
    "vtv1 trực tiếp",
    "htv7 trực tuyến",
    "thvl1 trực tiếp",
    "kênh truyền hình việt nam",
    "xem truyền hình miễn phí",
    "live tv vietnam",
  ],
  openGraph: {
    title: "Truyền Hình Trực Tuyến - Xem Kênh VTV, HTV, THVL & Quốc Tế | FlexPhim",
    description:
      "Trực tiếp hơn 35+ kênh truyền hình Việt Nam và thế giới chất lượng cao 1080p: VTV, HTV, THVL, ANTV, Thể Thao và Quốc Tế.",
    type: "website",
    url: "/tv",
  },
};

export default function TvPage() {
  const defaultChannel = getDefaultChannel();

  return (
    <main className="min-h-screen bg-[#0e1015] text-white pt-20 pb-16">
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="aspect-video w-full max-w-4xl mx-auto rounded-2xl bg-white/5 animate-pulse" />
          </div>
        }
      >
        <TvClient initialChannel={defaultChannel} />
      </Suspense>
    </main>
  );
}
