"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  UserPlus,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";

export function RegisterForm() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const { toast } = useToast();

  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Password Strength Calculator (0 - 4) ──
  const passwordStrength = useMemo(() => {
    const pw = form.password;
    if (!pw) return { score: 0, label: "", color: "bg-neutral-700" };
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;

    if (s <= 1) return { score: 1, label: "Yếu", color: "bg-red-500" };
    if (s === 2)
      return { score: 2, label: "Trung bình", color: "bg-amber-500" };
    if (s === 3) return { score: 3, label: "Mạnh", color: "bg-emerald-400" };
    return { score: 4, label: "Rất mạnh", color: "bg-emerald-500" };
  }, [form.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptTerms) {
      toast("Bạn cần đồng ý với Điều khoản dịch vụ để tạo tài khoản.", "error");
      return;
    }

    if (!turnstileToken) {
      toast(
        "Vui lòng hoàn thành xác minh Cloudflare Turnstile bảo mật.",
        "error",
      );
      return;
    }

    try {
      await register(form.email, form.username, form.password);
      toast("Đăng ký tài khoản thành công!", "success");
      router.push(`/profile/${encodeURIComponent(form.username)}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const finalMsg = Array.isArray(msg)
        ? msg.join(", ")
        : msg || "Có lỗi xảy ra khi tạo tài khoản, vui lòng thử lại";
      toast(finalMsg, "error");
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
        toast(`Chào mừng ${name} đến với CineVerse!`, "success");
        router.push(`/profile/${encodeURIComponent(name)}`);
      }
    } catch (err: any) {
      toast("Không thể đăng nhập bằng Google", "error");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-[#0f1319]/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Decorative ambient neon circle background */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mb-4 shadow-lg shadow-emerald-500/10">
          <UserPlus size={26} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Đăng Ký Tài Khoản
        </h1>
        <p className="text-xs text-neutral-400 mt-1.5">
          Tạo tài khoản CineVerse miễn phí để trải nghiệm xem phim không giới
          hạn.
        </p>
      </div>

      {/* Main Register Form */}
      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        {/* Email Input */}
        <div>
          <label className="block text-xs font-bold text-neutral-300 mb-1.5">
            Địa chỉ Email
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-all"
              required
            />
          </div>
        </div>

        {/* Username Input */}
        <div>
          <label className="block text-xs font-bold text-neutral-300 mb-1.5">
            Tên người dùng (Username)
          </label>
          <div className="relative">
            <User
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="biệt danh của bạn"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-all"
              required
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-xs font-bold text-neutral-300 mb-1.5">
            Mật khẩu bảo mật
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
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

          {/* Password Strength Meter */}
          {form.password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-neutral-400">Độ mạnh mật khẩu:</span>
                <span className="font-extrabold text-white">
                  {passwordStrength.label}
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-full flex-1 rounded-full transition-all ${
                      i < passwordStrength.score
                        ? passwordStrength.color
                        : "bg-white/5"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Terms Agreement Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="terms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-0 cursor-pointer"
          />
          <label
            htmlFor="terms"
            className="text-xs text-neutral-400 cursor-pointer"
          >
            Tôi đồng ý với{" "}
            <span className="text-emerald-400 underline font-semibold">
              Điều khoản & Chính sách
            </span>{" "}
            CineVerse
          </label>
        </div>

        {/* Cloudflare Turnstile Bot Protection */}
        <div className="pt-1">
          <TurnstileWidget
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => setTurnstileToken("")}
            onExpire={() => setTurnstileToken("")}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !turnstileToken || !acceptTerms}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50 mt-2"
        >
          {isLoading ? "Đang tạo tài khoản..." : "Tạo Tài Khoản Ngay"}
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

        {/* Google Single Click Signup Button */}
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
          <span>Đăng ký với Google</span>
        </button>
      </form>

      {/* Switch to Login link */}
      <div className="text-center mt-6 pt-4 border-t border-white/5 relative z-10">
        <p className="text-xs text-neutral-400">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 hover:underline ml-1"
          >
            Đăng nhập ngay <ArrowRight size={12} />
          </Link>
        </p>
      </div>
    </div>
  );
}
