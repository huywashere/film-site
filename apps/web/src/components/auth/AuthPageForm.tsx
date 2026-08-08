"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CinematicAuthBackground } from "@/components/auth/CinematicAuthBackground";
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
  BarChart2,
  Clock,
} from "lucide-react";
import { useAuthStore, type User as AuthUser } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { firebaseAuth, sendPasswordResetEmail } from "@/lib/firebase";
import { authApi } from "@/lib/api";
import { establishFirebaseSession } from "@/lib/auth-session";
import type { User as FirebaseUser } from "firebase/auth";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { tmdbApi, tmdbBackdrop } from "@/lib/tmdb";

function getGoogleAuthErrorMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/unauthorized-domain":
      return "Tên miền hiện tại chưa được cho phép đăng nhập Google. Hãy thêm tên miền này vào Firebase Authentication > Settings > Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google Sign-In chưa được bật trong Firebase Authentication.";
    case "auth/network-request-failed":
      return "Không thể kết nối đến Google. Vui lòng kiểm tra mạng và thử lại.";
    case "auth/account-exists-with-different-credential":
      return "Email này đã được đăng ký bằng phương thức đăng nhập khác.";
    case "auth/popup-blocked":
      return "Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép popup rồi thử lại.";
    case "auth/popup-closed-by-user":
      return "Bạn đã đóng cửa sổ đăng nhập Google.";
    case "auth/web-storage-unsupported":
      return "Trình duyệt đang chặn bộ nhớ cần thiết cho Google Sign-In. Hãy cho phép cookie rồi thử lại.";
    case "auth/invalid-api-key":
    case "auth/app-not-authorized":
      return "Cấu hình Firebase cho Google Sign-In không hợp lệ.";
    default:
      return code
        ? `Không thể đăng nhập bằng Google (${code.replace("auth/", "")}).`
        : "Không thể đăng nhập bằng Google. Vui lòng thử lại.";
  }
}

