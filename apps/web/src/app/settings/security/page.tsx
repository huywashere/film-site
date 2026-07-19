'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Shield, Laptop, RefreshCw, LogOut, CheckCircle, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Session {
  id: string;
  ipAddress: string;
  browser: string;
  os: string;
  device?: string;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{ qrCode: string; secret: string; backupCodes: string[] } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);

  useEffect(() => {
    fetchMe();
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await authApi.getSessions();
      setSessions(res.data || []);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await authApi.revokeSession(id);
      toast('Đăng xuất thiết bị thành công', 'success');
      loadSessions();
    } catch (err) {
      toast('Đăng xuất thiết bị thất bại', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác không?')) return;
    setRevokingAll(true);
    try {
      await authApi.revokeAllSessions();
      toast('Đã đăng xuất toàn bộ thiết bị khác thành công', 'success');
      loadSessions();
    } catch (err) {
      toast('Thao tác thất bại', 'error');
    } finally {
      setRevokingAll(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await authApi.setup2FA();
      setTwoFactorData(res.data);
      setShow2FAModal(true);
    } catch (err) {
      toast('Không thể sinh QR Code cho 2FA', 'error');
    }
  };

  const handleVerify2FA = async () => {
    if (!otpCode) return;
    setVerifying2FA(true);
    try {
      await authApi.verify2FA({ code: otpCode });
      toast('Kích hoạt 2FA thành công!', 'success');
      setShow2FAModal(false);
      setTwoFactorData(null);
      setOtpCode('');
      fetchMe();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message;
      toast(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || 'Xác thực OTP thất bại', 'error');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Nhập mã OTP để xác nhận tắt 2FA:');
    if (!code) return;
    setDisabling2FA(true);
    try {
      await authApi.disable2FA({ code });
      toast('Đã tắt xác thực 2 lớp thành công', 'success');
      fetchMe();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message;
      toast(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg || 'Xác thực OTP thất bại', 'error');
    } finally {
      setDisabling2FA(false);
    }
  };

  // Google link URL
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const googleLinkUrl = `${apiBase.replace('/api/v1', '')}/api/v1/auth/google`;

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p>Vui lòng đăng nhập để xem cài đặt bảo mật.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 max-w-5xl mx-auto space-y-10">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Cài Đặt Bảo Mật</h1>
        <p className="text-zinc-400">Quản lý xác thực hai yếu tố, phiên hoạt động và liên kết mạng xã hội.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: 2FA & Google Account */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Card 1: 2FA / TOTP */}
          <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Xác thực hai yếu tố (2FA)</h3>
                <p className="text-sm text-zinc-400">Bảo vệ tài khoản bằng cách yêu cầu mã OTP mỗi lần đăng nhập.</p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6 flex items-center justify-between">
              <div>
                <span className="text-sm text-zinc-400">Trạng thái: </span>
                {user.twoFactorEnabled ? (
                  <span className="text-green-500 font-semibold inline-flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-1 inline" /> Đang bật
                  </span>
                ) : (
                  <span className="text-zinc-500 font-semibold inline-flex items-center text-sm">
                    <ShieldAlert className="h-4 w-4 mr-1 inline" /> Đang tắt
                  </span>
                )}
              </div>

              {user.twoFactorEnabled ? (
                <button
                  onClick={handleDisable2FA}
                  disabled={disabling2FA}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
                >
                  Tắt 2FA
                </button>
              ) : (
                <button
                  onClick={handleSetup2FA}
                  className="bg-primary hover:bg-primary/90 text-black font-semibold text-sm px-5 py-2.5 rounded-full transition-all"
                >
                  Thiết lập 2FA
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Google Link */}
          <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Liên kết tài khoản Google</h3>
                <p className="text-sm text-zinc-400">Đăng nhập nhanh bằng tài khoản Google mà không cần mật khẩu.</p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6 flex items-center justify-between">
              <div>
                <span className="text-sm text-zinc-400">Trạng thái: </span>
                {user.googleId ? (
                  <span className="text-green-500 font-semibold text-sm">Đã liên kết</span>
                ) : (
                  <span className="text-zinc-500 font-semibold text-sm">Chưa liên kết</span>
                )}
              </div>

              {user.googleId ? (
                <button
                  disabled
                  className="bg-zinc-900 border border-white/5 text-zinc-500 font-semibold text-sm px-5 py-2.5 rounded-full cursor-not-allowed"
                >
                  Đã liên kết Google
                </button>
              ) : (
                <a
                  href={googleLinkUrl}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all flex items-center space-x-2"
                >
                  <span>Liên kết Google</span>
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Sessions (Device Tracking) */}
        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Laptop className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Thiết Bị Hoạt Động</h3>
            </div>
            <button
              onClick={loadSessions}
              disabled={loadingSessions}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loadingSessions ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-zinc-400">Đây là các thiết bị đã đăng nhập gần đây. Bạn có thể đăng xuất khỏi bất kỳ thiết bị lạ nào.</p>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {loadingSessions ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              sessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`p-4 rounded-xl border transition-all ${
                    session.isCurrent ? 'bg-primary/5 border-primary/20' : 'bg-zinc-900/50 border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{session.browser}</p>
                      <p className="text-xs text-zinc-400">{session.os}</p>
                      <p className="text-[11px] text-zinc-500 mt-1 font-mono">{session.ipAddress}</p>
                    </div>

                    {session.isCurrent ? (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        Hiện tại
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="text-red-400 hover:text-red-500 transition-colors p-1"
                        title="Đăng xuất thiết bị này"
                      >
                        {revokingId === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-3">
                    HĐ gần nhất: {new Date(session.lastUsedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              ))
            )}
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAllOtherSessions}
              disabled={revokingAll}
              className="w-full bg-zinc-900 hover:bg-red-950 hover:text-red-400 text-zinc-300 border border-white/5 font-semibold text-xs py-3 rounded-xl transition-all flex justify-center items-center"
            >
              {revokingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Đăng xuất các thiết bị khác
            </button>
          )}
        </div>

      </div>

      {/* 2FA SETUP MODAL */}
      {show2FAModal && twoFactorData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-zinc-950 border border-white/10 rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-center">Thiết Lập 2FA</h3>
            
            <div className="space-y-4">
              <p className="text-sm text-zinc-400 text-center">
                Quét mã QR Code dưới đây bằng ứng dụng xác thực (Google Authenticator, Microsoft Authenticator hoặc Authy) của bạn:
              </p>
              
              <div className="flex justify-center">
                <img 
                  src={twoFactorData.qrCode} 
                  alt="QR Code 2FA" 
                  className="w-48 h-48 border-4 border-white rounded-lg"
                />
              </div>
              
              <div className="bg-zinc-900 p-3 rounded-lg border border-white/5 font-mono text-center text-xs select-all">
                Mã bí mật: <span className="text-primary font-bold">{twoFactorData.secret}</span>
              </div>

              {/* Backup Codes */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-red-400 text-center">⚠️ VUI LÒNG LƯU LẠI 10 MÃ DỰ PHÒNG DƯỚI ĐÂY (CHỈ XUẤT HIỆN 1 LẦN):</p>
                <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-3 rounded-lg border border-white/5 font-mono text-center text-xs text-zinc-400">
                  {twoFactorData.backupCodes.map((code, index) => (
                    <div key={index} className="py-0.5 select-all">{code}</div>
                  ))}
                </div>
              </div>

              {/* Verify OTP field */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-sm font-semibold">Nhập mã OTP 6 số để xác nhận:</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ví dụ: 123456"
                  className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-center font-bold tracking-widest text-lg"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  setShow2FAModal(false);
                  setTwoFactorData(null);
                  setOtpCode('');
                }}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleVerify2FA}
                disabled={verifying2FA || otpCode.length !== 6}
                className="flex-1 bg-primary hover:bg-primary/95 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {verifying2FA ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Kích Hoạt'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
