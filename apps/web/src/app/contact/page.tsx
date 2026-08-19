import { Metadata } from "next";
import { Suspense } from "react";
import { SupportHub } from "@/components/legal/SupportHub";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Liên Hệ Ban Quản Trị & Hỗ Trợ Khách Hàng | NetPhim",
  description: "Gửi tin nhắn hoặc liên hệ với ban quản trị NetPhim.",
};

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0d14] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      }
    >
      <SupportHub initialTab="contact" />
    </Suspense>
  );
}
