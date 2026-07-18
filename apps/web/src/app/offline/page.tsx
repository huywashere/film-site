'use client';
import Link from 'next/link';
import { WifiOff, RefreshCw, Home } from 'lucide-react';

export default function OfflinePage() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        color: '#fff',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '3rem',
          maxWidth: '480px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 75, 75, 0.1)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#ff4b4b',
          }}
        >
          <WifiOff size={40} />
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: '#fff',
          }}
        >
          Mất Kết Nối Internet
        </h1>

        <p
          style={{
            color: '#94a3b8',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            marginBottom: '2rem',
          }}
        >
          Ứng dụng CineVerse hiện không thể kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối Wifi
          hoặc dữ liệu di động của bạn.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={handleReload}
            className="btn"
            style={{
              background: '#00c030',
              color: '#0a0f14',
              border: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} /> Thử lại
          </button>
          <Link
            href="/"
            className="btn"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            <Home size={16} /> Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
