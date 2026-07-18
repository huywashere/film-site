'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Film } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/providers/ToastProvider';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast('Đăng nhập thành công!', 'success');
      router.push('/');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Email hoặc mật khẩu không đúng', 'error');
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        {/* Logo */}
        <Link href="/" className={styles.authLogo}>
          <span className={styles.authLogoIcon}>▶</span>
          <span className={styles.authLogoText}>CineVerse</span>
        </Link>

        <h1 className={styles.authTitle}>Đăng nhập</h1>
        <p className={styles.authSub}>Chào mừng trở lại! Hãy tiếp tục khám phá điện ảnh.</p>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email hoặc tên đăng nhập</label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', padding: '0.75rem' }}
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className={styles.authDivider}>
          <span>Chưa có tài khoản?</span>
          <Link href="/register" className={styles.authLink}>
            Đăng ký ngay
          </Link>
        </div>
      </div>

      {/* Background decoration */}
      <div className={styles.authBg} aria-hidden>
        {['🎬', '🎭', '🎥', '🍿', '⭐', '🎞'].map((e, i) => (
          <span key={i} className={styles.authBgEmoji} style={{ '--i': i } as any}>
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}
