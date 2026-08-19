import { Metadata } from "next";
import { Suspense } from "react";
import { SupportHub } from "@/components/legal/SupportHub";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Báo Cáo Sự Cố & Hỗ Trợ Kỹ Thuật | NetPhim",
  description: "Gặp sự cố khi xem phim? Báo cáo trực tiếp đến đội ngũ kỹ thuật NetPhim.",
};

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0d14] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      }
    >
      <SupportHub initialTab="report" />
    </Suspense>
  );
}
