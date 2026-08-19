import { Metadata } from "next";
import { Suspense } from "react";
import { SupportHub } from "@/components/legal/SupportHub";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Chính Sách Bảo Mật Thông Tin & Quyền Riêng Tư | NetPhim",
  description: "Tìm hiểu cách NetPhim thu thập và bảo vệ dữ liệu cá nhân của bạn.",
};

export default function PrivacyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0d14] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      }
    >
      <SupportHub initialTab="privacy" />
    </Suspense>
  );
}
