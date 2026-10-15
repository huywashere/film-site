"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import {
  IconBrandGithub,
  IconFingerprint,
  IconShieldCheck,
  IconBolt,
} from "@tabler/icons-react";
import flexphimLogo from "../../../../web/public/flexphim-logo.png";

export default function AdminLoginPage() {
  const [code, setCode] = useState("");
  const [github2FA, setGithub2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setGithub2FA(params.get("github_2fa") === "1");
    const githubError = params.get("github_error");
    if (githubError) {
      const messages: Record<string, string> = {
        not_configured: "GitHub OAuth chưa được cấu hình.",
        invalid_state: "Phiên đăng nhập GitHub không hợp lệ hoặc đã hết hạn.",
        api_unavailable: "Không thể kết nối API xác thực GitHub.",
        github_rejected: "GitHub từ chối yêu cầu đăng nhập.",
        missing_session:
          "GitHub xác thực thành công nhưng không tạo được phiên Admin.",
      };
      setError(messages[githubError] || githubError);
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!github2FA) return;
      const response = await fetch("/api/auth/github/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.message || "Xác minh GitHub 2FA thất bại");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(
        next?.startsWith("/") && !next.startsWith("//") ? next : "/",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/dev-login", { method: "POST" });
      if (!response.ok) throw new Error("Đăng nhập dev thất bại");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập dev thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-brand">
          <Image
            src={flexphimLogo}
            alt="FlexPhim"
            width={46}
            height={46}
            priority
          />
          <div>
            <strong>FlexPhim</strong>
            <span>Control Room</span>
          </div>
        </div>
        <div className="admin-login-heading">
          <IconShieldCheck size={24} />
          <div>
            <h1 id="admin-login-title">Đăng nhập quản trị</h1>
            <p>
              {github2FA
                ? "GitHub đã xác thực. Hoàn tất lớp bảo mật FlexPhim."
                : "Xác thực danh tính qua tài khoản GitHub đã được phân quyền."}
            </p>
          </div>
        </div>
        {github2FA ? (
          <form onSubmit={submit} className="admin-login-form">
            <label>
              <span>Mã OTP hoặc mã dự phòng</span>
              <div>
                <IconFingerprint size={17} />
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="(?:[0-9]{6}|[a-fA-F0-9]{8})"
                  maxLength={8}
                  autoFocus
                  required
                />
              </div>
            </label>
            {error && (
              <p className="admin-login-error" role="alert">
                {error}
              </p>
            )}
            <button className="admin-primary-button w-full" disabled={loading}>
              {loading ? "Đang xác thực..." : "Xác minh 2FA"}
            </button>
          </form>
        ) : (
          <>
            {error && (
              <p className="admin-login-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className="admin-github-button"
              onClick={() => {
                const next = new URLSearchParams(window.location.search).get(
                  "next",
                );
                const start = new URL(
                  "/api/auth/github/start",
                  window.location.origin,
                );
                if (next?.startsWith("/") && !next.startsWith("//"))
                  start.searchParams.set("next", next);
                window.location.assign(start);
              }}
            >
              <IconBrandGithub size={18} />
              Tiếp tục với GitHub
            </button>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Chỉ GitHub ID đã được cấp phép mới có thể truy cập Control Room.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleDevLogin}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <IconBolt size={16} className="text-amber-500" />
                Đăng nhập nhanh (Chế độ Local Dev)
              </button>
              <p className="text-center text-[10px] text-slate-400">
                Dành cho phát triển &amp; thử nghiệm local mà không cần khởi động full database.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
