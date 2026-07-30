"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState("");

  // 2FA login states
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && !turnstileToken) {
      toast(
        "Vui lòng hoàn thành xác minh Cloudflare Turnstile bảo mật.",
        "error",
      );
      return;
    }

    try {
      const result = await login(email, password);
      if (result && result.require2FA) {
        setRequire2FA(true);
        setTempToken(result.tempToken);
        toast("Vui lòng nhập mã OTP để tiếp tục đăng nhập", "info");
      } else {
        toast("Đăng nhập thành công!", "success");
        const loggedUser = useAuthStore.getState().user;
        const uname = loggedUser?.username || email.split("@")[0];
        router.push(`/profile/${encodeURIComponent(uname)}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const finalMsg = Array.isArray(msg)
        ? msg.join(", ")
        : msg || "Sai thông tin đăng nhập hoặc tài khoản không tồn tại";
      toast(finalMsg, "error");
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setVerifying2FA(true);
    try {
      const { authApi } = await import("@/lib/api");
      await authApi.loginVerify2FA({ tempToken, code: otp });
      toast("Xác thực OTP thành công!", "success");

      const { fetchMe } = useAuthStore.getState();
      await fetchMe();

      const loggedUser = useAuthStore.getState().user;
      router.push(
        `/profile/${encodeURIComponent(loggedUser?.username || "User")}`,
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const finalMsg = Array.isArray(msg)
        ? msg.join(", ")
        : msg || "Mã OTP không chính xác";
      toast(finalMsg, "error");
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { firebaseAuth, googleProvider, signInWithPopup } =
        await import("@/lib/firebase");
      const res = await signInWithPopup(firebaseAuth, googleProvider);
      if (res?.user) {
        const name =
          res.user.displayName || res.user.email?.split("@")[0] || "User";
        const email = res.user.email || `${res.user.uid}@cineverse.app`;
        const role = email.toLowerCase().includes("admin") ? "ADMIN" : "USER";
        useAuthStore.getState().setUser({
          id: res.user.uid,
          email,
          username: name.toLowerCase().replace(/\s+/g, "_"),
          displayName: name,
          avatar: res.user.photoURL || undefined,
          role,
        });
        toast(`Welcome back, ${name}!`, "success");
        router.push(`/profile/${encodeURIComponent(name)}`);
      }
    } catch (err: any) {
      toast("Không thể đăng nhập bằng Google", "error");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-[#0f1319]/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Decorative ambient neon circle background */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mb-4 shadow-lg shadow-emerald-500/10">
          <LogIn size={26} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Đăng Nhập
        </h1>
        <p className="text-xs text-neutral-400 mt-1.5">
          Chào mừng trở lại! Nhập thông tin tài khoản CineVerse của bạn.
        </p>
      </div>

      {/* 2FA OTP Modal View */}
      {require2FA ? (
        <form onSubmit={handleOTPSubmit} className="space-y-5 relative z-10">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <ShieldCheck size={32} className="mx-auto text-emerald-400 mb-2" />
            <h3 className="text-sm font-bold text-white">
              Xác Thực 2 Lớp (2FA)
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Nhập mã 6 chữ số từ ứng dụng Google Authenticator của bạn.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Mã OTP 6 chữ số
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={verifying2FA || otp.length !== 6}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
          >
            {verifying2FA ? "Đang xác thực..." : "Xác Nhận Đăng Nhập"}
          </button>
        </form>
      ) : (
        /* Main Login Form */
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Email / Username Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">
              Email hoặc Tên đăng nhập
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-300">
                Mật khẩu
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-emerald-400 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          </div>

          {/* Cloudflare Turnstile Bot Protection */}
          <div className="pt-2">
            <TurnstileWidget
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => setTurnstileToken("")}
              onExpire={() => setTurnstileToken("")}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !turnstileToken}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50 mt-2"
          >
            {isLoading ? "Đang xử lý..." : "Đăng Nhập Ngay"}
          </button>

          {/* Divider */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-3 bg-[#0f1319] text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              hoặc
            </span>
          </div>

          {/* Google Single Click Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Tiếp tục với Google</span>
          </button>
        </form>
      )}

      {/* Switch to Register link */}
      <div className="text-center mt-6 pt-4 border-t border-white/5 relative z-10">
        <p className="text-xs text-neutral-400">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 hover:underline ml-1"
          >
            Tạo tài khoản mới <ArrowRight size={12} />
          </Link>
        </p>
      </div>
    </div>
  );
}
