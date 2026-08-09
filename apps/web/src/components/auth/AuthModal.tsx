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

import { CinematicAuthBackground } from "@/components/auth/CinematicAuthBackground";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";

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

  const handleFirebaseUserSuccess = async (fbUser: any) => {
    const user = await establishFirebaseSession(fbUser);
    setUser(user);

    toast(
      `Đăng nhập thành công! Chào mừng ${user.displayName || user.username}.`,
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
      setErrorMsg(
        err.code === "auth/popup-blocked"
          ? "Trình duyệt đã chặn cửa sổ Google. Hãy cho phép popup rồi thử lại."
          : err.code === "auth/popup-closed-by-user"
            ? "Bạn đã đóng cửa sổ đăng nhập Google."
            : err.message || "Đăng nhập Google thất bại.",
      );
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

    if (password.length < 8) {
      setErrorMsg("Mật khẩu phải có ít nhất 8 ký tự.");
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
              "Tài khoản đã được tạo. Hãy kiểm tra email để xác minh trước khi đăng nhập.",
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Background Poster Collage */}
      <CinematicAuthBackground />

      {/* Backdrop Close Overlay */}
      <div
        onClick={closeModal}
        className="absolute inset-0 z-0 cursor-pointer"
      />

      {/* Semi-Transparent Glass Modal Card (Be Vietnam Pro / CineVerse Font System) */}
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#141414]/95 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_0_90px_rgba(0,0,0,0.95)] p-5 sm:p-7 z-10 my-auto flex flex-col font-primary [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>

        {/* Title Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isForgotMode
              ? "Quên mật khẩu"
              : mode === "login"
                ? "Đăng nhập"
                : "Tạo tài khoản"}
          </h1>
          <p className="text-xs text-neutral-300/90 font-medium mt-1.5 leading-relaxed max-w-sm mx-auto">
            {isForgotMode
              ? "Nhập địa chỉ email đăng ký của bạn để nhận liên kết khôi phục mật khẩu."
              : mode === "login"
                ? "Đăng nhập để tiếp tục trải nghiệm xem phim 4K, hoặc tạo tài khoản mới bằng Email, Google hoặc Facebook."
                : "Tạo tài khoản thành viên để xem phim 4K miễn phí, lưu danh sách yêu thích và đồng bộ lịch sử xem."}
          </p>
        </div>

        {!isForgotMode && (
          /* Mode Switching Tabs (Grid 2 Nút Đặt Ngang) */
          <div className="grid grid-cols-2 gap-2.5 mb-4 relative">
            <button
              type="button"
              onClick={() => {
                setIsForgotMode(false);
                setMode("login");
              }}
              className={`relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-white/15 border-white/40 text-white shadow-md backdrop-blur-md"
                  : "bg-white/[0.04] border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200"
              }`}
            >
              {mode === "login" && (
                <motion.div
                  layoutId="activeTabIndicatorModal"
                  className="absolute inset-0 bg-white/15 border border-white/40 rounded-lg shadow-sm -z-10 backdrop-blur-md"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <LogIn size={15} />
              <span>Đăng nhập</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotMode(false);
                setMode("register");
              }}
              className={`relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-white/15 border-white/40 text-white shadow-md backdrop-blur-md"
                  : "bg-white/[0.04] border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200"
              }`}
            >
              {mode === "register" && (
                <motion.div
                  layoutId="activeTabIndicatorModal"
                  className="absolute inset-0 bg-white/15 border border-white/40 rounded-lg shadow-sm -z-10 backdrop-blur-md"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <UserPlus size={15} />
              <span>Tạo tài khoản</span>
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Form Body View */}
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
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {isForgotMode ? (
                /* Forgot Password Form */
                <form
                  onSubmit={handleForgotPasswordSubmit}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Địa chỉ Email đăng ký
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        placeholder="nhap-email@example.com"
                        className="w-full bg-white/[0.06] border border-white/15 rounded-lg pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
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
              ) : (
                /* Login / Register Main Form */
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
                        type={mode === "login" ? "text" : "email"}
                        autoComplete="email"
                        required
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
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

                  {/* Turnstile Bot Protection */}
                  {turnstileEnabled && (
                    <div className="py-1">
                      <TurnstileWidget
                        action={mode}
                        onTokenChange={(token) => setTurnstileToken(token)}
                      />
                    </div>
                  )}

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    disabled={loading || (turnstileEnabled && !turnstileToken)}
                    className="w-full py-3 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <span>
                        {mode === "login" ? "Đăng nhập ngay" : "Tạo tài khoản"}
                      </span>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Forgot password link */}
        {!isForgotMode && mode === "login" && (
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => setIsForgotMode(true)}
              className="text-xs text-neutral-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              Quên mật khẩu?
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="relative flex items-center justify-center my-3">
          <div className="flex-grow border-t border-white/15" />
          <span className="px-3 text-xs font-medium text-neutral-400 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
            hoặc tiếp tục bằng
          </span>
          <div className="flex-grow border-t border-white/15" />
        </div>

        {/* Social Buttons (Google & Facebook) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2.5 bg-white/[0.06] hover:bg-white/15 border border-white/15 rounded-lg py-2.5 px-3 transition-colors cursor-pointer text-xs font-medium text-neutral-200 disabled:opacity-50"
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
            disabled={loading}
            className="flex items-center justify-center gap-2.5 bg-white/[0.06] hover:bg-white/15 border border-white/15 rounded-lg py-2.5 px-3 transition-colors cursor-pointer text-xs font-medium text-neutral-200 disabled:opacity-50"
          >
            <svg
              className="w-4 h-4 fill-[#1877F2] shrink-0"
              viewBox="0 0 24 24"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Facebook</span>
          </button>
        </div>
      </div>
    </div>
  );
}
