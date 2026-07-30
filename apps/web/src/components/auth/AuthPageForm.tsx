"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  AtSign,
  ArrowLeft,
  KeyRound,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { firebaseAuth, sendPasswordResetEmail } from "@/lib/firebase";

export function AuthPageForm({
  initialMode = "login",
}: {
  initialMode?: "login" | "register";
}) {
  const router = useRouter();
  const { login, register, isLoading } = useAuthStore();
  const { toast } = useToast();

  const [mode, setModeState] = useState<"login" | "register">(initialMode);
  const [isForgotMode, setIsForgotMode] = useState(false);

  // Form Fields State
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // 2FA login states
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);

  // Seamless Mode Switcher with URL Update (Zero Flickering)
  const switchMode = (newMode: "login" | "register") => {
    setIsForgotMode(false);
    setModeState(newMode);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/${newMode}`);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast("Vui lòng nhập địa chỉ email của bạn.", "error");
      return;
    }

    setResetLoading(true);
    try {
      const targetEmail = email.includes("@")
        ? email.trim()
        : `${email.trim()}@cineverse.app`;
      await sendPasswordResetEmail(firebaseAuth, targetEmail);
      toast(
        "Đã gửi email đặt lại mật khẩu! Vui lòng kiểm tra hộp thư của bạn.",
        "success",
      );
      setIsForgotMode(false);
    } catch (err: any) {
      toast(
        err.message ||
          "Không thể gửi email khôi phục. Vui lòng kiểm tra lại email.",
        "error",
      );
    } finally {
      setResetLoading(false);
    }
  };

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

    if (mode === "register") {
      if (password !== confirmPassword) {
        toast("Mật khẩu xác nhận không trùng khớp", "error");
        return;
      }
      if (password.length < 6) {
        toast("Mật khẩu phải có ít nhất 6 ký tự", "error");
        return;
      }
      try {
        const cleanUsername = (username || email.split("@")[0])
          .trim()
          .toLowerCase();
        const res = await register({
          email: email.trim(),
          username: cleanUsername,
          displayName: (displayName || username).trim(),
          password,
        });
        if (res?.user) {
          toast("Tạo tài khoản thành công!", "success");
          router.push("/");
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message;
        const finalMsg = Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Không thể đăng ký. Email hoặc tên tài khoản đã tồn tại";
        toast(finalMsg, "error");
      }
    } else {
      try {
        const result = await login(email, password);
        if (result && result.require2FA) {
          setRequire2FA(true);
          setTempToken(result.tempToken);
          toast("Vui lòng nhập mã OTP để tiếp tục đăng nhập", "info");
        } else {
          toast("Đăng nhập thành công!", "success");
          router.push("/");
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message;
        const finalMsg = Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Sai thông tin đăng nhập hoặc tài khoản không tồn tại";
        toast(finalMsg, "error");
      }
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

      router.push("/");
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
        const userEmail = res.user.email || `${res.user.uid}@cineverse.app`;
        const role = userEmail.toLowerCase().includes("admin")
          ? "ADMIN"
          : "USER";
        useAuthStore.getState().setUser({
          id: res.user.uid,
          email: userEmail,
          username: name.toLowerCase().replace(/\s+/g, "_"),
          displayName: name,
          avatar: res.user.photoURL || undefined,
          role,
        });
        toast(`Welcome back, ${name}!`, "success");
        router.push("/");
      }
    } catch (err: any) {
      toast("Không thể đăng nhập bằng Google", "error");
    }
  };

  const handleFacebookLogin = async () => {
    try {
      const { firebaseAuth, facebookProvider, signInWithPopup } =
        await import("@/lib/firebase");
      const res = await signInWithPopup(firebaseAuth, facebookProvider);
      if (res?.user) {
        const name =
          res.user.displayName || res.user.email?.split("@")[0] || "User";
        const userEmail = res.user.email || `${res.user.uid}@cineverse.app`;
        const role = userEmail.toLowerCase().includes("admin")
          ? "ADMIN"
          : "USER";
        useAuthStore.getState().setUser({
          id: res.user.uid,
          email: userEmail,
          username: name.toLowerCase().replace(/\s+/g, "_"),
          displayName: name,
          avatar: res.user.photoURL || undefined,
          role,
        });
        toast(`Welcome back, ${name}!`, "success");
        router.push("/");
      }
    } catch (err: any) {
      toast("Không thể đăng nhập bằng Facebook", "error");
    }
  };

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto p-5 sm:p-6 bg-[#07080a]/80 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl relative overflow-hidden font-primary">
      {/* Back to Homepage Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-300 hover:text-white font-medium text-xs transition-colors cursor-pointer mb-3"
      >
        <ArrowLeft size={13} />
        <span>Về trang chủ</span>
      </Link>

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {isForgotMode
            ? "Quên mật khẩu"
            : mode === "login"
              ? "Đăng nhập"
              : "Tạo tài khoản"}
        </h1>
        <p className="text-xs text-neutral-300 font-medium mt-1.5 leading-relaxed max-w-sm mx-auto">
          {isForgotMode
            ? "Nhập địa chỉ email đăng ký của bạn để nhận liên kết khôi phục mật khẩu."
            : mode === "login"
              ? "Đăng nhập để tiếp tục trải nghiệm xem phim 4K, hoặc tạo tài khoản mới bằng Email, Google hoặc Facebook."
              : "Tạo tài khoản thành viên để xem phim 4K miễn phí, lưu danh sách yêu thích và đồng bộ lịch sử xem."}
        </p>
      </div>

      {!isForgotMode && (
        /* Mode Switching Tabs with Framer Motion Layout Animation */
        <div className="grid grid-cols-2 gap-3 mb-4 relative">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`relative flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              mode === "login"
                ? "bg-white/15 border-white/40 text-white shadow-md backdrop-blur-md"
                : "bg-white/[0.04] border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200"
            }`}
          >
            {mode === "login" && (
              <motion.div
                layoutId="activeTabIndicatorPage"
                className="absolute inset-0 bg-white/15 border border-white/40 rounded-lg shadow-sm -z-10 backdrop-blur-md"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <LogIn size={14} />
            <span>Đăng nhập</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`relative flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              mode === "register"
                ? "bg-white/15 border-white/40 text-white shadow-md backdrop-blur-md"
                : "bg-white/[0.04] border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200"
            }`}
          >
            {mode === "register" && (
              <motion.div
                layoutId="activeTabIndicatorPage"
                className="absolute inset-0 bg-white/15 border border-white/40 rounded-lg shadow-sm -z-10 backdrop-blur-md"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <UserPlus size={14} />
            <span>Tạo tài khoản</span>
          </button>
        </div>
      )}

      {/* Form Body View with Framer Motion Horizontal Slide Animation */}
      <div className="overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isForgotMode ? "forgot" : mode}
            initial={{
              opacity: 0,
              x: isForgotMode ? 0 : mode === "login" ? -35 : 35,
            }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              x: isForgotMode ? 0 : mode === "login" ? 35 : -35,
            }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            {isForgotMode ? (
              /* Forgot Password Form */
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Địa chỉ Email đăng ký
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-white/[0.06] border border-white/15 rounded-lg pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Đang gửi email...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={15} />
                      <span>Gửi email khôi phục mật khẩu</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="text-xs text-neutral-300 hover:text-white font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Quay lại đăng nhập</span>
                  </button>
                </div>
              </form>
            ) : require2FA ? (
              /* 2FA OTP Form */
              <form onSubmit={handleOTPSubmit} className="space-y-4">
                <div className="p-4 rounded-lg bg-white/[0.06] border border-white/15 text-center">
                  <ShieldCheck
                    size={32}
                    className="mx-auto text-emerald-400 mb-2"
                  />
                  <h3 className="text-sm font-bold text-white">
                    Xác Thực 2 Lớp (2FA)
                  </h3>
                  <p className="text-xs text-neutral-300 font-medium mt-1">
                    Nhập mã 6 chữ số từ ứng dụng Google Authenticator của bạn.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Mã OTP 6 chữ số
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center text-2xl font-mono tracking-[0.5em] bg-white/[0.06] border border-white/15 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-all"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying2FA || otp.length !== 6}
                  className="w-full py-3 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
                >
                  {verifying2FA ? "Đang xác thực..." : "Xác nhận đăng nhập"}
                </button>
              </form>
            ) : (
              /* Main Form (Login / Register) */
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Họ và tên
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Nhập họ và tên của bạn"
                          className="w-full bg-white/[0.06] border border-white/15 rounded-lg pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Tên tài khoản (Username)
                      </label>
                      <div className="relative">
                        <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="tentaikhoan"
                          className="w-full bg-white/[0.06] border border-white/15 rounded-lg pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-white/[0.06] border border-white/15 rounded-lg pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                    />
                  </div>
                </div>

                {/* Password Fields */}
                {mode === "login" ? (
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-white/[0.06] border border-white/15 rounded-lg pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Register Password Grid (2 Columns) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Mật khẩu
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Ít nhất 6 ký tự"
                          className="w-full bg-white/[0.06] border border-white/15 rounded-lg pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Xác nhận mật khẩu
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Nhắc lại mật khẩu"
                          className="w-full bg-white/[0.06] border border-white/15 rounded-lg pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading || !turnstileToken}
                  className="w-full py-3 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isLoading
                    ? "Đang xử lý..."
                    : mode === "login"
                      ? "Đăng nhập ngay"
                      : "Tạo tài khoản ngay"}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Forgot password link */}
      {!isForgotMode && mode === "login" && (
        <div className="text-center mt-2.5">
          <button
            type="button"
            onClick={() => setIsForgotMode(true)}
            className="text-xs text-neutral-300 hover:text-white font-medium transition-colors cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        </div>
      )}

      {/* Cloudflare Turnstile CAPTCHA */}
      <div className="flex justify-center pt-2.5">
        <TurnstileWidget
          onSuccess={(token) => setTurnstileToken(token)}
          onVerify={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken("")}
          onError={() => setTurnstileToken("")}
          theme="dark"
        />
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-3">
        <div className="flex-grow border-t border-white/15" />
        <span className="px-3 text-[11px] font-medium text-neutral-400 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
          hoặc tiếp tục bằng
        </span>
        <div className="flex-grow border-t border-white/15" />
      </div>

      {/* Social Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-2.5 bg-white/[0.06] hover:bg-white/15 border border-white/15 rounded-lg py-2.5 px-3 transition-colors cursor-pointer text-xs font-medium text-neutral-200"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
          <span>Google</span>
        </button>

        <button
          type="button"
          onClick={handleFacebookLogin}
          className="flex items-center justify-center gap-2.5 bg-white/[0.06] hover:bg-white/15 border border-white/15 rounded-lg py-2.5 px-3 transition-colors cursor-pointer text-xs font-medium text-neutral-200"
        >
          <svg className="w-4 h-4 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Facebook</span>
        </button>
      </div>
    </div>
  );
}
