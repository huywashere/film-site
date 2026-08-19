import { Metadata } from "next";
import { Suspense } from "react";
import { SupportHub } from "@/components/legal/SupportHub";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Trung Tâm Hỗ Trợ & Pháp Lý | NetPhim",
  description: "Trung tâm hỗ trợ, báo lỗi, điều khoản sử dụng và chính sách bảo mật tại NetPhim.",
};

export default function HelpPage() {
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
