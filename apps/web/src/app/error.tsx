'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, ServerCrash } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error('System Error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '75vh',
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: '#0a0e13',
      color: '#ffffff'
    }}>
      <div style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: '1.5rem',
        borderRadius: '50%',
        marginBottom: '1.5rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(239, 68, 68, 0.2)'
      }}>
        <ServerCrash size={48} color="#ef4444" />
      </div>
      <h1 style={{
        fontSize: '4.5rem',
        fontWeight: 'bold',
        color: '#ef4444',
        margin: 0,
        lineHeight: 1.1,
        letterSpacing: '-2px'
      }}>500</h1>
      <h2 style={{
        fontSize: '1.5rem',
        margin: '0.75rem 0 1rem 0',
        fontWeight: 600,
        color: '#ffffff'
      }}>Đã Xảy Ra Lỗi Hệ Thống</h2>
      <p style={{
        color: '#9e9e9e',
        maxWidth: '450px',
        margin: '0 auto 2rem auto',
        lineHeight: '1.6',
        fontSize: '0.95rem'
      }}>
        Máy chủ đã gặp sự cố không mong muốn hoặc HMR dev-cache bị quá tải. Hãy nhấn thử lại hoặc quay lại trang chủ.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => reset()}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#e5a93b',
            color: '#000000',
            fontWeight: 'bold',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} />
          Thử Lại
        </button>
        <Link
          href="/"
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontWeight: 'bold',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          <Home size={16} />
          Về Trang Chủ
        </Link>
      </div>
    </div>
  );
}
