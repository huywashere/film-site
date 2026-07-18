import Link from 'next/link';
import { Play } from 'lucide-react';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <div className={styles.footerTop}>
          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.logo}>
              <span
                className={styles.logoIcon}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'var(--accent)',
                  marginRight: '6px',
                }}
              >
                <Play size={16} fill="currentColor" />
              </span>
              <span>CineVerse</span>
            </div>
            <p className={styles.tagline}>Khám phá, xem và chia sẻ tình yêu điện ảnh của bạn</p>
          </div>

          {/* Links */}
          <div className={styles.linkGroups}>
            <div className={styles.linkGroup}>
              <h4>Duyệt Phim</h4>
              <Link href="/films/series">Phim Bộ</Link>
              <Link href="/films/single">Phim Lẻ</Link>
              <Link href="/films/anime">Hoạt Hình</Link>
              <Link href="/films/tvshows">TV Shows</Link>
            </div>
            <div className={styles.linkGroup}>
              <h4>Thể Loại</h4>
              <Link href="/genre/hanh-dong">Hành Động</Link>
              <Link href="/genre/kinh-di">Kinh Dị</Link>
              <Link href="/genre/tinh-cam">Tình Cảm</Link>
              <Link href="/genre/hai-huoc">Hài Hước</Link>
            </div>
            <div className={styles.linkGroup}>
              <h4>CineVerse</h4>
              <Link href="/about">Về chúng tôi</Link>
              <Link href="/reviews">Đánh giá</Link>
              <Link href="/members">Thành viên</Link>
              <Link href="/watchlist">Watchlist</Link>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© 2024 CineVerse. Dữ liệu phim cung cấp bởi KKPhim.</p>
          <div className={styles.legalLinks}>
            <Link href="/terms">Điều khoản</Link>
            <Link href="/privacy">Bảo mật</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
