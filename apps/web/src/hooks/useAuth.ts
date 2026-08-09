"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import {
  getFirebaseAuth,
  getGoogleProvider,
  getFacebookProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "@/lib/firebase";
import { establishFirebaseSession } from "@/lib/auth-session";
import { mapFirebaseErrorToVietnamese } from "@/lib/firebaseErrorMap";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "@/lib/authValidation";
import { checkPasswordResetRateLimit } from "@/lib/rate-limiter";

export function useAuth() {
  const { user, setUser, isLoading, logout: storeLogout } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = async (
    fbUser: Parameters<typeof establishFirebaseSession>[0],
  ) => {
    const account = await establishFirebaseSession(fbUser);
    setUser(account);
  };

  // 1. REGISTER WITH EMAIL & PASSWORD
  const register = async (
    email: string,
    pass: string,
    confirmPass: string,
    username: string,
  ) => {
    setError(null);
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      setError(emailVal.message!);
      toast(emailVal.message!, "error");
      return false;
    }
    const passVal = validatePassword(pass);
    if (!passVal.valid) {
      setError(passVal.message!);
      toast(passVal.message!, "error");
      return false;
    }
    const confirmVal = validateConfirmPassword(pass, confirmPass);
    if (!confirmVal.valid) {
      setError(confirmVal.message!);
      toast(confirmVal.message!, "error");
      return false;
    }

    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        pass,
      );
      if (res.user) {
        if (username.trim()) {
          await updateProfile(res.user, { displayName: username.trim() });
        }
        try {
          await sendEmailVerification(res.user);
        } catch (vErr) {
          console.warn("Verification email error:", vErr);
        }
        await handleSuccess(res.user);
        toast(
          "Đăng ký thành công! Vui lòng kiểm tra hộp thư email để xác thực tài khoản.",
          "success",
        );
        return true;
      }
    } catch (err: any) {
      const msg = mapFirebaseErrorToVietnamese(err.code, err.message);
      setError(msg);
      toast(msg, "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 2. LOGIN WITH EMAIL & PASSWORD
  const login = async (
    email: string,
    pass: string,
    rememberMe: boolean = true,
  ) => {
    setError(null);
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      setError(emailVal.message!);
      toast(emailVal.message!, "error");
      return false;
    }

    setLoading(true);
    try {
      const persistence = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(getFirebaseAuth(), persistence);

      const res = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        pass,
      );
      if (res.user) {
        await handleSuccess(res.user);
        if (!res.user.emailVerified) {
          toast(
            "Tài khoản chưa được xác thực email. Bạn có thể bấm gửi lại email xác thực.",
            "info",
          );
        } else {
          toast("Đăng nhập thành công! Chào mừng bạn trở lại.", "success");
        }
        return true;
      }
    } catch (err: any) {
      const msg = mapFirebaseErrorToVietnamese(err.code, err.message);
      setError(msg);
      toast(msg, "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 3. GOOGLE SOCIAL LOGIN
  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
      if (res?.user) {
        await handleSuccess(res.user);
        toast(
          `Đăng nhập Google thành công! Chào mừng ${res.user.displayName || "bạn"}.`,
          "success",
        );
        return true;
      }
    } catch (err: any) {
      if (err.code === "auth/account-exists-with-different-credential") {
        const msg = mapFirebaseErrorToVietnamese(err.code);
        setError(msg);
        toast(msg, "error");
        return false;
      }
      try {
        await signInWithRedirect(getFirebaseAuth(), getGoogleProvider());
        return true;
      } catch (redirectErr: any) {
        const msg = mapFirebaseErrorToVietnamese(
          redirectErr.code,
          redirectErr.message,
        );
        setError(msg);
        toast(msg, "error");
        return false;
      }
    } finally {
      setLoading(false);
    }
  };

  // 4. FACEBOOK SOCIAL LOGIN
  const loginWithFacebook = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await signInWithPopup(
        getFirebaseAuth(),
        getFacebookProvider(),
      );
      if (res?.user) {
        await handleSuccess(res.user);
        toast(
          `Đăng nhập Facebook thành công! Chào mừng ${res.user.displayName || "bạn"}.`,
          "success",
        );
        return true;
      }
    } catch (err: any) {
      if (err.code === "auth/account-exists-with-different-credential") {
        const msg = mapFirebaseErrorToVietnamese(err.code);
        setError(msg);
        toast(msg, "error");
        return false;
      }
      try {
        await signInWithRedirect(getFirebaseAuth(), getFacebookProvider());
        return true;
      } catch (redirectErr: any) {
        const msg = mapFirebaseErrorToVietnamese(
          redirectErr.code,
          redirectErr.message,
        );
        setError(msg);
        toast(msg, "error");
        return false;
      }
    } finally {
      setLoading(false);
    }
  };

  // 5. RESET PASSWORD
  const resetPassword = async (email: string) => {
    setError(null);
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      setError(emailVal.message!);
      toast(emailVal.message!, "error");
      return false;
    }

    const rateCheck = checkPasswordResetRateLimit(email.trim());
    if (!rateCheck.allowed) {
      const msg = `Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau ${rateCheck.retryAfterSeconds} giây.`;
      setError(msg);
      toast(msg, "error");
      return false;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      toast(
        "Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới hộp thư của bạn.",
        "success",
      );
      return true;
    } catch (err: any) {
      // Show success message regardless to prevent user enumeration
      toast(
        "Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới hộp thư của bạn.",
        "success",
      );
      return true;
    } finally {
      setLoading(false);
    }
  };

  // 6. RESEND EMAIL VERIFICATION
  const sendVerificationEmail = async () => {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      toast(
        "Vui lòng đăng nhập trước khi yêu cầu gửi email xác thực.",
        "error",
      );
      return false;
    }

    const rateCheck = checkPasswordResetRateLimit(currentUser.uid);
    if (!rateCheck.allowed) {
      const msg = `Bạn đã yêu cầu gửi email xác thực quá nhiều lần. Vui lòng đợi ${rateCheck.retryAfterSeconds} giây.`;
      toast(msg, "error");
      return false;
    }

    setLoading(true);
    try {
      await sendEmailVerification(currentUser);
      toast(
        "Email xác thực đã được gửi lại! Vui lòng kiểm tra hòm thư của bạn.",
        "success",
      );
      return true;
    } catch (err: any) {
      const msg = mapFirebaseErrorToVietnamese(err.code, err.message);
      toast(msg, "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 7. LOGOUT
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(getFirebaseAuth());
      await storeLogout();
      toast("Đã đăng xuất thành công.", "info");
    } catch (err: any) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isLoading: isLoading || loading,
    error,
    login,
    register,
    loginWithGoogle,
    loginWithFacebook,
    resetPassword,
    sendVerificationEmail,
    logout,
  };
}
