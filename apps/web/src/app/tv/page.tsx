import { Metadata } from "next";
import { Suspense } from "react";
import TvClient from "./TvClient";
import { getDefaultChannel, getChannelBySlug } from "@/lib/tv-channels";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

interface TvPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TvPage({ searchParams }: TvPageProps) {
  const resolvedParams = await searchParams;
  const channelParam =
    typeof resolvedParams?.channel === "string"
      ? resolvedParams.channel
      : Array.isArray(resolvedParams?.channel)
        ? resolvedParams.channel[0]
        : undefined;

  const initialChannel =
    (channelParam ? getChannelBySlug(channelParam) : undefined) || getDefaultChannel();

  return (
    <div
      className={cn(
        cardFont.className,
        "min-h-screen bg-[#0a0b10] text-white pt-[74px] sm:pt-[78px] md:pt-20 pb-24 sm:pb-28 lg:pb-16 lg:pl-20 relative selection:bg-[#23ade5]/30",
      )}
    >
      {/* Background ambient radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(35,173,229,0.07),transparent_70%)]"
        aria-hidden="true"
      />

      <Suspense
        fallback={
          <div className="mx-auto max-w-[1720px] px-3 sm:px-6 lg:px-8 space-y-6 animate-pulse">
            <div className="border-b border-white/[0.08] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="h-6 w-48 rounded-full bg-white/[0.08]" />
                <div className="h-8 w-80 rounded-xl bg-white/[0.06]" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-4">
                <div className="aspect-video w-full rounded-2xl bg-white/[0.04] border border-white/10" />
              </div>
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0e1017] p-4 h-[500px]" />
              </div>
            </div>
          </div>
        }
      >
        <TvClient initialChannel={initialChannel} />
      </Suspense>
    </div>
  );
}
