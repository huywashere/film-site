'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await authApi.forgotPassword({ email });
      toast(res.data?.message || 'Email khôi phục đã được gửi!', 'success');
      setStatus('success');
    } catch (err: any) {
      // Dù lỗi hay không cũng nên báo thành công để tránh dò email
      // Nhưng nếu lỗi network/validation thì báo lỗi
      const msg = err?.response?.data?.message;
      const finalMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Đã gửi yêu cầu');
      toast(finalMsg, 'info');
      setStatus('success');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-md w-full bg-zinc-900/80 p-8 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Quên Mật Khẩu?</h2>
          <p className="text-zinc-400">
            Nhập email của bạn và chúng tôi sẽ gửi cho bạn một liên kết để đặt lại mật khẩu.
          </p>
        </div>

        {status === 'success' ? (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-green-500/10 text-green-400 p-4 rounded-lg mb-6 border border-green-500/20">
              Kiểm tra hộp thư đến của bạn (bao gồm cả thư mục Spam) để nhận liên kết đặt lại mật khẩu.
            </div>
            <Link 
              href="/login"
              className="inline-flex items-center text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại Đăng Nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email của bạn..."
                className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3.5 rounded-xl transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Đang gửi...
                </>
              ) : (
                'Gửi Liên Kết Đặt Lại'
              )}
            </button>

            <div className="text-center">
              <Link 
                href="/login"
                className="inline-flex items-center text-zinc-400 hover:text-white text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại Đăng Nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
