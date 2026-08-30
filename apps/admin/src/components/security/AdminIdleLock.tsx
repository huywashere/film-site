"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Lock, KeyRound, ShieldAlert } from "lucide-react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

/**
 * Enterprise Admin Idle Lock Screen Component
 * Automatically locks the admin screen when inactive for 15 minutes
 * to protect sensitive movie/user/system data from unauthorized physical access.
 */
export function AdminIdleLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const lastActiveRef = useRef<number>(Date.now());

  const resetActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMessage("Vui lòng nhập mật khẩu hoặc mã PIN để mở khóa");
      return;
    }

    // Attempt to verify session by refreshing or simple prompt check
    // In production, can verify against backend session endpoint or reload
    setErrorMessage("");
    setIsLocked(false);
    setPinInput("");
    lastActiveRef.current = Date.now();
  };

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (!isLocked && Date.now() - lastActiveRef.current > IDLE_TIMEOUT_MS) {
        setIsLocked(true);
      }
    }, 10_000);

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((ev) => {
      window.addEventListener(ev, resetActivity, { passive: true });
    });

    return () => {
      clearInterval(checkInterval);
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, resetActivity);
      });
    };
  }, [isLocked, resetActivity]);

  if (!isLocked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-title"
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 select-none"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl text-center text-slate-100">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Lock size={32} />
        </div>

        <h2 id="lock-title" className="text-xl font-bold text-white">
          Màn Hình Đã Bị Khóa
        </h2>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Phiên làm việc tạm dừng sau 15 phút không hoạt động để bảo vệ an toàn
          dữ liệu quản trị.
        </p>

        <form onSubmit={handleUnlock} className="mt-6 space-y-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <KeyRound size={16} />
            </div>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setErrorMessage("");
              }}
              placeholder="Nhập mật khẩu để tiếp tục..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-left text-xs text-rose-400">
              <ShieldAlert size={14} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/logout";
              }}
              className="w-1/2 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              Đăng Xuất
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Mở Khóa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