const LEFT_FEATURES = [
  { Icon: BarChart2, text: "Thư viện được đồng bộ" },
  { Icon: Clock, text: "Tiếp tục đúng vị trí đã xem" },
  { Icon: ShieldCheck, text: "Quản lý phiên đăng nhập" },
];

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
  const [resetLoading, setResetLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA login states
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);

  // Dynamic random 4K movie backdrop from TMDB
  const [randomMovie, setRandomMovie] = useState<{
    title: string;
    backdropUrl: string;
  }>({
    title: "Deadpool & Wolverine",
    backdropUrl:
      "https://image.tmdb.org/t/p/original/8Y4PKa2vRvmVnsacuYAsStjOfSu.jpg",
  });

  useEffect(() => {
    tmdbApi
      .getTrending("movie", "week")
      .then((res) => {
        if (res?.results && res.results.length > 0) {
          const valid = res.results.filter(
            (m: any) => m.backdrop_path && (m.title || m.name),
          );
          if (valid.length > 0) {
            const picked = valid[Math.floor(Math.random() * valid.length)];
            const bgUrl = tmdbBackdrop(picked.backdrop_path, "original");
            if (bgUrl) {
              setRandomMovie({
                title: picked.title || picked.name || "CinePhim 4K",
                backdropUrl: bgUrl,
              });
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Auto-redirect if user is already logged in
  const currentUser = useAuthStore((state) => state.user);
  
  useEffect(() => {
    useAuthStore.getState().fetchMe().catch(() => {});
  }, []);

  useEffect(() => {
    if (currentUser) {
      const targetSlug = currentUser.username || currentUser.id;
      const targetUrl = targetSlug
        ? `/user/${encodeURIComponent(targetSlug)}`
        : "/";
      router.replace(targetUrl);
    }
  }, [currentUser, router]);

  // Seamless Mode Switcher with URL Update (Zero Flickering)
  const switchMode = (newMode: "login" | "register") => {
    setIsForgotMode(false);
    setTurnstileToken(null);
    setModeState(newMode);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/${newMode}`);
    }
  };

  const handleTurnstileTokenChange = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

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
          turnstileToken: turnstileToken || undefined,
        });
        if (res?.user) {
          toast("Tạo tài khoản thành công!", "success");
          router.replace(`/user/${encodeURIComponent(res.user.username || res.user.id)}`);
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
        const result = await login(email, password, turnstileToken || undefined);
        if (result && result.require2FA) {
          setRequire2FA(true);
          setTempToken(result.tempToken || "");
          toast("Vui lòng nhập mã OTP để tiếp tục đăng nhập", "info");
        } else {
          toast("Đăng nhập thành công!", "success");
          let currentUser = result?.user || useAuthStore.getState().user;
          if (!currentUser) {
            try {
              await useAuthStore.getState().fetchMe();
              currentUser = useAuthStore.getState().user;
            } catch (_e) {
              // fallback
            }
          }
          const targetSlug = currentUser?.username || currentUser?.id;
          const userUrl = targetSlug
            ? `/user/${encodeURIComponent(targetSlug)}`
            : "/user";
          router.replace(userUrl);
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
      router.replace("/");
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

  const completeFirebaseLogin = useCallback(
    async (firebaseUser: FirebaseUser) => {
      const name =
        firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
      let loggedUser: AuthUser;
      try {
        loggedUser = await establishFirebaseSession(firebaseUser);
      } catch (err) {
        console.warn("Backend exchange failed, using direct Firebase user session:", err);
        loggedUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || `${firebaseUser.uid}@google.com`,
          username: firebaseUser.email?.split("@")[0] || firebaseUser.uid,
          displayName: name,
          avatarUrl: firebaseUser.photoURL || undefined,
          role: "USER",
        };
      }
      useAuthStore.getState().setUser(loggedUser);
      toast(`Chào mừng, ${name}!`, "success");
      const userProfileUrl = `/user/${encodeURIComponent(loggedUser.username || loggedUser.id)}`;
      router.replace(userProfileUrl);
    },
    [router, toast],
  );

  useEffect(() => {
    let mounted = true;

    void import("@/lib/firebase")
      .then(({ getRedirectResult, firebaseAuth }) => {
        if (
          !firebaseAuth ||
          typeof firebaseAuth !== "object" ||
          !("app" in firebaseAuth || "config" in firebaseAuth)
        ) {
          return null;
        }
        return getRedirectResult(firebaseAuth);
      })
      .then((result) => {
        if (mounted && result?.user) void completeFirebaseLogin(result.user);
      })
      .catch(() => {
        // Silently catch redirect result check on initial page load
      });

    return () => {
      mounted = false;
    };
  }, [completeFirebaseLogin]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { firebaseAuth, googleProvider, signInWithPopup } =
        await import("@/lib/firebase");
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      if (!result.user) {
        throw new Error("Google không trả về thông tin tài khoản.");
      }
      await completeFirebaseLogin(result.user);
    } catch (error: unknown) {
      console.error("Google sign-in popup failed", error);
      toast(getGoogleAuthErrorMessage(error), "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setFacebookLoading(true);
    try {
      const { firebaseAuth, facebookProvider, signInWithPopup } =
        await import("@/lib/firebase");
      const res = await signInWithPopup(firebaseAuth, facebookProvider);
      if (res?.user) {
        await completeFirebaseLogin(res.user);
      } else {
        throw new Error("Facebook không trả về thông tin tài khoản.");
      }
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      toast(
        code === "auth/popup-blocked"
          ? "Trình duyệt đã chặn cửa sổ đăng nhập Facebook. Hãy cho phép popup rồi thử lại."
          : code === "auth/popup-closed-by-user"
            ? "Bạn đã đóng cửa sổ đăng nhập Facebook."
            : "Không thể đăng nhập bằng Facebook. Vui lòng thử lại.",
        "error",
      );
    } finally {
      setFacebookLoading(false);
    }
  };

  // ── Input shared class (Glassmorphic & Roomy) ──
  const inputCls =
    "w-full bg-[#161924]/90 hover:bg-[#1a1e2c] focus:bg-[#1e2233] border border-white/15 focus:border-white/40 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-neutral-500 transition-all outline-none shadow-inner";

  if (currentUser) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#040508] flex items-center justify-center relative overflow-hidden">
        <CinematicAuthBackground />
        <div className="relative z-10 flex items-center gap-3 text-white text-sm font-semibold bg-[#111318]/90 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-xl shadow-2xl">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <span>Đang chuyển hướng đến trang cá nhân...</span>
        </div>
      </div>
    );
  }

  return (
    // Outer wrapper — full viewport, cinematic bg
    <div className="min-h-[100dvh] w-full bg-[#040508] flex flex-col relative overflow-hidden font-sans">
      <CinematicAuthBackground />

      {/* ── Main content: centered (full screen) ──────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[1200px]">
          {/* Glassmorphic Auth Card */}
          <div className="relative bg-[#0a0c14]/85 border border-white/20 rounded-3xl overflow-hidden backdrop-blur-3xl shadow-[0_32px_100px_rgba(0,0,0,0.95)]">
            <div className="grid md:grid-cols-[1fr_1.25fr]">

              {/* ── LEFT panel ─────────────────────────────────── */}
              <div className="hidden md:flex flex-col justify-between p-10 md:p-12 border-r border-white/[0.12] relative overflow-hidden h-auto md:min-h-[720px]">
                {/* Random 4K TMDB Movie Backdrop */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={randomMovie.backdropUrl}
                  alt={randomMovie.title}
                  className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.72] scale-105 transition-transform duration-1000"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1600&auto=format&fit=crop";
                  }}
                />
                {/* Gradient overlay: dark at bottom for text, subtle at top */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c14] via-[#0a0c14]/70 to-[#0a0c14]/30" />
                {/* Right-edge fade to blend into form panel */}
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-[#0a0c14]/90" />

                {/* Content — above the overlays */}
                <div className="relative z-10 space-y-6">
                  <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-emerald-400 uppercase">
                    KHÔNG GIAN CÁ NHÂN CINEVERSE
                  </p>
                  <div>
                    <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">
                      Tiếp tục trải nghiệm<br />xem phim của bạn.
                    </h2>
                    <p className="mt-3.5 text-sm text-neutral-300/90 leading-relaxed max-w-[350px] font-medium">
                      Một tài khoản duy nhất cho thư viện, tiến độ xem và tuỳ chọn cá nhân trên mọi thiết bị.
                    </p>
                  </div>
                </div>

                {/* Features list & TMDB Movie Title Badge */}
                <div className="relative z-10 space-y-4 mt-8">
                  {/* Glass Tag showing current TMDB Backdrop Movie */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/20 backdrop-blur-md text-[11px] font-semibold text-white/90 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="truncate max-w-[260px]">🎬 {randomMovie.title}</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {LEFT_FEATURES.map(({ Icon, text }) => (
                      <div key={text} className="flex items-center gap-3">
                        <div className="w-7.5 h-7.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <Icon size={14} />
                        </div>
                        <span className="text-xs font-semibold text-neutral-200">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── RIGHT panel (form) ─────────────────────────── */}
              <div className="p-8 md:p-12 h-auto md:min-h-[720px] flex flex-col justify-between overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {/* Back to home button */}
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white transition-colors mb-5 group"
                >
                  <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span>Trang chủ</span>
                </Link>

                {/* Section label */}
                <p className="text-[10px] font-semibold tracking-[0.18em] text-neutral-500 uppercase mb-3">
                  Tài khoản CineVerse
                </p>

                {/* Mode title */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h1
                    key={isForgotMode ? "forgot-title" : mode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-2xl font-bold text-white tracking-tight mb-1"
                  >
                    {isForgotMode
                      ? "Quên mật khẩu"
                      : mode === "login"
                        ? "Đăng nhập"
                        : "Tạo tài khoản"}
                  </motion.h1>
                </AnimatePresence>
                <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
                  {isForgotMode
                    ? "Nhập email để nhận liên kết khôi phục mật khẩu."
                    : mode === "login"
                      ? "Đồng bộ danh sách và tiếp tục xem trên mọi thiết bị."
                      : "Tạo tài khoản và bắt đầu xem phim 4K miễn phí."}
                </p>

                {/* Mode tabs (only when not forgot) */}
                {!isForgotMode && (
                  <div className="flex gap-1 mb-6 p-1 bg-[#0d0f14] rounded-xl border border-white/[0.06]">
                    {(["login", "register"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => switchMode(m)}
                        className={cn(
                          "relative flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer select-none",
                          mode === m
                            ? "bg-white/10 text-white shadow-sm"
                            : "text-neutral-500 hover:text-neutral-300",
                        )}
                      >
                        {m === "login" ? <LogIn size={13} /> : <UserPlus size={13} />}
                        {m === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Form body ─────────────────────────────────── */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={isForgotMode ? "forgot" : mode}
                    initial={{ opacity: 0, x: isForgotMode ? 0 : mode === "login" ? -24 : 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isForgotMode ? 0 : mode === "login" ? 24 : -24 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    {isForgotMode ? (
                      /* Forgot password */
                      <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                            Địa chỉ Email đăng ký
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="email@example.com"
                              className={`${inputCls} pl-10`}
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={resetLoading}
                          className="w-full py-3 rounded-xl bg-white text-[#0b0c10] text-xs font-bold transition-all hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {resetLoading ? (
                            <><Loader2 size={14} className="animate-spin" /> Đang gửi...</>
                          ) : (
                            <><KeyRound size={14} /> Gửi email khôi phục</>
                          )}
                        </button>
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => setIsForgotMode(false)}
                            className="text-xs text-neutral-500 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <ArrowLeft size={12} /> Quay lại đăng nhập
                          </button>
                        </div>
                      </form>
                    ) : require2FA ? (
                      /* 2FA */
                      <form onSubmit={handleOTPSubmit} className="space-y-4">
                        <div className="p-4 rounded-xl bg-[#0d0f14] border border-white/[0.06] text-center">
                          <ShieldCheck size={28} className="mx-auto text-emerald-400 mb-2" />
                          <h3 className="text-sm font-bold text-white">Xác Thực 2 Lớp</h3>
                          <p className="text-xs text-neutral-500 mt-1">
                            Nhập mã 6 chữ số từ Google Authenticator.
                          </p>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          className="w-full text-center text-2xl font-mono tracking-[0.5em] bg-[#1a1c23] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/35 transition-all"
                          required
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={verifying2FA || otp.length !== 6}
                          className="w-full py-3 rounded-xl bg-white text-[#0b0c10] text-xs font-bold transition-all hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-50"
                        >
                          {verifying2FA ? "Đang xác thực..." : "Xác nhận đăng nhập"}
                        </button>
                      </form>
                    ) : (
                      /* Main form */
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === "register" && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Họ và tên</label>
                              <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                                <input
                                  type="text"
                                  required
                                  value={displayName}
                                  onChange={(e) => setDisplayName(e.target.value)}
                                  placeholder="Họ và tên"
                                  className={`${inputCls} pl-10`}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tên tài khoản</label>
                              <div className="relative">
                                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                                <input
                                  type="text"
                                  required
                                  value={username}
                                  onChange={(e) => setUsername(e.target.value)}
                                  placeholder="tentaikhoan"
                                  className={`${inputCls} pl-10`}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Email */}
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email</label>
                          <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            className={inputCls}
                          />
                        </div>

                        {/* Password */}
                        {mode === "login" ? (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-medium text-neutral-400">Mật khẩu</label>
                              <button
                                type="button"
                                onClick={() => setIsForgotMode(true)}
                                className="text-[11px] text-neutral-500 hover:text-white transition-colors cursor-pointer"
                              >
                                Quên mật khẩu?
                              </button>
                            </div>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••"
                                className={`${inputCls} pr-10`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors cursor-pointer"
                              >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Mật khẩu</label>
                              <div className="relative">
                                <input
                                  type={showPassword ? "text" : "password"}
                                  autoComplete="new-password"
                                  required
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder="Ít nhất 6 ký tự"
                                  className={`${inputCls} pr-8`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors cursor-pointer"
                                >
                                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Xác nhận</label>
                              <div className="relative">
                                <input
                                  type={showConfirmPassword ? "text" : "password"}
                                  autoComplete="new-password"
                                  required
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Nhắc lại mật khẩu"
                                  className={`${inputCls} pr-8`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors cursor-pointer"
                                >
                                  {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Remember me (login only) */}
                        {mode === "login" && (
                          <label className="flex items-center gap-2.5 cursor-pointer group pt-1 pb-1">
                            <div
                              onClick={() => setRememberMe(!rememberMe)}
                              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                rememberMe
                                  ? "bg-white border-white"
                                  : "bg-transparent border-neutral-600 group-hover:border-neutral-400"
                              }`}
                            >
                              {rememberMe && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[#0b0c10]" />
                              )}
                            </div>
                            <span className="text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors">
                              Ghi nhớ đăng nhập trong 30 ngày
                            </span>
                          </label>
                        )}

                        {/* Turnstile Bot Protection (If configured) */}
                        {turnstileEnabled && (
                          <div className="py-1">
                            <TurnstileWidget
                              action={mode}
                              onTokenChange={handleTurnstileTokenChange}
                            />
                          </div>
                        )}

                        {/* Submit */}
                        <button
                          type="submit"
                          disabled={isLoading || (turnstileEnabled && !turnstileToken)}
                          className="w-full py-3 rounded-xl bg-white text-[#0b0c10] text-xs font-bold transition-all hover:bg-neutral-100 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                        >
                          {isLoading ? (
                            <><Loader2 size={14} className="animate-spin" /> Đang đăng nhập...</>
                          ) : mode === "login" ? (
                            "Đăng nhập"
                          ) : (
                            "Tạo tài khoản"
                          )}
                        </button>
                      </form>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* ── Social login ───────────────────────────────── */}
                {!isForgotMode && !require2FA && (
                  <>
                    <div className="relative flex items-center gap-3 my-5">
                      <div className="flex-1 border-t border-white/[0.07]" />
                      <span className="text-[10px] text-neutral-600 uppercase tracking-wider font-medium">
                        hoặc
                      </span>
                      <div className="flex-1 border-t border-white/[0.07]" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                        className="flex items-center justify-center gap-2 bg-[#1a1c23] hover:bg-[#1e2029] border border-white/[0.08] rounded-xl py-2.5 px-3 transition-all cursor-pointer text-xs font-medium text-neutral-300 disabled:opacity-60"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{googleLoading ? "Đang mở..." : "Google"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleFacebookLogin}
                        disabled={facebookLoading}
                        className="flex items-center justify-center gap-2 bg-[#1a1c23] hover:bg-[#1e2029] border border-white/[0.08] rounded-xl py-2.5 px-3 transition-all cursor-pointer text-xs font-medium text-neutral-300"
                      >
                        <svg className="w-4 h-4 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span>{facebookLoading ? "Đang mở..." : "Facebook"}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
