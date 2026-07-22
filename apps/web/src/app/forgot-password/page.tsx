'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    await resetPassword(email);
    setStatus('success');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-md w-full bg-zinc-900/80 p-8 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Quên Mật Khẩu?</h2>
          <p className="text-zinc-400 text-sm">
            Nhập email của bạn và chúng tôi sẽ gửi cho bạn một liên kết qua Firebase Auth để đặt lại mật khẩu.
          </p>
        </div>

        {status === 'success' ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl mb-6 border border-emerald-500/20 text-xs leading-relaxed">
              Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới hộp thư của bạn (bao gồm cả thư mục Spam).
            </div>
            <Link 
              href="/"
              className="inline-flex items-center text-zinc-400 hover:text-white transition-colors text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại Trang chủ
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email của bạn (vd: name@example.com)..."
                className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-white/40 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-white hover:bg-neutral-200 text-black font-extrabold py-3.5 rounded-xl transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Đang gửi liên kết...
                </>
              ) : (
                'Gửi Liên Kết Khôi Phục Mật Khẩu'
              )}
            </button>

            <div className="text-center">
              <Link 
                href="/"
                className="inline-flex items-center text-zinc-400 hover:text-white text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại Trang chủ
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
