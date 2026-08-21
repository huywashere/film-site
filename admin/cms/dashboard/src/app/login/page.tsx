"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import {
  IconBrandGithub,
  IconFingerprint,
  IconLock,
  IconMail,
  IconShieldCheck,
} from "@tabler/icons-react";
import netphimLogo from "../../../../../../apps/web/public/cinephim-logo.png";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
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
        missing_session: "GitHub xác thực thành công nhưng không tạo được phiên Admin.",
      };
      setError(messages[githubError] || githubError);
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (github2FA) {
        const response = await fetch("/api/auth/github/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Xác minh GitHub 2FA thất bại");
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
        return;
      }
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(code ? { code } : {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.requires2FA) {
        setRequires2FA(true);
        return;
      }
      if (!response.ok) throw new Error(payload.message || "Đăng nhập thất bại");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") ? next : "/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-brand">
          <Image src={netphimLogo} alt="NetPhim" width={46} height={46} priority />
          <div><strong>NetPhim</strong><span>Control Room</span></div>
        </div>
        <div className="admin-login-heading">
          <IconShieldCheck size={24} />
          <div><h1 id="admin-login-title">Đăng nhập quản trị</h1><p>{github2FA ? "GitHub đã xác thực. Hoàn tất lớp bảo mật NetPhim." : "Phiên riêng, bắt buộc 2FA trên production."}</p></div>
        </div>
        <form onSubmit={submit} className="admin-login-form">
          {!github2FA && <><label><span>Email quản trị</span><div><IconMail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></div></label>
          <label><span>Mật khẩu</span><div><IconLock size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div></label></>}
          {(requires2FA || github2FA) && <label><span>Mã OTP hoặc mã dự phòng</span><div><IconFingerprint size={17} /><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="(?:[0-9]{6}|[a-fA-F0-9]{8})" maxLength={8} autoFocus required /></div></label>}
          {error && <p className="admin-login-error" role="alert">{error}</p>}
          <button className="admin-primary-button w-full" disabled={loading}>{loading ? "Đang xác thực..." : requires2FA || github2FA ? "Xác minh 2FA" : "Tiếp tục"}</button>
        </form>
        {!github2FA && <>
          <div className="admin-login-divider"><span>hoặc</span></div>
          <button
            type="button"
            className="admin-github-button"
            onClick={() => {
              const next = new URLSearchParams(window.location.search).get("next");
              const start = new URL("/api/auth/github/start", window.location.origin);
              if (next?.startsWith("/") && !next.startsWith("//")) start.searchParams.set("next", next);
              window.location.assign(start);
            }}
          >
            <IconBrandGithub size={18} />
            Đăng nhập bằng GitHub
          </button>
        </>}
      </section>
    </main>
  );
}
