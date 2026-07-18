'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/providers/ToastProvider';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form.email, form.username, form.password);
      toast('Đăng ký thành công!', 'success');
      router.push('/');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Không thể tạo tài khoản', 'error');
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <Link href="/" className={styles.authLogo}>
          <span className={styles.authLogoIcon}>▶</span>
          <span className={styles.authLogoText}>CineVerse</span>
        </Link>

        <h1 className={styles.authTitle}>Tạo tài khoản</h1>
        <p className={styles.authSub}>Tham gia cộng đồng yêu điện ảnh CineVerse</p>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="input"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Tên đăng nhập</label>
            <input
              id="reg-username"
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Ít nhất 3 ký tự"
              className="input"
              required
              minLength={3}
              maxLength={20}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                type={showPw ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Ít nhất 6 ký tự"
                className="input"
                required
                minLength={6}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
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
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', padding: '0.75rem' }}
          >
            {isLoading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản'}
          </button>
        </form>

        <div className={styles.authDivider}>
          <span>Đã có tài khoản?</span>
          <Link href="/login" className={styles.authLink}>
            Đăng nhập
          </Link>
        </div>
      </div>
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
