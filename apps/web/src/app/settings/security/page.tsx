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
  Copy,
  Check,
  ArrowLeft,
  Globe,
  Monitor,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { AccountPageTabs } from "@/components/account/AccountPageTabs";
import { cn } from "@/lib/utils";

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

// ── 2FA Section ──────────────────────────────────────────────────────
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
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            user.twoFactorEnabled
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : "bg-white/[0.05] border border-white/10"
          )}>
            <Shield className={cn("h-5 w-5", user.twoFactorEnabled ? "text-emerald-400" : "text-neutral-400")} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Xác thực hai bước (2FA)</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Thêm một lớp bảo vệ bằng mã OTP từ ứng dụng Authenticator.
            </p>
          </div>
        </div>

        <span className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0",
          user.twoFactorEnabled
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-white/[0.05] border border-white/10 text-neutral-500"
        )}>
          {user.twoFactorEnabled ? <><CheckCircle2 className="h-3 w-3" /> Đang bật</> : <><ShieldAlert className="h-3 w-3" /> Tắt</>}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 p-5">
        <p className="text-xs text-neutral-500">
          {user.twoFactorEnabled
            ? "Tài khoản đã được bảo vệ bằng 2FA. Bạn có thể tắt nếu cần."
            : "Khuyến nghị bật để bảo vệ tài khoản khỏi truy cập trái phép."}
        </p>

        {user.twoFactorEnabled ? (
          <button onClick={onDisable} disabled={disabling}
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-neutral-400 text-xs font-semibold px-4 py-2 transition-all cursor-pointer disabled:opacity-50">
            {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tắt 2FA"}
          </button>
        ) : (
          <button onClick={onSetup}
            className="shrink-0 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold px-4 py-2 transition-colors cursor-pointer">
            Bật xác thực
          </button>
        )}
      </div>
    </div>
  );
}

