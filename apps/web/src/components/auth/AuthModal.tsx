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
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  AtSign,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
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
import { CinematicAuthBackground } from "@/components/auth/CinematicAuthBackground";
import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";
import { getRandomAuthArtwork, type AuthArtwork } from "@/lib/auth-artworks";
import { cn } from "@/lib/utils";

export interface AuthModalProps {
  isPage?: boolean;
  initialMode?: "login" | "register";
}

export function AuthModal({
  isPage = false,
  initialMode = "login",
}: AuthModalProps = {}) {
  const router = useRouter();
  const modalStore = useAuthModalStore();
  const { setUser, login, register } = useAuthStore();
  const { toast } = useToast();

  const [internalMode, setInternalMode] = useState<"login" | "register">(
    initialMode,
  );

  useEffect(() => {
    if (isPage && initialMode) {
      setInternalMode(initialMode);
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

  const getRedirectTarget = () => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get("redirect");
      if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
        return redirect;
      }
    }
    return "/";
  };

  const closeModal = () => {
    if (isPage) {
      router.push(getRedirectTarget());
    } else {
      modalStore.closeModal();
    }
  };

  const isOpen = isPage ? true : modalStore.isOpen;

  const [currentArtwork, setCurrentArtwork] = useState<AuthArtwork>(
    getRandomAuthArtwork,
  );

  useEffect(() => {
    if (isOpen) {
      setCurrentArtwork(getRandomAuthArtwork());
    }
  }, [isOpen]);

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

  // Google One Tap fast login integration
  useGoogleOneTap({
    enabled: isOpen && !isForgotMode,
    onSuccess: () => {
      if (isPage) {
        router.push(getRedirectTarget());
      } else {
        modalStore.closeModal();
        router.refresh();
      }
    },
  });

  const handleFirebaseUserSuccess = async (fbUser: any) => {
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
      router.push(getRedirectTarget());
    } else {
      modalStore.closeModal();
      router.refresh();
    }
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
          const res = await signInWithEmailAndPassword(
            getFirebaseAuth(),
            loginEmail,
            password,
          );
          await handleFirebaseUserSuccess(res.user);
        } catch (fbErr: any) {
          const res = await login(
            emailOrUsername,
            password,
            turnstileToken || undefined,
          );
          if (res?.user) {
            toast(`Đăng nhập thành công!`, "success");
            if (isPage) {
              router.push(getRedirectTarget());
            } else {
              modalStore.closeModal();
              router.refresh();
            }
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
    <div
      className={cn(
        "relative w-full max-w-[430px] bg-[#11141d]/85 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.92)] p-6 sm:p-8 text-white z-10 font-primary transition-all duration-300",
      )}
    >
      {/* Integrated Close Button (X) right on top-right of the card */}
      <button
        onClick={closeModal}
        className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 z-20 shadow-sm"
        aria-label="Đóng"
        title={isPage ? "Quay lại" : "Đóng"}
      >
        <X size={16} />
      </button>

      {/* Brand Logo integrated directly on the form header */}
      <div className="flex justify-center mb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 select-none group"
        >
          <NextImage
            src="/cinephim-logo.png"
            alt="NetPhim Logo"
            width={36}
            height={36}
            priority
            className="h-9 w-9 object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/logo.png";
            }}
          />
          <span className="text-2xl font-black tracking-tight text-white flex items-center font-sans">
            Net
            <span className="text-violet-400 drop-shadow-[0_0_12px_rgba(167,139,250,0.6)]">
              Phim
            </span>
          </span>
        </Link>
      </div>

      {/* Title Header */}
      <div className="text-center mb-5">
        <h1 className="text-2xl sm:text-[25px] font-extrabold text-white tracking-tight">
          {isForgotMode
            ? "Khôi phục mật khẩu"
            : mode === "login"
              ? "Chào mừng trở lại"
              : "Tạo tài khoản"}
        </h1>
        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
          {isForgotMode
            ? "Nhập email đăng ký để nhận liên kết khôi phục mật khẩu."
            : mode === "login"
              ? "Cùng thưởng thức những bộ phim tuyệt vời nhất."
              : "Đăng ký thành viên để thưởng thức kho phim HD/4K không giới hạn."}
        </p>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium leading-relaxed text-red-300">
          <span className="mt-0.5 shrink-0 text-red-400">⚠</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Body View */}
      <div className="overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isForgotMode ? "forgot" : mode}
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -8,
            }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {isForgotMode ? (
              /* Forgot Password Form */
              <form
                onSubmit={handleForgotPasswordSubmit}
                className="space-y-4"
              >
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="Email đã đăng ký"
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#00b553] hover:bg-[#009e48] text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-[#00b553]/25 active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
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
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="text-xs text-neutral-400 hover:text-white font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Quay lại đăng nhập</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Login / Register Main Form */
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === "register" && (
                  <>
                    {/* Full Name */}
                    <div>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Họ và tên"
                          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/20"
                        />
                      </div>
                    </div>

                    {/* Username */}
                    <div>
                      <div className="relative">
                        <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Tên tài khoản (username)"
                          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/20"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Email / Username Field */}
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
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
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                </div>

                {/* Password Fields */}
                {mode === "login" ? (
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu"
                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => setIsForgotMode(true)}
                        className="text-xs text-neutral-400 hover:text-white font-medium transition-colors cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Register Password Fields */
                  <div className="space-y-3">
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Xác nhận mật khẩu"
                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-all focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/20"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Turnstile Bot Protection */}
                {turnstileEnabled && (
                  <div className="py-1 flex justify-center">
                    <TurnstileWidget
                      action={mode}
                      onTokenChange={(token) => setTurnstileToken(token)}
                    />
                  </div>
                )}

                {/* Submit Action Button (Clean Emerald Accent Matching Reference) */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#00b553] hover:bg-[#009e48] text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-[#00b553]/25 active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : mode === "login" ? (
                    <span>Đăng nhập</span>
                  ) : (
                    <span>Đăng ký tài khoản</span>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-5">
        <div className="flex-grow border-t border-white/10" />
        <span className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          HOẶC
        </span>
        <div className="flex-grow border-t border-white/10" />
      </div>

      {/* Social Login: Google Button (Full Width Matching Reference) */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 py-3 px-4 transition-all cursor-pointer text-sm font-medium text-white disabled:opacity-50 active:scale-[0.98]"
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
          <span>Đăng nhập bằng Google</span>
        </button>

        {/* Facebook Login Alternative */}
        <button
          type="button"
          onClick={handleFacebookLogin}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 px-4 transition-all cursor-pointer text-xs font-medium text-neutral-300 disabled:opacity-50 active:scale-[0.98]"
        >
          <svg
            className="w-4 h-4 fill-[#1877F2] shrink-0"
            viewBox="0 0 24 24"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Đăng nhập bằng Facebook</span>
        </button>
      </div>

      {/* Switch Mode Footer Link */}
      <div className="text-center mt-5 text-xs text-neutral-400">
        {mode === "login" ? (
          <>
            Chưa có tài khoản?{" "}
            <button
              type="button"
              onClick={() => {
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
                setIsForgotMode(false);
                setMode("login");
              }}
              className="font-bold text-white hover:underline cursor-pointer ml-1 transition-colors"
            >
              Đăng nhập ngay
            </button>
          </>
        )}
      </div>
    </div>
  );

  /* ── Page Layout View (/login & /register) ── */
  if (isPage) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col justify-center items-center relative overflow-y-auto px-4 py-8 font-primary">
        {/* Fullscreen Random Movie Collage Backdrop - Fast High-Priority Load */}
        <CinematicAuthBackground artworkUrl={currentArtwork.url} />

        {/* Centered Auth Card */}
        <main className="w-full flex items-center justify-center my-auto relative z-10">
          {cardContent}
        </main>

        {/* Bottom Footer Credits */}
        <footer className="w-full max-w-md mx-auto text-center py-4 relative z-10">
          <p className="text-xs text-neutral-400/80">
            © {new Date().getFullYear()} NetPhim. Nền tảng xem phim trực tuyến độ nét cao.
          </p>
        </footer>
      </div>
    );
  }

  /* ── Modal Layout View (Header Popup) ── */
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200 font-primary">
      {/* Fullscreen Random Movie Collage Backdrop - Fast High-Priority Load */}
      <CinematicAuthBackground artworkUrl={currentArtwork.url} />

      {/* Click outside backdrop to close */}
      <div
        onClick={closeModal}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] cursor-pointer z-0"
      />

      {/* Centered Auth Card */}
      <div className="relative z-10 my-auto py-4 w-full flex justify-center">
        {cardContent}
      </div>
    </div>
  );
}
