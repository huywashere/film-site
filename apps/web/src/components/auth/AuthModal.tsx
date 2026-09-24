"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthModalStore } from "@/store/authModalStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import {
  Loader2,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  AtSign,
  ShieldCheck,
  ArrowLeft,
  ChevronLeft,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import { mapFirebaseErrorToVietnamese } from "@/lib/firebaseErrorMap";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { CinematicAuthBackground } from "@/components/auth/CinematicAuthBackground";
import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";
import {
  LOGIN_COVER_ARTWORKS,
  type AuthArtwork,
} from "@/lib/auth-artworks";
import { cn } from "@/lib/utils";
import { useReliableNavigation } from "@/hooks/useReliableNavigation";

export interface AuthModalProps {
  isPage?: boolean;
  initialMode?: "login" | "register" | "forgot";
}

function getRedirectTarget() {
  if (typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get("redirect");
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      return redirect;
    }
  }
  return "/";
}

export function AuthModal({
  isPage = false,
  initialMode = "login",
}: AuthModalProps = {}) {
  const router = useReliableNavigation();
  const modalStore = useAuthModalStore();
  const closeAuthModal = modalStore.closeModal;
  const { setUser, login, register } = useAuthStore();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();

  const [internalMode, setInternalMode] = useState<"login" | "register">(
    initialMode === "forgot" ? "login" : initialMode,
  );
  const [isForgotMode, setIsForgotMode] = useState(initialMode === "forgot");

  useEffect(() => {
    if (isPage && initialMode) {
      if (initialMode === "forgot") {
        setIsForgotMode(true);
        setInternalMode("login");
      } else {
        setIsForgotMode(false);
        setInternalMode(initialMode);
      }
    }
  }, [isPage, initialMode]);

  const mode = isPage ? internalMode : modalStore.mode;
  const setMode = (newMode: "login" | "register") => {
    if (isPage) {
      setInternalMode(newMode);
      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          newMode === "login" ? "/login" : "/register",
        );
      }
    } else {
      modalStore.setMode(newMode);
    }
  };

  const closeModal = useCallback(() => {
    if (isForgotMode) {
      if (isPage && initialMode === "forgot") {
        router.push("/login");
        return;
      }
      setIsForgotMode(false);
      return;
    }
    if (isPage) {
      const redirect = getRedirectTarget();
      if (redirect !== "/" || typeof window === "undefined" || window.history.length <= 1) {
        router.push(redirect);
      } else {
        router.back();
      }
    } else {
      closeAuthModal();
    }
  }, [closeAuthModal, initialMode, isForgotMode, isPage, router]);

  const isOpen = isPage ? true : modalStore.isOpen;

  // Keep the server and first client render identical. Random selection here
  // caused hydration replacement and could interrupt the login submission.
  const [currentArtwork] = useState<AuthArtwork>(LOGIN_COVER_ARTWORKS[0]);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const handleTurnstileChange = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  const [displayName, setDisplayName] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Google One Tap fast login integration
  useGoogleOneTap({
    enabled: isOpen && !isForgotMode,
    onSuccess: () => {
      if (isPage) {
        window.location.assign(getRedirectTarget());
      } else {
        modalStore.closeModal();
        router.refresh();
      }
    },
  });

  const handleFirebaseUserSuccess = useCallback(async (fbUser: any) => {
    const user = await establishFirebaseSession(fbUser);
    const avatarUrl = user.avatarUrl || fbUser.photoURL || undefined;
    const resolvedDisplayName =
      user.displayName || fbUser.displayName || user.username;
    setUser({
      ...user,
      avatarUrl,
      displayName: resolvedDisplayName,
    });

    toast(
      `Đăng nhập thành công! Chào mừng ${resolvedDisplayName}.`,
      "success",
    );
    if (isPage) {
      window.location.assign(getRedirectTarget());
    } else {
      closeAuthModal();
      router.refresh();
    }
  }, [closeAuthModal, isPage, router, setUser, toast]);

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
  }, [handleFirebaseUserSuccess]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
      await handleFirebaseUserSuccess(res.user);
    } catch (err: any) {
      console.error("Google login error:", err);
      const serverMsg = err?.response?.data?.message;
      const finalMsg = Array.isArray(serverMsg)
        ? serverMsg.join(", ")
        : typeof serverMsg === "string"
          ? serverMsg
          : err?.code === "auth/popup-blocked"
            ? "Trình duyệt đã chặn cửa sổ Google. Hãy cho phép popup rồi thử lại."
            : err?.code === "auth/popup-closed-by-user"
              ? "Bạn đã đóng cửa sổ đăng nhập Google."
              : err?.code === "auth/unauthorized-domain"
                ? "Tên miền hiện tại (localhost) chưa được thêm vào Authorized Domains trong Firebase Console."
                : err?.code
                  ? mapFirebaseErrorToVietnamese(err.code, err.message)
                  : err?.message || "Không thể xác thực tài khoản Google. Vui lòng thử lại sau.";
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
      console.error("Facebook login error:", err);
      setErrorMsg(
        err?.code === "auth/popup-blocked"
          ? "Trình duyệt đã chặn cửa sổ Facebook. Hãy cho phép popup rồi thử lại."
          : err?.code === "auth/popup-closed-by-user"
            ? "Bạn đã đóng cửa sổ đăng nhập Facebook."
            : err?.code
              ? mapFirebaseErrorToVietnamese(err.code, err.message)
              : err?.message || "Đăng nhập Facebook thất bại.",
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
        : `${emailOrUsername.trim()}@netphim.app`;
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
          loginEmail = `${emailOrUsername.trim().toLowerCase()}@netphim.app`;
        }

        try {
          const res = await login(
            emailOrUsername,
            password,
            turnstileToken || undefined,
          );
          if (res?.user) {
            toast(`Đăng nhập thành công!`, "success");
            if (isPage) {
              // A full navigation makes the new cookie visible to every
              // server component and avoids a stale pre-login router cache.
              window.location.assign(getRedirectTarget());
            } else {
              modalStore.closeModal();
              router.refresh();
            }
          } else {
            setErrorMsg("Email hoặc mật khẩu không chính xác.");
          }
        } catch (apiError) {
          // Firebase-only email accounts remain supported, while normal API
          // accounts no longer wait for an external Firebase failure first.
          try {
            const firebaseResult = await signInWithEmailAndPassword(
              getFirebaseAuth(),
              loginEmail,
              password,
            );
            await handleFirebaseUserSuccess(firebaseResult.user);
          } catch {
            throw apiError;
          }
        }
      } else {
        const cleanUsername = (username || emailOrUsername.split("@")[0])
          .trim()
          .toLowerCase();
        const registerEmail = emailOrUsername.includes("@")
          ? emailOrUsername.trim()
          : `${cleanUsername}@netphim.app`;

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
            if (isPage) {
              setMode("login");
            } else {
              modalStore.closeModal();
              modalStore.setMode("login");
            }
          }
        } catch (fbErr: any) {
          const res = await register({
            email: registerEmail,
            username: cleanUsername,
            displayName: (displayName || username).trim(),
            password,
            turnstileToken: turnstileToken || undefined,
          });
          if (res?.requiresEmailVerification) {
            toast(
              "Tạo tài khoản thành công. Hãy kiểm tra email để xác minh.",
              "success",
            );
            if (isPage) {
              setMode("login");
            } else {
              modalStore.closeModal();
              modalStore.setMode("login");
            }
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
      if (e.key === "Escape" && !isPage) closeModal();
    };
    if (isOpen && !isPage) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPage, closeModal]);

  if (!isOpen) return null;

  /* ── Sleek Centered Glass Card Content (Anti-Slop Cinematic Standard) ── */
  const cardContent = (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.95, y: 16 }}
      transition={{
        layout: { duration: reduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] },
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "relative w-full max-w-[390px] overflow-hidden bg-gradient-to-b from-[#181a2e]/85 via-[#101222]/80 to-[#0b0d18]/90 backdrop-blur-2xl border border-white/[0.14] rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_-10px_rgba(139,92,246,0.22),inset_0_1px_0_0_rgba(255,255,255,0.18)] p-5 sm:p-6 sm:px-7 text-white z-10 font-primary",
      )}
    >
      {/* Decorative Ambient Glass Tint on Card Top */}
      <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-52 h-28 bg-violet-500/20 blur-3xl pointer-events-none rounded-full" />

      {/* Integrated Minimalist Back Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.15 }}
        type="button"
        onClick={closeModal}
        className="absolute top-4 left-4 sm:top-5 sm:left-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-white/30 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md active:scale-95 group z-20"
        aria-label="Quay lại"
        title="Quay lại"
      >
        <ChevronLeft
          size={16}
          strokeWidth={2.2}
          className="transition-transform duration-200 group-hover:-translate-x-0.5 text-neutral-300 group-hover:text-white"
        />
      </motion.button>

      {/* Brand Logo integrated directly on the form header */}
      <div className="flex justify-center mb-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 select-none group"
        >
          <NextImage
            src="/flexphim-logo.svg"
            alt="FlexPhim Logo"
            width={32}
            height={32}
            priority
            unoptimized
            className="h-8 w-8 object-contain transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
            }}
          />
          <span className="text-xl sm:text-[22px] font-black tracking-tight text-white flex items-center font-sans">
            Flex<span className="text-violet-400">Phim</span>
          </span>
        </Link>
      </div>

      {/* Title Header with smooth crossfade */}
      <div className="text-center mb-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isForgotMode ? "forgot" : mode}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <h1 className="text-xl sm:text-[22px] font-extrabold text-white tracking-tight">
              {isForgotMode
                ? "Khôi phục mật khẩu"
                : mode === "login"
                  ? "Đăng nhập tài khoản"
                  : "Tạo tài khoản mới"}
            </h1>
            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
              {isForgotMode
                ? "Nhập email đăng ký để nhận liên kết khôi phục mật khẩu."
                : mode === "login"
                  ? "Thế giới điện ảnh đỉnh cao đang chờ bạn khám phá."
                  : "Gia nhập FlexPhim để xem phim chất lượng cao không giới hạn."}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Tab Segmented Control (Smooth Sliding Pill Indicator) */}
      {!isForgotMode && (
        <motion.div
          layout
          className="relative flex items-center p-1 bg-white/[0.05] rounded-xl border border-white/[0.08] mb-4 shadow-inner"
        >
          <button
            type="button"
            onClick={() => {
              if (mode !== "login") {
                setErrorMsg("");
                setMode("login");
              }
            }}
            className={cn(
              "relative flex-1 py-2 text-xs font-bold text-center transition-colors duration-200 z-10 cursor-pointer select-none rounded-lg",
              mode === "login" ? "text-white" : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            {mode === "login" && (
              <motion.div
                layoutId="authTabPill"
                className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-lg shadow-md shadow-violet-600/35 border border-violet-400/30"
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 32,
                }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              <LogIn size={13} strokeWidth={2.2} />
              Đăng nhập
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (mode !== "register") {
                setErrorMsg("");
                setMode("register");
              }
            }}
            className={cn(
              "relative flex-1 py-2 text-xs font-bold text-center transition-colors duration-200 z-10 cursor-pointer select-none rounded-lg",
              mode === "register" ? "text-white" : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            {mode === "register" && (
              <motion.div
                layoutId="authTabPill"
                className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-lg shadow-md shadow-violet-600/35 border border-violet-400/30"
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 32,
                }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              <UserPlus size={13} strokeWidth={2.2} />
              Đăng ký
            </span>
          </button>
        </motion.div>
      )}

      {/* Error Message with tactile shake feedback */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              x: reduceMotion ? 0 : [0, -8, 8, -5, 5, -2, 2, 0],
            }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{
              duration: 0.35,
              x: { duration: 0.35, ease: "easeOut" },
            }}
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium leading-relaxed text-red-300"
          >
            <span className="mt-0.5 shrink-0 text-red-400">⚠</span>
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Body View */}
      <div className="overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          {isForgotMode ? (
            /* Forgot Password Form */
            <motion.div
              key="forgot-form"
              initial={reduceMotion ? false : { opacity: 0, x: 16, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -16, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <form
                onSubmit={handleForgotPasswordSubmit}
                className="space-y-4"
              >
                <div>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none transition-colors group-focus-within:text-violet-400" />
                    <input
                      type="email"
                      required
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="Email đã đăng ký"
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-violet-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-violet-400/20"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.012 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white text-sm font-bold tracking-wide transition-all duration-200 shadow-lg shadow-violet-600/30 hover:shadow-violet-600/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2 select-none"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Gửi email khôi phục</span>
                    </>
                  )}
                </motion.button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setIsForgotMode(false);
                    }}
                    className="text-xs text-neutral-400 hover:text-white font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer group"
                  >
                    <ArrowLeft size={13} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
                    <span>Quay lại đăng nhập</span>
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* Login / Register Unified Form with Expanding Fields */
            <motion.div
              key="main-auth-form"
              initial={reduceMotion ? false : { opacity: 0, x: -16, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 16, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Extra Register Fields: Full Name & Username */}
                <AnimatePresence initial={false}>
                  {mode === "register" && (
                    <motion.div
                      key="register-top-fields"
                      initial={{ opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -8 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.28,
                        ease: [0.16, 1, 0.3, 1],
                        opacity: { duration: 0.2 },
                      }}
                      className="space-y-3.5 overflow-hidden"
                    >
                      {/* Full Name */}
                      <div>
                        <div className="relative group">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none transition-colors group-focus-within:text-violet-400" />
                          <input
                            type="text"
                            required={mode === "register"}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Họ và tên"
                            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-violet-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-violet-400/20"
                          />
                        </div>
                      </div>

                      {/* Username */}
                      <div>
                        <div className="relative group">
                          <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none transition-colors group-focus-within:text-violet-400" />
                          <input
                            type="text"
                            required={mode === "register"}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Tên tài khoản (username)"
                            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-violet-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-violet-400/20"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email / Username Field (Shared) */}
                <motion.div layout>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none transition-colors group-focus-within:text-violet-400" />
                    <input
                      type={mode === "login" ? "text" : "email"}
                      autoComplete="email"
                      required
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder={
                        mode === "login"
                          ? "Email hoặc Tên đăng nhập"
                          : "Địa chỉ Email"
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-violet-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-violet-400/20"
                    />
                  </div>
                </motion.div>

                {/* Password Field (Shared) */}
                <motion.div layout>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none transition-colors group-focus-within:text-violet-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "login" ? "Mật khẩu" : "Mật khẩu (tối thiểu 6 ký tự)"}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-violet-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-violet-400/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer rounded-lg hover:bg-white/10 active:scale-95"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      <motion.div
                        key={showPassword ? "hide" : "show"}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.15 }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </motion.div>
                    </button>
                  </div>

                  {/* Forgot password link (Login mode only) */}
                  <AnimatePresence initial={false}>
                    {mode === "login" && (
                      <motion.div
                        key="forgot-password-link"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex justify-end mt-2 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg("");
                            setIsForgotMode(true);
                          }}
                          className="text-xs text-neutral-400 hover:text-white font-medium transition-colors cursor-pointer"
                        >
                          Quên mật khẩu?
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Extra Register Field: Confirm Password */}
                <AnimatePresence initial={false}>
                  {mode === "register" && (
                    <motion.div
                      key="register-confirm-password-field"
                      initial={{ opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -8 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.28,
                        ease: [0.16, 1, 0.3, 1],
                        opacity: { duration: 0.2 },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="relative group">
                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none transition-colors group-focus-within:text-violet-400" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required={mode === "register"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Xác nhận mật khẩu"
                          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all duration-200 hover:border-white/20 focus:border-violet-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-violet-400/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer rounded-lg hover:bg-white/10 active:scale-95"
                          aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                          <motion.div
                            key={showConfirmPassword ? "hide-confirm" : "show-confirm"}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </motion.div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Turnstile Bot Protection */}
                {turnstileEnabled && (
                  <motion.div layout className="py-1 flex justify-center">
                    <TurnstileWidget
                      action={mode}
                      onTokenChange={handleTurnstileChange}
                    />
                  </motion.div>
                )}

                {/* Submit Action Button */}
                <motion.button
                  layout
                  whileHover={{ scale: 1.012 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white text-sm font-bold tracking-wide transition-all duration-200 shadow-lg shadow-violet-600/30 hover:shadow-violet-600/40 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2 select-none"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {loading ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang xử lý...</span>
                      </motion.span>
                    ) : mode === "login" ? (
                      <motion.span
                        key="login-btn"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        Đăng nhập
                      </motion.span>
                    ) : (
                      <motion.span
                        key="register-btn"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        Đăng ký tài khoản
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <motion.div layout className="relative flex items-center justify-center my-4">
        <div className="flex-grow border-t border-white/10" />
        <span className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          HOẶC
        </span>
        <div className="flex-grow border-t border-white/10" />
      </motion.div>

      {/* Social Login: Google Pill Button */}
      <motion.div layout>
        <motion.button
          whileHover={{ scale: 1.012, backgroundColor: "#252b38" }}
          whileTap={{ scale: 0.985 }}
          transition={{ duration: 0.15 }}
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="relative flex items-center w-full h-[46px] rounded-full bg-[#1c202a] border border-white/10 p-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50 group"
        >
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
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
          </div>
          <span className="flex-1 text-center font-medium text-white text-[13.5px] pr-8">
            Đăng nhập bằng Google
          </span>
        </motion.button>
      </motion.div>

      {/* Switch Mode Footer Link */}
      <motion.div layout className="text-center mt-4 text-xs text-neutral-400">
        {mode === "login" ? (
          <>
            Chưa có tài khoản?{" "}
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setIsForgotMode(false);
                setMode("register");
              }}
              className="font-bold text-white hover:underline cursor-pointer ml-1 transition-colors"
            >
              Đăng ký ngay
            </button>
          </>
        ) : (
          <>
            Đã có tài khoản?{" "}
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setIsForgotMode(false);
                setMode("login");
              }}
              className="font-bold text-white hover:underline cursor-pointer ml-1 transition-colors"
            >
              Đăng nhập ngay
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );

  /* ── Page Layout View (/login & /register) ── */
  if (isPage) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col justify-center items-center relative overflow-y-auto px-4 py-6 font-primary">
        {/* Fullscreen Random Movie Collage Backdrop - Fast High-Priority Load */}
        <CinematicAuthBackground artworkUrl={currentArtwork.url} />

        {/* Centered Auth Card */}
        <main className="w-full flex items-center justify-center my-auto relative z-10">
          {cardContent}
        </main>
      </div>
    );
  }

  /* ── Modal Layout View (Header Popup) ── */
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200 font-primary">
      {/* Fullscreen Random Movie Collage Backdrop - Fast High-Priority Load */}
      <CinematicAuthBackground artworkUrl={currentArtwork.url} />

      {/* Click outside backdrop to close - Light tint */}
      <div
        onClick={closeModal}
        className="fixed inset-0 bg-black/25 backdrop-blur-[1px] cursor-pointer z-0"
      />

      {/* Centered Auth Card */}
      <div className="relative z-10 my-auto py-4 w-full flex justify-center">
        {cardContent}
      </div>
    </div>
  );
}
