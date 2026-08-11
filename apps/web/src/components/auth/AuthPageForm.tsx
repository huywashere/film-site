"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
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
  Clapperboard,
} from "lucide-react";
import { useAuthStore, type User as AuthUser } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { getFirebaseAuth, sendPasswordResetEmail } from "@/lib/firebase";
import { authApi } from "@/lib/api";
import { establishFirebaseSession } from "@/lib/auth-session";
import type { User as FirebaseUser } from "firebase/auth";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { tmdbApi, tmdbBackdrop, tmdbPoster, type TmdbMovie } from "@/lib/tmdb";
import { cardFont } from "@/lib/fonts";

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

type AuthFeaturedMovie = {
  title: string;
  studio: string;
  backdropUrl: string;
  objectPosition: string;
};

const AUTH_FALLBACK_MOVIES: AuthFeaturedMovie[] = [
  {
    title: "Avengers: Infinity War",
    studio: "Marvel Studios",
    backdropUrl: "/images/wp3533664-avengers-infinity-war-4k-wallpapers.jpg",
    objectPosition: "52% center",
  },
  {
    title: "Avengers",
    studio: "Marvel Studios",
    backdropUrl: "/images/wp4300709-avengers-4k-wallpapers.jpg",
    objectPosition: "50% center",
  },
  {
    title: "Zack Snyder's Justice League",
    studio: "DC",
    backdropUrl:
      "/images/zack-snyders-justice-league-dc-superheroes-dc-comics-2021-3840x2160-4980.jpg",
    objectPosition: "52% center",
  },
  {
    title: "The Odyssey",
    studio: "Universal Pictures",
    backdropUrl:
      "/images/MV5BN2MyYjk2MWMtODMyZS00MDUyLW-8113-3732-1766460989.webp",
    objectPosition: "50% center",
  },
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
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA login states
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);

  // TMDB supplies a fresh image per page load. Local artwork remains available
  // when TMDB or its image CDN cannot be reached.
  const [randomMovie, setRandomMovie] = useState<AuthFeaturedMovie>(
    AUTH_FALLBACK_MOVIES[0],
  );

  useEffect(() => {
    let cancelled = false;
    const fallback =
      AUTH_FALLBACK_MOVIES[
        Math.floor(Math.random() * AUTH_FALLBACK_MOVIES.length)
      ];
    setRandomMovie(fallback);

    tmdbApi
      .getTrending("movie", "week")
      .then((response) => {
        if (cancelled) return;
        const candidates = (response?.results || []).filter(
          (movie: TmdbMovie) =>
            Boolean(movie?.poster_path || movie?.backdrop_path) &&
            Boolean(movie?.title || movie?.original_title || movie?.name),
        );
        if (candidates.length === 0) return;

        const movie = candidates[
          Math.floor(Math.random() * candidates.length)
        ] as TmdbMovie;
        const posterUrl = tmdbPoster(movie.poster_path, "w780");
        const backdropUrl = tmdbBackdrop(movie.backdrop_path, "w1280");
        const imageUrl = posterUrl || backdropUrl;
        if (!imageUrl) return;

        setRandomMovie({
          title:
            movie.title ||
            movie.original_title ||
            movie.name ||
            "TMDB Trending",
          studio: "TMDB Trending",
          backdropUrl: imageUrl,
          objectPosition: posterUrl ? "center top" : "center",
        });
      })
      .catch(() => {
        // The already-selected local fallback remains visible.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-redirect if user is already logged in
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    useAuthStore
      .getState()
      .fetchMe()
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentUser) {
      router.replace("/");
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
      await sendPasswordResetEmail(getFirebaseAuth(), targetEmail);
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
      if (password.length < 8) {
        toast("Mật khẩu phải có ít nhất 8 ký tự", "error");
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
        if (res?.requiresEmailVerification) {
          toast(
            "Tạo tài khoản thành công. Hãy kiểm tra email để xác minh trước khi đăng nhập.",
            "success",
          );
          router.replace("/login?registered=1");
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
        const result = await login(
          email,
          password,
          turnstileToken || undefined,
        );
        if (result && result.require2FA) {
          setRequire2FA(true);
          setTempToken(result.tempToken || "");
          toast("Vui lòng nhập mã OTP để tiếp tục đăng nhập", "info");
        } else {
          toast("Đăng nhập thành công!", "success");
          router.replace("/");
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
      const loggedUser: AuthUser = await establishFirebaseSession(firebaseUser);
      useAuthStore.getState().setUser(loggedUser);
      toast(`Chào mừng, ${name}!`, "success");
      router.replace("/");
    },
    [router, toast],
  );

  useEffect(() => {
    let mounted = true;

    void import("@/lib/firebase")
      .then(({ getRedirectResult, isFirebaseConfigured, getFirebaseAuth }) => {
        if (!isFirebaseConfigured) return null;
        return getRedirectResult(getFirebaseAuth());
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
      const { getFirebaseAuth, getGoogleProvider, signInWithPopup } =
        await import("@/lib/firebase");
      const result = await signInWithPopup(
        getFirebaseAuth(),
        getGoogleProvider(),
      );
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
      const { getFirebaseAuth, getFacebookProvider, signInWithPopup } =
        await import("@/lib/firebase");
      const res = await signInWithPopup(
        getFirebaseAuth(),
        getFacebookProvider(),
      );
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

  // Compact input rhythm keeps login usable without vertical scrolling.
  const inputCls =
    "w-full rounded-xl border border-white/10 bg-[#18191e] px-3.5 py-3 text-[13px] text-white outline-none transition-[border-color,background-color,box-shadow] placeholder:text-neutral-600 hover:bg-[#1b1c22] focus:border-red-400/60 focus:bg-[#1b1c22] focus:ring-2 focus:ring-red-500/10";

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
    <div
      className={cn(
        cardFont.className,
        "relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#090a0d]",
      )}
    >
      <CinematicAuthBackground />

      {/* ── Main content: centered (full screen) ──────────────────────── */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-5 sm:px-6">
        <div className="w-full max-w-[1020px]">
          {/* Glassmorphic Auth Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121316]/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              {/* ── LEFT panel ─────────────────────────────────── */}
              <div className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden border-r border-white/[0.08] p-8 md:flex lg:p-10">
                {/* TMDB artwork with a local fallback for reliable loading. */}
                <AnimatePresence initial={false}>
                  <motion.div
                    key={randomMovie.backdropUrl}
                    className="absolute inset-0 scale-[1.03]"
                    initial={{ opacity: 0, scale: 1.055 }}
                    animate={{ opacity: 1, scale: 1.03 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  >
                    <Image
                      src={randomMovie.backdropUrl}
                      alt={`Ảnh phim ${randomMovie.title}`}
                      fill
                      priority
                      sizes="(min-width: 768px) 45vw, 0px"
                      className="object-cover brightness-[0.68]"
                      style={{ objectPosition: randomMovie.objectPosition }}
                      onError={() => {
                        if (randomMovie.backdropUrl.startsWith("/api/")) {
                          setRandomMovie(AUTH_FALLBACK_MOVIES[0]);
                        }
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
                {/* Gradient overlay: dark at bottom for text, subtle at top */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/70 to-[#141414]/30" />
                {/* Right-edge fade to blend into form panel */}
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-[#141414]/90" />

                {/* Content — above the overlays */}
                <div className="relative z-10 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">
                    KHÔNG GIAN CÁ NHÂN CINEVERSE
                  </p>
                  <div>
                    <h2 className="text-[28px] font-extrabold leading-[1.18] tracking-[-0.035em] text-white drop-shadow-2xl lg:text-[32px]">
                      Tiếp tục trải nghiệm
                      <br />
                      xem phim của bạn.
                    </h2>
                    <p className="mt-3 max-w-[330px] text-[13px] font-normal leading-5 text-neutral-300/90">
                      Một tài khoản duy nhất cho thư viện, tiến độ xem và tuỳ
                      chọn cá nhân trên mọi thiết bị.
                    </p>
                  </div>
                </div>

                {/* Features list & featured movie title */}
                <div className="relative z-10 mt-8 space-y-4">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/90 shadow-lg backdrop-blur-md">
                    <Clapperboard size={12} className="shrink-0 text-red-300" />
                    <span className="shrink-0 text-neutral-400">
                      {randomMovie.studio}
                    </span>
                    <span
                      className="h-3 w-px shrink-0 bg-white/20"
                      aria-hidden="true"
                    />
                    <span className="max-w-[190px] truncate">
                      {randomMovie.title}
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {LEFT_FEATURES.map(({ Icon, text }) => (
                      <div key={text} className="flex items-center gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-red-300">
                          <Icon size={14} />
                        </div>
                        <span className="text-xs font-semibold text-neutral-200">
                          {text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── RIGHT panel (form) ─────────────────────────── */}
              <div className="flex min-h-[620px] flex-col overflow-y-auto p-6 [scrollbar-width:none] sm:p-8 md:p-9 [&::-webkit-scrollbar]:hidden">
                <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center">
                  {/* Back to home button */}
                  <Link
                    href="/"
                    className="group mb-4 inline-flex items-center gap-1.5 self-start text-[11px] text-neutral-500 transition-colors hover:text-white"
                  >
                    <ArrowLeft
                      size={12}
                      className="group-hover:-translate-x-0.5 transition-transform"
                    />
                    <span>Trang chủ</span>
                  </Link>

                  {/* Section label */}
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
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
                      className="mb-1 text-[22px] font-bold tracking-[-0.025em] text-white"
                    >
                      {isForgotMode
                        ? "Quên mật khẩu"
                        : mode === "login"
                          ? "Đăng nhập"
                          : "Tạo tài khoản"}
                    </motion.h1>
                  </AnimatePresence>
                  <p className="mb-5 text-[12px] leading-5 text-neutral-500">
                    {isForgotMode
                      ? "Nhập email để nhận liên kết khôi phục mật khẩu."
                      : mode === "login"
                        ? "Đồng bộ danh sách và tiếp tục xem trên mọi thiết bị."
                        : "Tạo tài khoản và bắt đầu xem phim 4K miễn phí."}
                  </p>

                  {/* Mode tabs (only when not forgot) */}
                  {!isForgotMode && (
                    <div className="mb-5 flex gap-1 rounded-xl bg-[#0c0d10] p-1">
                      {(["login", "register"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => switchMode(m)}
                          className={cn(
                            "relative flex flex-1 select-none items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all",
                            mode === m
                              ? "bg-white/10 text-white shadow-sm"
                              : "text-neutral-500 hover:text-neutral-300",
                          )}
                        >
                          {m === "login" ? (
                            <LogIn size={13} />
                          ) : (
                            <UserPlus size={13} />
                          )}
                          {m === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── Form body ─────────────────────────────────── */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={isForgotMode ? "forgot" : mode}
                      initial={{
                        opacity: 0,
                        x: isForgotMode ? 0 : mode === "login" ? -24 : 24,
                      }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{
                        opacity: 0,
                        x: isForgotMode ? 0 : mode === "login" ? 24 : -24,
                      }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      {isForgotMode ? (
                        /* Forgot password */
                        <form
                          onSubmit={handleForgotPasswordSubmit}
                          className="space-y-4"
                        >
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
                              <>
                                <Loader2 size={14} className="animate-spin" />{" "}
                                Đang gửi...
                              </>
                            ) : (
                              <>
                                <KeyRound size={14} /> Gửi email khôi phục
                              </>
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
                            <ShieldCheck
                              size={28}
                              className="mx-auto text-emerald-400 mb-2"
                            />
                            <h3 className="text-sm font-bold text-white">
                              Xác Thực 2 Lớp
                            </h3>
                            <p className="text-xs text-neutral-500 mt-1">
                              Nhập mã 6 chữ số từ Google Authenticator.
                            </p>
                          </div>
                          <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) =>
                              setOtp(e.target.value.replace(/\D/g, ""))
                            }
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
                            {verifying2FA
                              ? "Đang xác thực..."
                              : "Xác nhận đăng nhập"}
                          </button>
                        </form>
                      ) : (
                        /* Main form */
                        <form onSubmit={handleSubmit} className="space-y-3.5">
                          {mode === "register" && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                                  Họ và tên
                                </label>
                                <div className="relative">
                                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                                  <input
                                    type="text"
                                    required
                                    value={displayName}
                                    onChange={(e) =>
                                      setDisplayName(e.target.value)
                                    }
                                    placeholder="Họ và tên"
                                    className={`${inputCls} pl-10`}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                                  Tên tài khoản
                                </label>
                                <div className="relative">
                                  <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                                  <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) =>
                                      setUsername(e.target.value)
                                    }
                                    placeholder="tentaikhoan"
                                    className={`${inputCls} pl-10`}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Email */}
                          <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                              Email
                            </label>
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
                                <label className="text-xs font-medium text-neutral-400">
                                  Mật khẩu
                                </label>
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
                                  {showPassword ? (
                                    <EyeOff size={15} />
                                  ) : (
                                    <Eye size={15} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                                  Mật khẩu
                                </label>
                                <div className="relative">
                                  <input
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) =>
                                      setPassword(e.target.value)
                                    }
                                    placeholder="Ít nhất 6 ký tự"
                                    className={`${inputCls} pr-8`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowPassword(!showPassword)
                                    }
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors cursor-pointer"
                                  >
                                    {showPassword ? (
                                      <EyeOff size={13} />
                                    ) : (
                                      <Eye size={13} />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                                  Xác nhận
                                </label>
                                <div className="relative">
                                  <input
                                    type={
                                      showConfirmPassword ? "text" : "password"
                                    }
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) =>
                                      setConfirmPassword(e.target.value)
                                    }
                                    placeholder="Nhắc lại mật khẩu"
                                    className={`${inputCls} pr-8`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowConfirmPassword(
                                        !showConfirmPassword,
                                      )
                                    }
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors cursor-pointer"
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff size={13} />
                                    ) : (
                                      <Eye size={13} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Remember me (login only) */}
                          {mode === "login" && (
                            <label className="group flex cursor-pointer items-center gap-2.5 py-0.5">
                              <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(event) =>
                                  setRememberMe(event.target.checked)
                                }
                                className="size-4 appearance-none rounded-[4px] border border-neutral-600 bg-transparent transition-colors checked:border-red-500 checked:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                              />
                              <span className="text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors">
                                Ghi nhớ đăng nhập trong 30 ngày
                              </span>
                            </label>
                          )}

                          <TurnstileWidget
                            action={mode}
                            onTokenChange={handleTurnstileTokenChange}
                          />

                          {/* Submit */}
                          <button
                            type="submit"
                            disabled={isLoading || !turnstileToken}
                            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold tracking-wide text-white shadow-lg shadow-red-950/25 transition-[background-color,transform,opacity] hover:bg-red-500 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />{" "}
                                Đang đăng nhập...
                              </>
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
                      <div className="relative my-4 flex items-center gap-3">
                        <div className="flex-1 border-t border-white/[0.07]" />
                        <span className="text-[10px] text-neutral-600 uppercase tracking-wider font-medium">
                          hoặc
                        </span>
                        <div className="flex-1 border-t border-white/[0.07]" />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          disabled={googleLoading}
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#18191e] px-3 py-2.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-[#1e2026] disabled:opacity-60"
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
                          <span>{googleLoading ? "Đang mở..." : "Google"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleFacebookLogin}
                          disabled={facebookLoading}
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#18191e] px-3 py-2.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-[#1e2026] disabled:opacity-60"
                        >
                          <svg
                            className="w-4 h-4 fill-[#1877F2] shrink-0"
                            viewBox="0 0 24 24"
                          >
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          <span>
                            {facebookLoading ? "Đang mở..." : "Facebook"}
                          </span>
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
    </div>
  );
}
