'use client';
import Link from 'next/link';
import { Home, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: '#0a0e13',
        color: '#ffffff',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(229, 169, 59, 0.1)',
          padding: '1.5rem',
          borderRadius: '50%',
          marginBottom: '1.5rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(229, 169, 59, 0.2)',
        }}
      >
        <HelpCircle size={48} color="#e5a93b" />
      </div>
      <h1
        style={{
          fontSize: '4.5rem',
          fontWeight: 'bold',
          color: '#e5a93b',
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-2px',
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontSize: '1.5rem',
          margin: '0.75rem 0 1rem 0',
          fontWeight: 600,
          color: '#ffffff',
        }}
      >
        Không Tìm Thấy Trang
      </h2>
      <p
        style={{
          color: '#9e9e9e',
          maxWidth: '400px',
          margin: '0 auto 2rem auto',
          lineHeight: '1.6',
          fontSize: '0.95rem',
        }}
      >
        Đường liên kết bạn vừa truy cập có thể đã bị lỗi, bị xóa hoặc không tồn tại. Vui lòng kiểm
        tra lại.
      </p>
      <Link
        href="/"
        className="btn btn-primary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#e5a93b',
          color: '#000000',
          fontWeight: 'bold',
          border: 'none',
          padding: '0.75rem 1.75rem',
          borderRadius: '8px',
          textDecoration: 'none',
          transition: 'transform 0.2s ease',
          cursor: 'pointer',
        }}
      >
        <Home size={16} fill="currentColor" />
        Về Trang Chủ
      </Link>
    </div>
  );
}
