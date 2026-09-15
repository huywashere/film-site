import { Metadata } from "next";
import { Suspense } from "react";
import { SupportHub } from "@/components/legal/SupportHub";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Điều Khoản Sử Dụng Dịch Vụ & Bản Quyền DMCA | FlexPhim",
  description: "Quy định sử dụng dịch vụ và chính sách bản quyền tác giả tại FlexPhim.",
};

export default function TermsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0d14] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      }
    >
      <SupportHub initialTab="terms" />
    </Suspense>
  );
}
