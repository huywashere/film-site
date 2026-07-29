"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";
import {
  Shield,
  Laptop,
  RefreshCw,
  LogOut,
  CheckCircle2,
  ShieldAlert,
  KeyRound,
  Loader2,
  Lock,
  Copy,
  Check,
  User,
  ArrowLeft,
  Globe,
} from "lucide-react";
import Link from "next/link";

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

// ── Sub-component: 2FA Card ──────────────────────────────────────────
function TwoFactorSection({
  user,
  onSetup,
  onDisable,
  disabling,
}: {
  user: any;
  onSetup: () => void;
  onDisable: () => void;
  disabling: boolean;
}) {
  return (
    <div className="bg-[#14181f] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-white">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Xác thực hai yếu tố (2FA)
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Yêu cầu mã xác thực OTP từ ứng dụng Authenticator khi đăng nhập.
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 shrink-0 ${
            user.twoFactorEnabled
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-white/5 border border-white/10 text-neutral-400"
          }`}
        >
          {user.twoFactorEnabled ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Đang bật</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-neutral-500" />
              <span>Đang tắt</span>
            </>
          )}
        </span>
      </div>

      <div className="border-t border-white/5 pt-4 flex items-center justify-between">
        <p className="text-xs text-neutral-400">
          {user.twoFactorEnabled
            ? "Tài khoản của bạn đã được bảo vệ bằng 2FA."
            : "Khuyên dùng để bảo vệ tài khoản khỏi truy cập trái phép."}
        </p>

        {user.twoFactorEnabled ? (
          <button
            onClick={onDisable}
            disabled={disabling}
            className="bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 text-neutral-300 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Tắt 2FA
          </button>
        ) : (
          <button
            onClick={onSetup}
            className="bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            Thiết lập 2FA
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: Google Link Card ─────────────────────────────────
function GoogleLinkSection({ user }: { user: any }) {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  const googleLinkUrl = `${apiBase.replace("/api/v1", "")}/api/v1/auth/google`;

  return (
    <div className="bg-[#14181f] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-white">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              Liên kết tài khoản Google
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Đăng nhập nhanh bằng Google mà không cần mật khẩu.
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
            user.googleId
              ? "bg-white/10 border border-white/15 text-white"
              : "bg-white/5 border border-white/10 text-neutral-400"
          }`}
        >
          {user.googleId ? "Đã liên kết" : "Chưa liên kết"}
        </span>
      </div>

      <div className="border-t border-white/5 pt-4 flex items-center justify-between">
        <p className="text-xs text-neutral-400">
          {user.googleId
            ? "Tài khoản Google đã liên kết thành công."
            : "Chưa kết nối tài khoản Google nào."}
        </p>

        {user.googleId ? (
          <button
            disabled
            className="bg-white/5 border border-white/10 text-neutral-500 font-bold text-xs px-5 py-2.5 rounded-xl cursor-not-allowed"
          >
            Đã liên kết Google
          </button>
        ) : (
          <a
            href={googleLinkUrl}
            className="bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center space-x-2"
          >
            <span>Liên kết Google</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function SecuritySettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

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
      console.error("Failed to load sessions", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await authApi.revokeSession(id);
      toast("Đăng xuất thiết bị thành công", "success");
      loadSessions();
    } catch (err) {
      toast("Đăng xuất thiết bị thất bại", "error");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác không?",
      )
    )
      return;
    setRevokingAll(true);
    try {
      await authApi.revokeAllSessions();
      toast("Đã đăng xuất toàn bộ thiết bị khác thành công", "success");
      loadSessions();
    } catch (err) {
      toast("Thao tác thất bại", "error");
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
      toast("Không thể sinh QR Code cho 2FA", "error");
    }
  };

  const handleVerify2FA = async () => {
    if (!otpCode) return;
    setVerifying2FA(true);
    try {
      await authApi.verify2FA({ code: otpCode });
      toast("Kích hoạt 2FA thành công!", "success");
      setShow2FAModal(false);
      setTwoFactorData(null);
      setOtpCode("");
      fetchMe();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message;
      toast(
        Array.isArray(errorMsg)
          ? errorMsg.join(", ")
          : errorMsg || "Xác thực OTP thất bại",
        "error",
      );
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt("Nhập mã OTP 6 số để xác nhận tắt 2FA:");
    if (!code) return;
    setDisabling2FA(true);
    try {
      await authApi.disable2FA({ code });
      toast("Đã tắt xác thực 2 lớp thành công", "success");
      fetchMe();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message;
      toast(
        Array.isArray(errorMsg)
          ? errorMsg.join(", ")
          : errorMsg || "Xác thực OTP thất bại",
        "error",
      );
    } finally {
      setDisabling2FA(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <p className="text-sm font-semibold text-neutral-400">
          Vui lòng đăng nhập để xem cài đặt bảo mật.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1216] text-foreground pb-24 pt-24 px-4 md:px-12 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center space-x-2 text-xs text-neutral-400 mb-2">
              <Link
                href="/"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={13} /> Trang chủ
              </Link>
              <span>/</span>
              <span className="text-white font-bold">Cài đặt bảo mật</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Cài Đặt Bảo Mật
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Quản lý xác thực hai yếu tố, theo dõi thiết bị hoạt động và liên
              kết mạng xã hội.
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center space-x-2 bg-white/5 border border-white/10 p-1 rounded-xl self-start md:self-auto">
            <button className="px-4 py-2 rounded-lg bg-white/10 text-white font-extrabold text-xs flex items-center space-x-1.5 cursor-pointer">
              <Lock size={13} />
              <span>Bảo mật</span>
            </button>
            {user.username && (
              <Link
                href={`/profile/${user.username}`}
                className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white font-bold text-xs transition-colors flex items-center space-x-1.5"
              >
                <User size={13} />
                <span>Hồ sơ</span>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 2FA & Google Account */}
          <div className="lg:col-span-7 space-y-6">
            <TwoFactorSection
              user={user}
              onSetup={handleSetup2FA}
              onDisable={handleDisable2FA}
              disabling={disabling2FA}
            />

            <GoogleLinkSection user={user} />
          </div>

          {/* Right Column: Sessions (Device Tracking) */}
          <div className="lg:col-span-5 bg-[#14181f] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Thiết Bị Hoạt Động
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {sessions.length} thiết bị đã đăng nhập
                  </p>
                </div>
              </div>

              <button
                onClick={loadSessions}
                disabled={loadingSessions}
                className="p-2 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Làm mới danh sách thiết bị"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingSessions ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      session.isCurrent
                        ? "bg-white/10 border-white/20"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-xs text-white truncate">
                            {session.browser}
                          </p>
                          {session.isCurrent && (
                            <span className="text-[9px] bg-white/20 border border-white/30 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                              Thiết bị này
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {session.os}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-1 font-mono flex items-center space-x-1">
                          <Globe size={10} />
                          <span>{session.ipAddress}</span>
                        </p>
                      </div>

                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingId === session.id}
                          className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Đăng xuất thiết bị này"
                        >
                          {revokingId === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                          ) : (
                            <LogOut className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllOtherSessions}
                disabled={revokingAll}
                className="w-full bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 font-bold text-xs py-3 rounded-xl transition-all flex justify-center items-center cursor-pointer active:scale-98"
              >
                {revokingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Đăng xuất tất cả thiết bị khác
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2FA SETUP MODAL */}
      {show2FAModal && twoFactorData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#14181f] border border-white/15 rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-extrabold text-white">
                Thiết Lập Xác Thực 2FA
              </h3>
              <p className="text-xs text-neutral-400">
                Quét mã QR bằng ứng dụng Authenticator của bạn.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center p-3 bg-white rounded-2xl shadow-inner w-fit mx-auto">
                <img
                  src={twoFactorData.qrCode}
                  alt="QR Code 2FA"
                  className="w-44 h-44 rounded-lg object-contain"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10 font-mono text-center text-xs flex items-center justify-between">
                <span className="text-neutral-400">Mã bí mật:</span>
                <span className="text-white font-bold select-all">
                  {twoFactorData.secret}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(twoFactorData.secret);
                    setCopiedSecret(true);
                    setTimeout(() => setCopiedSecret(false), 2000);
                  }}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  {copiedSecret ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              {/* Backup Codes */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-neutral-400 text-center">
                  ⚠️ LƯU LẠI 10 MÃ DỰ PHÒNG DƯỚI ĐÂY (DÙNG KHI MẤT ĐIỆN THOẠI):
                </p>
                <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-3 rounded-xl border border-white/10 font-mono text-center text-xs text-neutral-300">
                  {twoFactorData.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="py-0.5 select-all font-semibold"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Verify OTP field */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-xs font-bold text-neutral-300">
                  Nhập mã OTP 6 số từ ứng dụng:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="123456"
                  className="w-full bg-black/60 border border-white/15 text-white rounded-xl px-4 py-3 outline-none focus:border-white/40 transition-colors text-center font-black tracking-widest text-xl"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  setShow2FAModal(false);
                  setTwoFactorData(null);
                  setOtpCode("");
                }}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleVerify2FA}
                disabled={verifying2FA || otpCode.length !== 6}
                className="flex-1 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg active:scale-95 cursor-pointer"
              >
                {verifying2FA ? (
                  <Loader2 className="h-5 w-5 animate-spin text-black" />
                ) : (
                  "Kích Hoạt 2FA"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
