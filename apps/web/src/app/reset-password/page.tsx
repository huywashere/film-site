"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import Link from "next/link";
import {
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useReliableNavigation();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(
        "Không tìm thấy mã đặt lại mật khẩu. Vui lòng kiểm tra lại link trong email.",
      );
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) return;

    setStatus("loading");
    try {
      const res = await authApi.resetPassword({ token, newPassword: password });
      setStatus("success");
      setMessage(res.data?.message || "Đặt lại mật khẩu thành công!");
      toast("Đổi mật khẩu thành công!", "success");

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      const errorMsg = err?.response?.data?.message;
      setMessage(
        Array.isArray(errorMsg)
          ? errorMsg.join(", ")
          : errorMsg || "Đặt lại mật khẩu thất bại.",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-md w-full bg-zinc-900/80 p-8 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Tạo Mật Khẩu Mới
          </h2>
          <p className="text-zinc-400">
            Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        {status === "success" ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-6 mx-auto" />
            <div className="bg-green-500/10 text-green-400 p-4 rounded-lg mb-6 border border-green-500/20">
              {message}
            </div>
            <p className="text-sm text-zinc-500">
              Đang chuyển hướng về trang đăng nhập...
            </p>
          </div>
        ) : status === "error" && !token ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <XCircle className="h-16 w-16 text-red-500 mb-6 mx-auto" />
            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-6 border border-red-500/20">
              {message}
            </div>
            <Link
              href="/forgot-password"
              className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
            >
              Yêu cầu lại link mới
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === "error" && (
              <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20 text-sm animate-in fade-in duration-200">
                {message}
              </div>
            )}

            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:border-primary focus:outline-none transition-colors pr-12 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3.5 rounded-xl transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Đang xử lý...
                </>
              ) : (
                "Lưu Mật Khẩu"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black px-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
