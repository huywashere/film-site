"use client";

import { useState, useEffect } from "react";
import { useAuthModalStore } from "@/store/authModalStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import {
  X,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AtSign,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getFirebaseAuth,
  getGoogleProvider,
  getFacebookProvider,
  isFirebaseConfigured,
  signInWithPopup,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from "@/lib/firebase";
import { establishFirebaseSession } from "@/lib/auth-session";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";
import { cn } from "@/lib/utils";

export function AuthModal() {
  const router = useRouter();
  const { isOpen, mode, closeModal, setMode } = useAuthModalStore();
  const { setUser, login, register } = useAuthStore();
  const { toast } = useToast();

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  const [isForgotMode, setIsForgotMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Google One Tap
  useGoogleOneTap({
    enabled: isOpen && !isForgotMode,
    onSuccess: () => {
      closeModal();
      router.push("/");
    },
  });

  const handleFirebaseUserSuccess = async (fbUser: any) => {
    const user = await establishFirebaseSession(fbUser);
    const avatarUrl = user.avatarUrl || fbUser.photoURL || undefined;
    const displayName = user.displayName || fbUser.displayName || user.username;
    setUser({
      ...user,
      avatarUrl,
      displayName,
    });

    toast(
      `Đăng nhập thành công! Chào mừng ${displayName}.`,
      "success",
    );
    closeModal();
    router.push("/");
  };

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    getRedirectResult(getFirebaseAuth())
      .then(async (res) => {
        if (res?.user) {
          await handleFirebaseUserSuccess(res.user);
        }
      })
      .catch((e) => console.warn("Redirect result check:", e));

    return undefined;
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
      await handleFirebaseUserSuccess(res.user);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      const finalMsg = Array.isArray(serverMsg)
        ? serverMsg.join(", ")
        : typeof serverMsg === "string"
          ? serverMsg
          : err.code === "auth/popup-blocked"
            ? "Trình duyệt đã chặn cửa sổ Google. Hãy cho phép popup rồi thử lại."
            : err.code === "auth/popup-closed-by-user"
              ? "Bạn đã đóng cửa sổ đăng nhập Google."
              : "Không thể xác thực tài khoản Google. Vui lòng thử lại sau.";
      setErrorMsg(finalMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await signInWithPopup(
        getFirebaseAuth(),
        getFacebookProvider(),
      );
      await handleFirebaseUserSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(
        err.code === "auth/popup-blocked"
          ? "Trình duyệt đã chặn cửa sổ Facebook. Hãy cho phép popup rồi thử lại."
          : err.code === "auth/popup-closed-by-user"
            ? "Bạn đã đóng cửa sổ đăng nhập Facebook."
            : err.message || "Đăng nhập Facebook thất bại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername) {
      setErrorMsg("Vui lòng nhập địa chỉ email của bạn.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const targetEmail = emailOrUsername.includes("@")
        ? emailOrUsername.trim()
        : `${emailOrUsername.trim()}@cineverse.app`;
      await sendPasswordResetEmail(getFirebaseAuth(), targetEmail);
      toast(
        "Đã gửi email đặt lại mật khẩu! Vui lòng kiểm tra hộp thư của bạn.",
        "success",
      );
      setIsForgotMode(false);
    } catch (err: any) {
      setErrorMsg(
        err.message ||
        "Không thể gửi email khôi phục. Vui lòng kiểm tra lại email.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (mode === "register" && password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        let loginEmail = emailOrUsername;
        if (!emailOrUsername.includes("@")) {
          loginEmail = `${emailOrUsername.trim().toLowerCase()}@cineverse.app`;
        }

        try {
          const res = await signInWithEmailAndPassword(
            getFirebaseAuth(),
            loginEmail,
            password,
          );
          await handleFirebaseUserSuccess(res.user);
        } catch (fbErr: any) {
          const res = await login(emailOrUsername, password);
          if (res?.user) {
            toast(`Đăng nhập thành công!`, "success");
            closeModal();
            router.push("/");
          } else {
            setErrorMsg("Email hoặc mật khẩu không chính xác.");
          }
        }
      } else {
        const cleanUsername = (username || emailOrUsername.split("@")[0])
          .trim()
          .toLowerCase();
        const registerEmail = emailOrUsername.includes("@")
          ? emailOrUsername.trim()
          : `${cleanUsername}@cineverse.app`;

        try {
          const res = await createUserWithEmailAndPassword(
            getFirebaseAuth(),
            registerEmail,
            password,
          );
          if (res.user) {
            await updateProfile(res.user, {
              displayName: (displayName || username).trim(),
            });
            await sendEmailVerification(res.user);
            toast(
              "Tài khoản đã được tạo. Hãy kiểm tra email để xác minh.",
              "success",
            );
            closeModal();
            setMode("login");
          }
        } catch (fbErr: any) {
          const res = await register({
            email: registerEmail,
            username: cleanUsername,
            displayName: (displayName || username).trim(),
            password,
          });
          if (res?.requiresEmailVerification) {
            toast(
              "Tạo tài khoản thành công. Hãy kiểm tra email để xác minh.",
              "success",
            );
            closeModal();
            setMode("login");
          } else {
            setErrorMsg("Không thể đăng ký. Email hoặc username đã tồn tại.");
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Thao tác thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      {/* Dark overlay backdrop */}
      <div
        onClick={closeModal}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer z-0"
      />

      {/* Main 2-Column Dialog Container */}
      <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto sm:overflow-hidden rounded-3xl bg-[#11141a] border border-white/[0.08] shadow-[0_0_80px_rgba(0,0,0,0.95)] z-10 my-auto flex flex-col md:flex-row [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-30 border border-white/10"
          aria-label="Đóng"
        >
          <X size={17} />
        </button>

        {/* ── Left Column: Artistic Banner ── */}
        <div className="relative hidden md:flex md:w-[46%] lg:w-[48%] flex-col justify-between overflow-hidden bg-neutral-950 min-h-[580px] p-7">
          {/* Background Poster Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/auth_banner_art.jpg"
              alt="NetPhim Cinema Art"
              className="w-full h-full object-cover object-top scale-105 transition-transform duration-700"
            />
            {/* Dark & Gradient Overlays for optimal readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#11141a] via-[#11141a]/40 to-black/50" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#11141a]/90" />
          </div>

          {/* Top-Left Brand Logo */}
          <div className="relative z-10 flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-white flex items-center font-[family-name:var(--font-manrope)]">
              Net<span className="text-[#ff9bc8] drop-shadow-[0_0_12px_rgba(255,155,200,0.6)]">Phim</span>
            </span>
          </div>

          {/* Bottom Redesigned Aesthetic Text Card */}
          <div className="relative z-10">
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/45 p-4.5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              {/* Subtle top pink accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff9bc8]/70 to-transparent" />
              
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff9bc8]/20 text-[#ff9bc8]">
                  <Sparkles size={11} />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#ff9bc8]">
                  Thế giới điện ảnh 4K
                </span>
              </div>

              <h4 className="text-sm font-extrabold text-white leading-snug font-[family-name:var(--font-manrope)]">
                Lưu phim yêu thích &amp; xem tiếp mọi lúc
              </h4>

              <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-neutral-300">
                Đồng bộ lịch sử xem đa thiết bị, cập nhật nhanh các bộ phim bom tấn mới nhất với phụ đề chuẩn!
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column: Form Container ── */}
        <div className="flex-1 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 md:pl-8 md:pr-10 relative z-10">

          {/* Mode Switching Tabs */}
          {!isForgotMode && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center bg-[#181b22] border border-white/[0.08] p-1 rounded-full">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setMode("login");
                    setErrorMsg("");
                  }}
                  className={cn(
                    "px-7 py-2 rounded-full text-xs font-bold transition-all cursor-pointer",
                    mode === "login"
                      ? "bg-[#292d37] text-white shadow-md border border-white/10"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  Đăng nhập
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setMode("register");
                    setErrorMsg("");
                  }}
                  className={cn(
                    "px-7 py-2 rounded-full text-xs font-bold transition-all cursor-pointer",
                    mode === "register"
                      ? "bg-[#292d37] text-white shadow-md border border-white/10"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  Đăng ký
                </button>
              </div>
            </div>
          )}

          {/* Forgot Password Header */}
          {isForgotMode && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setIsForgotMode(false)}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer mb-3"
              >
                <ArrowLeft size={14} /> Quay lại
              </button>
              <h3 className="text-xl font-bold text-white font-[family-name:var(--font-manrope)]">
                Khôi phục mật khẩu
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.08] p-3 text-xs font-medium leading-relaxed text-red-300">
              <span className="mt-0.5 shrink-0 text-red-400">⚠</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Views */}
          <div className="relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isForgotMode ? "forgot" : mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {isForgotMode ? (
                  /* Forgot Password Form */
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        placeholder="Nhập địa chỉ email của bạn"
                        className="w-full rounded-xl border border-white/[0.08] bg-[#181b22] pl-11 pr-4 py-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-[#ff9bc8]/60 focus:bg-[#1e222b] focus:ring-1 focus:ring-[#ff9bc8]/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-[#ff9bc8] hover:bg-[#ffb0d4] text-neutral-950 text-xs sm:text-sm font-black tracking-wider uppercase transition-all shadow-lg shadow-pink-500/10 active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Đang gửi...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound size={16} />
                          <span>GỬI EMAIL KHÔI PHỤC</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : mode === "login" ? (
                  /* Login Form */
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Username or Email */}
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                      <input
                        type="text"
                        autoComplete="username"
                        required
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        placeholder="Username hoặc email"
                        className="w-full rounded-xl border border-white/[0.08] bg-[#181b22] pl-11 pr-4 py-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-[#ff9bc8]/60 focus:bg-[#1e222b] focus:ring-1 focus:ring-[#ff9bc8]/20"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mật khẩu"
                          className="w-full rounded-xl border border-white/[0.08] bg-[#181b22] pl-11 pr-11 py-3.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-[#ff9bc8]/60 focus:bg-[#1e222b] focus:ring-1 focus:ring-[#ff9bc8]/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      <div className="flex justify-end pr-1">
                        <button
                          type="button"
                          onClick={() => setIsForgotMode(true)}
                          className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Quên mật khẩu?
                        </button>
                      </div>
                    </div>

                    {/* Cloudflare Turnstile / Success Verification */}
                    {turnstileEnabled ? (
                      <div className="py-1">
                        <TurnstileWidget
                          action={mode}
                          onTokenChange={(token) => setTurnstileToken(token)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#181b22] px-4 py-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 size={16} className="text-emerald-400 fill-emerald-500/20" />
                          <span>Thành công!</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                            CLOUDFLARE
                          </span>
                          <span className="text-[9px] text-neutral-600">
                            Quyền riêng tư · Giúp đỡ
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-[#ff9bc8] hover:bg-[#ffb0d4] text-neutral-950 text-xs sm:text-sm font-black tracking-wider uppercase transition-all shadow-lg shadow-pink-500/10 active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Đang đăng nhập...</span>
                        </>
                      ) : (
                        <span>ĐĂNG NHẬP</span>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Register Form */
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Full Name */}
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Họ và tên"
                        className="w-full rounded-xl border border-white/[0.08] bg-[#181b22] pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-[#ff9bc8]/60 focus:bg-[#1e222b] focus:ring-1 focus:ring-[#ff9bc8]/20"
                      />
                    </div>

                    {/* Username */}
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Tên đăng nhập"
                        className="w-full rounded-xl border border-white/[0.08] bg-[#181b22] pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-[#ff9bc8]/60 focus:bg-[#1e222b] focus:ring-1 focus:ring-[#ff9bc8]/20"
                      />
                    </div>

                    {/* Email */}
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        placeholder="Email"
                        className="w-full rounded-xl border border-white/[0.08] bg-[#181b22] pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-[#ff9bc8]/60 focus:bg-[#1e222b] focus:ring-1 focus:ring-[#ff9bc8]/20"
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu"
                        className="w-full rounded-xl border border-white/[0.08] bg-[#181b22] pl-11 pr-11 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-[#ff9bc8]/60 focus:bg-[#1e222b] focus:ring-1 focus:ring-[#ff9bc8]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full rounded-xl border border-white/[0.08] bg-[#181b22] pl-11 pr-11 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-[#ff9bc8]/60 focus:bg-[#1e222b] focus:ring-1 focus:ring-[#ff9bc8]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1 transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Cloudflare Turnstile / Success Verification */}
                    {turnstileEnabled ? (
                      <div className="py-1">
                        <TurnstileWidget
                          action={mode}
                          onTokenChange={(token) => setTurnstileToken(token)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#181b22] px-4 py-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 size={16} className="text-emerald-400 fill-emerald-500/20" />
                          <span>Thành công!</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                            CLOUDFLARE
                          </span>
                          <span className="text-[9px] text-neutral-600">
                            Quyền riêng tư · Giúp đỡ
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-[#ff9bc8] hover:bg-[#ffb0d4] text-neutral-950 text-xs sm:text-sm font-black tracking-wider uppercase transition-all shadow-lg shadow-pink-500/10 active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        <span>ĐĂNG KÝ TÀI KHOẢN</span>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Switch Link */}
          {!isForgotMode && (
            <div className="text-center mt-6 text-xs text-neutral-400">
              {mode === "login" ? (
                <span>
                  Bạn chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setErrorMsg("");
                    }}
                    className="font-bold text-[#ff9bc8] hover:underline cursor-pointer ml-1"
                  >
                    Đăng ký ngay
                  </button>
                </span>
              ) : (
                <span>
                  Đã có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrorMsg("");
                    }}
                    className="font-bold text-[#ff9bc8] hover:underline cursor-pointer ml-1"
                  >
                    Đăng nhập
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Social Logins as alternative row */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-3">
            <span className="text-[11px] text-neutral-500 font-medium">Hoặc tiếp tục với:</span>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
