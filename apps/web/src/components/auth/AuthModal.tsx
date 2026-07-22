'use client';

import { useState, useEffect } from 'react';
import { useAuthModalStore } from '@/store/authModalStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/providers/ToastProvider';
import { X, Loader2, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  firebaseAuth,
  googleProvider,
  facebookProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from '@/lib/firebase';

import { TurnstileWidget } from '@/components/auth/TurnstileWidget';

export function AuthModal() {
  const router = useRouter();
  const { isOpen, mode, closeModal, setMode } = useAuthModalStore();
  const { setUser, login, register } = useAuthStore();
  const { toast } = useToast();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  // Helper to determine role and assign Firebase user to Zustand state
  const handleFirebaseUserSuccess = (fbUser: any, customUsername?: string) => {
    const email = fbUser.email || `${fbUser.uid}@cineverse.app`;
    const name = customUsername || fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
    const role = email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER';

    setUser({
      id: fbUser.uid,
      email,
      username: name,
      displayName: name,
      avatarUrl: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2c3440&color=ffffff&size=100`,
      role,
    });

    toast(`Đăng nhập thành công! Chào mừng ${name} (${role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}).`, 'success');
    closeModal();
    router.push(`/profile/${encodeURIComponent(name)}`);
  };

  // Sync user state whenever Firebase Auth changes
  useEffect(() => {
    getRedirectResult(firebaseAuth).then((res) => {
      if (res?.user) {
        handleFirebaseUserSuccess(res.user);
      }
    }).catch((e) => console.warn('Redirect result check:', e));

    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      if (currentUser) {
        const email = currentUser.email || `${currentUser.uid}@cineverse.app`;
        const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
        const role = email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER';
        setUser({
          id: currentUser.uid,
          email,
          username: name,
          displayName: name,
          avatarUrl: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2c3440&color=ffffff&size=100`,
          role,
        });
        closeModal();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!turnstileToken) {
      const msg = 'Vui lòng hoàn thành xác minh Cloudflare Turnstile bảo mật trước khi tiếp tục.';
      setErrorMsg(msg);
      toast(msg, 'error');
      return;
    }

    const rawInput = emailOrUsername.trim();
    if (!rawInput || !password.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (mode === 'register') {
      if (!username.trim()) {
        setErrorMsg('Vui lòng nhập tên người dùng');
        return;
      }
      if (!confirmPassword.trim()) {
        setErrorMsg('Vui lòng nhập xác nhận mật khẩu');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không trùng khớp!');
        toast('Mật khẩu xác nhận không trùng khớp!', 'error');
        return;
      }
    }

    setLoading(true);
    const validEmail = rawInput.includes('@') ? rawInput : `${rawInput.toLowerCase()}@gmail.com`;

    try {
      if (mode === 'login') {
        try {
          // Attempt Firebase login
          const res = await signInWithEmailAndPassword(firebaseAuth, validEmail, password);
          handleFirebaseUserSuccess(res.user);
        } catch (fbErr: any) {
          console.warn('Firebase login check:', fbErr.code);
          if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
            // Auto-create account on Firebase if not registered yet
            try {
              const regRes = await createUserWithEmailAndPassword(firebaseAuth, validEmail, password);
              const displayName = rawInput.split('@')[0];
              await updateProfile(regRes.user, { displayName });
              handleFirebaseUserSuccess(regRes.user, displayName);
              return;
            } catch (regErr: any) {
              if (regErr.code === 'auth/wrong-password' || regErr.code === 'auth/email-already-in-use') {
                throw new Error('Mật khẩu không chính xác');
              }
            }
          }
          if (fbErr.code === 'auth/wrong-password') {
            throw new Error('Mật khẩu không chính xác');
          }
          await login(rawInput, password);
          toast('Đăng nhập thành công! Chào mừng bạn trở lại.', 'success');
          closeModal();
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.username) {
            router.push(`/profile/${encodeURIComponent(currentUser.username)}`);
          }
        }
      } else {
        try {
          // Attempt Firebase Registration
          const res = await createUserWithEmailAndPassword(firebaseAuth, validEmail, password);
          if (res.user) {
            await updateProfile(res.user, { displayName: username.trim() });
          }
          handleFirebaseUserSuccess(res.user, username.trim());
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/email-already-in-use') {
            const loginRes = await signInWithEmailAndPassword(firebaseAuth, validEmail, password);
            handleFirebaseUserSuccess(loginRes.user, username.trim());
            return;
          }
          await register(rawInput, username.trim(), password);
          toast('Đăng ký tài khoản thành công! Đang tự động đăng nhập...', 'success');
          await login(rawInput, password);
          closeModal();
          router.push(`/profile/${encodeURIComponent(username.trim())}`);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = err.response?.data?.message || err.message || 'Đã xảy ra lỗi. Vui lòng kiểm tra lại thông tin.';
      setErrorMsg(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await signInWithPopup(firebaseAuth, googleProvider);
      if (res?.user) {
        handleFirebaseUserSuccess(res.user);
        return;
      }
    } catch (err: any) {
      console.warn('Google popup auth notice, attempting redirect:', err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        toast('Bạn đã đóng cửa sổ đăng nhập Google', 'info');
        setLoading(false);
        return;
      }
      if (err.code === 'auth/operation-not-allowed') {
        const msg = 'Đăng nhập Google chưa bật trong Firebase Console (Authentication -> Méthode de connexion -> Google).';
        setErrorMsg(msg);
        toast(msg, 'error');
        setLoading(false);
        return;
      }
      try {
        // Fallback to signInWithRedirect for localhost cross-origin security
        await signInWithRedirect(firebaseAuth, googleProvider);
        return;
      } catch (redirectErr: any) {
        console.error('Google redirect auth error:', redirectErr);
        const msg = redirectErr.message || 'Không thể đăng nhập bằng Google.';
        setErrorMsg(msg);
        toast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await signInWithPopup(firebaseAuth, facebookProvider);
      if (res?.user) {
        handleFirebaseUserSuccess(res.user);
        return;
      }
    } catch (err: any) {
      console.warn('Facebook popup auth notice, attempting redirect:', err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        toast('Bạn đã đóng cửa sổ đăng nhập Facebook', 'info');
        setLoading(false);
        return;
      }
      if (err.code === 'auth/operation-not-allowed') {
        const msg = 'Đăng nhập Facebook chưa bật trong Firebase Console (Authentication -> Méthode de connexion -> Facebook).';
        setErrorMsg(msg);
        toast(msg, 'error');
        setLoading(false);
        return;
      }
      try {
        await signInWithRedirect(firebaseAuth, facebookProvider);
        return;
      } catch (redirectErr: any) {
        console.error('Facebook redirect auth error:', redirectErr);
        const msg = redirectErr.message || 'Không thể đăng nhập bằng Facebook.';
        setErrorMsg(msg);
        toast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Dark Overlay Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={closeModal}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-[#181c22] border border-[#2c3440] rounded-3xl p-7 shadow-2xl shadow-black/90 text-white font-sans animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Đóng modal"
        >
          <X size={18} />
        </button>

        {/* Top Header Tabs: Đăng nhập | Tạo tài khoản */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`text-base font-bold pb-1 transition-all border-b-2 ${
              mode === 'login'
                ? 'text-white border-white'
                : 'text-neutral-500 border-transparent hover:text-neutral-300'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            className={`text-base font-bold pb-1 transition-all border-b-2 ${
              mode === 'register'
                ? 'text-white border-white'
                : 'text-neutral-500 border-transparent hover:text-neutral-300'
            }`}
          >
            Tạo tài khoản
          </button>
        </div>

        {/* Social Logins */}
        <div className="space-y-2.5 mb-5">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-xs py-3 px-4 rounded-2xl hover:bg-neutral-200 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Tiếp tục sử dụng dịch vụ bằng Google</span>
          </button>

          {/* Facebook Button */}
          <button
            type="button"
            onClick={handleFacebookLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white font-semibold text-xs py-3 px-4 rounded-2xl hover:bg-[#166fe5] transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Tiếp tục với Facebook</span>
          </button>
        </div>

        {/* Legal Disclaimer */}
        <p className="text-[11px] text-neutral-400 text-center leading-relaxed mb-5">
          Bằng cách đăng ký sử dụng CineVerse, bạn xác nhận rằng bạn đã đọc và chấp nhận{' '}
          <Link href="/terms" className="text-neutral-300 underline hover:text-white">
            Điều khoản sử dụng
          </Link>{' '}
          và{' '}
          <Link href="/privacy" className="text-neutral-300 underline hover:text-white">
            Chính sách bảo mật
          </Link>.
        </p>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email / Username field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-300 block">
              {mode === 'login' ? 'Email hoặc tên người dùng' : 'Địa chỉ Email'}
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type={mode === 'login' ? 'text' : 'email'}
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder={mode === 'login' ? 'Nhập email hoặc tên tài khoản...' : 'nhap-email@example.com'}
                className="w-full bg-[#1c2228] border border-[#2c3440] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-all"
              />
            </div>
          </div>

          {/* Username field (Only for Register) */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-300 block">Tên người dùng (Username)</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nhaptendaidien"
                  className="w-full bg-[#1c2228] border border-[#2c3440] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
            </div>
          )}

          {/* Password field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-300 block">Mật khẩu</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1c2228] border border-[#2c3440] rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password field (Only for Register) */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-300 block">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1c2228] border border-[#2c3440] rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Cloudflare Turnstile CAPTCHA Widget */}
          <TurnstileWidget
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken('')}
            onError={() => setTurnstileToken('')}
            theme="dark"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider py-3 rounded-2xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
            )}
          </button>
        </form>

        {/* Forgot Password Link */}
        {mode === 'login' && (
          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              onClick={closeModal}
              className="text-xs font-bold text-neutral-400 hover:text-white transition-colors underline"
            >
              Bạn quên mật khẩu?
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
