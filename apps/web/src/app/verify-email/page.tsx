"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Đang xác thực email của bạn...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Không tìm thấy mã xác thực (Token).");
      return;
    }

    const verify = async () => {
      try {
        const res = await authApi.verifyEmail({ token });
        setStatus("success");
        setMessage(res.data?.message || "Xác thực email thành công!");

        // Auto redirect after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } catch (err: any) {
        setStatus("error");
        const errorMsg = err?.response?.data?.message;
        setMessage(
          Array.isArray(errorMsg)
            ? errorMsg.join(", ")
            : errorMsg || "Xác thực thất bại.",
        );
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full bg-zinc-900/80 p-8 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Đang Xử Lý</h2>
            <p className="text-zinc-400">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Thành Công!</h2>
            <p className="text-zinc-400 mb-6">{message}</p>
            <p className="text-sm text-zinc-500">
              Đang chuyển hướng về trang đăng nhập...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <XCircle className="h-16 w-16 text-red-500 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Lỗi Xác Thực</h2>
            <p className="text-red-400 mb-8">{message}</p>
            <Link
              href="/login"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-full font-medium transition-colors"
            >
              Quay lại Đăng Nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