// ── Google Link Section ──────────────────────────────────────────────
function GoogleLinkSection({ user }: { user: any }) {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "/api/v1"
      : "http://localhost:3001/api/v1");
  const googleLinkUrl = `${apiBase.replace("/api/v1", "")}/api/v1/auth/google`;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-neutral-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Liên kết tài khoản Google</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Đăng nhập nhanh hơn qua Google ở những lần sau.</p>
          </div>
        </div>

        <span className={cn(
          "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0",
          user.googleId
            ? "bg-white/[0.07] border border-white/10 text-neutral-300"
            : "bg-white/[0.03] border border-white/[0.07] text-neutral-600"
        )}>
          {user.googleId ? "Đã liên kết" : "Chưa liên kết"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 p-5">
        <p className="text-xs text-neutral-500">
          {user.googleId ? "Tài khoản Google đã được liên kết thành công." : "Chưa kết nối tài khoản Google nào."}
        </p>

        {user.googleId ? (
          <button disabled
            className="shrink-0 rounded-lg border border-white/[0.07] bg-white/[0.03] text-neutral-600 text-xs font-semibold px-4 py-2 cursor-not-allowed">
            Đã liên kết
          </button>
        ) : (
          <a href={googleLinkUrl}
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold px-4 py-2 transition-colors flex items-center gap-2">
            Liên kết Google
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
    if (!confirm("Bạn có chắc muốn đăng xuất khỏi tất cả thiết bị khác không?")) return;
    setRevokingAll(true);
    try {
      await authApi.revokeAllSessions();
      toast("Đã đăng xuất toàn bộ thiết bị khác", "success");
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
      toast(Array.isArray(errorMsg) ? errorMsg.join(", ") : errorMsg || "Xác thực OTP thất bại", "error");
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
      toast(Array.isArray(errorMsg) ? errorMsg.join(", ") : errorMsg || "Xác thực OTP thất bại", "error");
    } finally {
      setDisabling2FA(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
          <p className="text-sm text-neutral-500">Vui lòng đăng nhập để xem cài đặt bảo mật.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white select-none">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-8 pt-24 pb-28">

        {/* ── PAGE HEADER ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-neutral-600 mb-3">
            <Link href="/" className="flex items-center gap-1.5 hover:text-neutral-300 transition-colors">
              <ArrowLeft size={12} /> Trang chủ
            </Link>
            <span>/</span>
            <span className="text-neutral-400">Cài đặt bảo mật</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Bảo mật tài khoản</h1>
              <p className="mt-1.5 text-sm text-neutral-500">
                Quản lý các lớp bảo vệ và thiết bị đang đăng nhập.
              </p>
            </div>
            <AccountPageTabs active="security" username={user.username} />
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">

          {/* Left: Security features */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Lớp bảo vệ</p>

            <TwoFactorSection
              user={user}
              onSetup={handleSetup2FA}
              onDisable={handleDisable2FA}
              disabling={disabling2FA}
            />

            <GoogleLinkSection user={user} />
          </div>

          {/* Right: Active sessions */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                  <Laptop className="h-5 w-5 text-neutral-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thiết bị đã đăng nhập</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{sessions.length} thiết bị đang hoạt động</p>
                </div>
              </div>

              <button onClick={loadSessions} disabled={loadingSessions}
                className="h-8 w-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Làm mới">
                <RefreshCw className={cn("h-3.5 w-3.5", loadingSessions && "animate-spin")} />
              </button>
            </div>

            <div className="divide-y divide-white/[0.05] max-h-[420px] overflow-y-auto">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-600" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-neutral-600">Không có thiết bị nào.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id}
                    className={cn(
                      "flex items-start gap-3 p-4 transition-colors",
                      session.isCurrent ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                    )}>
                    <div className="h-8 w-8 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center shrink-0 mt-0.5">
                      {session.device?.toLowerCase().includes("mobile") ? (
                        <Smartphone size={14} className="text-neutral-500" />
                      ) : (
                        <Monitor size={14} className="text-neutral-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{session.browser}</p>
                        {session.isCurrent && (
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-[#e50914]/10 border border-[#e50914]/20 text-[#e50914] px-2 py-0.5 rounded-md">
                            Thiết bị này
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">{session.os}</p>
                      <p className="flex items-center gap-1 text-[11px] text-neutral-600 font-mono">
                        <Globe size={10} /> {session.ipAddress}
                      </p>
                    </div>

                    {!session.isCurrent && (
                      <button onClick={() => handleRevokeSession(session.id)} disabled={revokingId === session.id}
                        className="shrink-0 h-7 w-7 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-colors cursor-pointer"
                        title="Đăng xuất thiết bị này">
                        {revokingId === session.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <LogOut className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {sessions.length > 1 && (
              <div className="p-4 border-t border-white/[0.06]">
                <button onClick={handleRevokeAllOtherSessions} disabled={revokingAll}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-neutral-400 text-xs font-semibold py-2.5 transition-all cursor-pointer disabled:opacity-50">
                  {revokingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                  Đăng xuất tất cả thiết bị khác
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2FA SETUP MODAL ── */}
      {show2FAModal && twoFactorData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Thiết lập xác thực 2FA</h3>
              <p className="text-xs text-neutral-500 mt-1">Quét mã QR bằng ứng dụng Authenticator của bạn.</p>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-xl w-fit mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={twoFactorData.qrCode} alt="QR Code 2FA" className="w-40 h-40 rounded-lg object-contain" />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 py-3 font-mono text-sm">
              <span className="text-neutral-500 text-xs">Mã bí mật:</span>
              <span className="text-white font-bold select-all text-xs">{twoFactorData.secret}</span>
              <button onClick={() => { navigator.clipboard.writeText(twoFactorData.secret); setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000); }}
                className="text-neutral-500 hover:text-white p-1 cursor-pointer">
                {copiedSecret ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-amber-400 text-center">
                ⚠️ Lưu lại 10 mã dự phòng dưới đây (dùng khi mất điện thoại):
              </p>
              <div className="grid grid-cols-2 gap-1 bg-black/40 p-3 rounded-xl border border-white/[0.07] font-mono text-xs text-neutral-400 text-center">
                {twoFactorData.backupCodes.map((code, i) => (
                  <div key={i} className="py-0.5 select-all">{code}</div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.07] space-y-2">
              <label className="text-xs font-semibold text-neutral-400">Nhập mã OTP 6 số để xác nhận:</label>
              <input type="text" maxLength={6} value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-4 py-3 outline-none focus:border-white/25 text-center font-black tracking-[0.4em] text-xl" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShow2FAModal(false); setTwoFactorData(null); setOtpCode(""); }}
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer">
                Hủy
              </button>
              <button onClick={handleVerify2FA} disabled={verifying2FA || otpCode.length !== 6}
                className="flex-1 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-sm py-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                {verifying2FA ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kích hoạt 2FA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
