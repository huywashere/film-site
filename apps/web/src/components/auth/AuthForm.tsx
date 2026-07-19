'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, User, Check, EyeOff, Eye } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/providers/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';
import styled from '@emotion/styled';
import { cn } from '@/lib/utils';

// --- EMOTION STYLED COMPONENTS ---

const StyledInputWrapper = styled.div`
  position: relative;
  width: 100%;

  .icon {
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
    transition: color 0.3s ease;
    pointer-events: none;
  }

  input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    border-radius: 9999px;
    padding: 14px 20px 14px 56px;
    font-size: 14px;
    transition: all 0.3s ease;
    outline: none;

    &::placeholder {
      color: #888;
    }

    &:focus, &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.5);
    }

    &:focus ~ .icon, &:hover ~ .icon, &:focus-within ~ .icon {
      color: white;
    }
  }

  .eye-btn {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.3s ease;

    &:hover {
      color: white;
    }
  }
`;

const StyledAuthCard = styled(motion.div)`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1000px;
  height: auto;
  min-height: 600px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  background: #0a0a0a;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  z-index: 10;

  @media (min-width: 1024px) {
    flex-direction: row;
    height: 600px;
  }
`;

interface AuthFormProps {
  initialMode?: 'login' | 'register';
}

export function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const router = useRouter();
  const { login, register, isLoading } = useAuthStore();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // 2FA login states
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        const result = await login(form.email, form.password);
        if (result && result.require2FA) {
          setRequire2FA(true);
          setTempToken(result.tempToken);
          toast('Vui lòng nhập mã OTP để tiếp tục đăng nhập', 'info');
        } else {
          toast('Đăng nhập thành công!', 'success');
          router.push('/');
        }
      } else {
        await register(form.email, form.username, form.password);
        toast('Đăng ký thành công!', 'success');
        router.push('/');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const finalMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Có lỗi xảy ra, vui lòng thử lại');
      toast(finalMsg, 'error');
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setVerifying2FA(true);
    try {
      const { authApi } = await import('@/lib/api');
      await authApi.loginVerify2FA({ tempToken, code: otp });
      toast('Xác thực OTP thành công!', 'success');
      
      const { fetchMe } = useAuthStore.getState();
      await fetchMe();
      
      router.push('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const finalMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Mã OTP không chính xác');
      toast(finalMsg, 'error');
    } finally {
      setVerifying2FA(false);
    }
  };

  const mockSocialLogin = (provider: string) => {
    toast(`Tính năng đăng nhập bằng ${provider} đang được phát triển.`, 'info');
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 perspective-1000">
      <AnimatePresence>
        <StyledAuthCard
          initial={{ opacity: 0, y: 50, rotateX: -10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        >
          {/* Left Side: Branding & Background */}
          <div className="relative w-full lg:w-[45%] h-64 lg:h-full flex flex-col items-center justify-center p-8 overflow-hidden bg-black">
            <div className="absolute inset-0 opacity-60">
              <div 
                className="w-full h-full bg-cover bg-center transition-all duration-500" 
                style={{ 
                  backgroundImage: `url('${mode === 'login' ? '/images/wp4300709-avengers-4k-wallpapers.jpg' : '/images/wp3533664-avengers-infinity-war-4k-wallpapers.jpg'}')` 
                }} 
              />
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex items-center space-x-2"
              >
                <span className="text-netflixRed text-5xl font-black">▶</span>
                <span className="text-white font-black text-4xl tracking-tighter lowercase font-sans">cineverse</span>
              </motion.div>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#0a0a0a] via-black/80 to-transparent pointer-events-none" />
          </div>

          {/* Right Side: Auth Form */}
          <div className="w-full lg:w-[55%] h-full bg-[#0a0a0a] p-8 md:p-12 flex flex-col">
            {/* Tabs */}
            <div className="flex justify-center space-x-10 mb-10 border-b border-white/5">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={cn(
                  "pb-3 text-lg font-semibold transition-colors relative outline-none",
                  mode === 'login' ? "text-white" : "text-neutral-500 hover:text-white"
                )}
              >
                Sign in
                {mode === 'login' && (
                  <motion.div 
                    layoutId="auth-tab-indicator"
                    className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-green-400 via-blue-500 to-red-500" 
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={cn(
                  "pb-3 text-lg font-semibold transition-colors relative outline-none",
                  mode === 'register' ? "text-white" : "text-neutral-500 hover:text-white"
                )}
              >
                Sign up
                {mode === 'register' && (
                  <motion.div 
                    layoutId="auth-tab-indicator"
                    className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-green-400 via-blue-500 to-red-500" 
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            </div>

            {require2FA ? (
              <form onSubmit={handleOTPSubmit} className="flex-1 flex flex-col space-y-5 justify-center">
                <div className="text-center space-y-2 mb-4">
                  <h4 className="text-xl font-bold text-white">Xác Thực 2 Lớp (2FA)</h4>
                  <p className="text-xs text-neutral-400">Nhập mã xác thực OTP 6 số hoặc mã dự phòng (backup code) của bạn.</p>
                </div>
                <StyledInputWrapper>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Mã OTP hoặc mã dự phòng"
                    required
                    className="text-center font-bold tracking-widest text-lg"
                  />
                  <Lock size={18} className="icon" />
                </StyledInputWrapper>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={verifying2FA}
                  className="w-full bg-[#1DB954] text-black font-bold rounded-full py-3.5 transition-colors mt-6 flex justify-center items-center shadow-[0_0_15px_rgba(29,185,84,0.3)]"
                >
                  {verifying2FA ? 'Verifying...' : 'Xác nhận OTP'}
                </motion.button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-5">
                <AnimatePresence mode="popLayout">
                  {mode === 'register' && (
                    <motion.div
                      key="username"
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <StyledInputWrapper>
                        <input
                          name="username"
                          type="text"
                          value={form.username}
                          onChange={handleChange}
                          placeholder="Username"
                          required={mode === 'register'}
                          minLength={3}
                        />
                        <User size={18} className="icon" />
                      </StyledInputWrapper>
                    </motion.div>
                  )}
                </AnimatePresence>

                <StyledInputWrapper>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    required
                  />
                  <User size={18} className="icon" />
                </StyledInputWrapper>

                <StyledInputWrapper>
                  <input
                    name="password"
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    minLength={6}
                  />
                  <Lock size={18} className="icon" />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="eye-btn"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </StyledInputWrapper>

                {/* Form Options */}
                <div className="flex items-center justify-between text-sm mt-2 px-1">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className={cn(
                      "w-[18px] h-[18px] border rounded flex items-center justify-center transition-colors",
                      rememberMe ? "bg-transparent border-white" : "border-neutral-500 group-hover:border-white"
                    )}>
                      {rememberMe && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-[10px] h-[10px] bg-white rounded-sm" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={rememberMe} 
                      onChange={() => setRememberMe(!rememberMe)} 
                    />
                    <span className="text-neutral-400 group-hover:text-white transition-colors">Remember me</span>
                  </label>

                  {mode === 'login' && (
                    <Link href="/forgot-password" className="text-neutral-400 hover:text-white transition-colors">
                      Forgot Password?
                    </Link>
                  )}
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1DB954] text-black font-bold rounded-full py-3.5 transition-colors mt-6 flex justify-center items-center shadow-[0_0_15px_rgba(29,185,84,0.3)]"
                >
                  {isLoading ? 'Processing...' : (mode === 'login' ? 'Sign in' : 'Sign up')}
                </motion.button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0a0a0a] px-4 text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                  Or
                </span>
              </div>
            </div>

            {/* Social Logins */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => mockSocialLogin('Facebook')}
                className="flex-1 bg-[#1877F2] text-white rounded-full py-3 px-4 flex items-center justify-center space-x-2 text-sm font-semibold"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span>Login with Facebook</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => mockSocialLogin('Google')}
                className="flex-1 bg-[#EA4335] text-white rounded-full py-3 px-4 flex items-center justify-center space-x-2 text-sm font-semibold"
              >
                <svg className="w-5 h-5 bg-white rounded-full p-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                <span>Login with Google</span>
              </motion.button>
            </div>
          </div>
        </StyledAuthCard>
      </AnimatePresence>
    </div>
  );
}
