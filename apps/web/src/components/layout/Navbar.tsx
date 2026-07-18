'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
  Search, Film, List, Users, BookOpen, ChevronDown,
  LogOut, User, Bookmark, Menu, X, Star, Sun, Moon,
  Play, Globe, Loader2, Bell, Settings, History
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/store/langStore';
import { useThemeStore } from '@/store/themeStore';
import { movieApi } from '@/lib/api';
import { resolveImageUrl } from '@/components/film/FilmCard';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '/films/series', key: 'nav.series', icon: Film },
  { href: '/films/single', key: 'nav.single', icon: Film },
  { href: '/films/anime', key: 'nav.anime', icon: Film },
  { href: '/watchlist', key: 'nav.watchlist', icon: Bookmark },
];

const GENRE_QUICK = [
  { label: 'Hành Động', slug: 'hanh-dong' },
  { label: 'Kinh Dị', slug: 'kinh-di' },
  { label: 'Tình Cảm', slug: 'tinh-cam' },
  { label: 'Hài Hước', slug: 'hai-huoc' },
  { label: 'Khoa Học Viễn Tưởng', slug: 'khoa-hoc-vien-tuong' },
  { label: 'Hoạt Hình', slug: 'hoat-hinh' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { t, lang, setLang } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Notifications State & References
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Phim "Thanh Khâu Kỳ Duyên" vừa cập nhật tập mới (Tập 12)!', time: '10 phút trước', read: false },
    { id: 2, message: 'Chào mừng bạn đến với phiên bản CineVerse mới!', time: '1 ngày trước', read: false },
    { id: 3, message: 'Watchlist của bạn có 1 phim sắp phát sóng tập cuối.', time: '2 ngày trước', read: true },
  ]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Auto-close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.focus();
      // Lock page scroll when search overlay is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
      setSearchResults([]);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [searchOpen]);

  // Debounced live search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await movieApi.search(searchQuery.trim(), 1);
        const items = res.data?.data?.items || [];
        setSearchResults(items.slice(0, 5));
      } catch (err) {
        console.error('Instant search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className={styles.navbar}>
        <div className={`container ${styles.navInner}`}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon} style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
              <Play size={16} fill="currentColor" />
            </span>
            <span className={styles.logoText}>CineVerse</span>
          </Link>

          {/* Desktop Nav */}
          <nav className={styles.navLinks}>
            {/* Thể Loại Dropdown */}
            <div className={styles.navDropdown}>
              <button className={styles.navDropdownTrigger}>
                <span>Thể Loại</span>
                <ChevronDown size={12} />
              </button>
              <div className={`${styles.dropdownContent} ${styles.megaMenuGenre}`}>
                <div className={styles.megaMenuCols}>
                  <div className={styles.megaMenuCol}>
                    <Link href="/genre/bi-an">Bí Ẩn</Link>
                    <Link href="/genre/chien-tranh">Chiến Tranh</Link>
                    <Link href="/genre/chinh-kich">Chính Kịch</Link>
                    <Link href="/genre/co-trang">Cổ Trang</Link>
                    <Link href="/genre/gia-dinh">Gia Đình</Link>
                    <Link href="/genre/hai-huoc">Hài Hước</Link>
                    <Link href="/genre/hanh-dong">Hành Động</Link>
                    <Link href="/genre/hinh-su">Hình Sự</Link>
                    <Link href="/genre/hoc-duong">Học Đường</Link>
                  </div>
                  <div className={styles.megaMenuCol}>
                    <Link href="/genre/khoa-hoc">Khoa Học</Link>
                    <Link href="/genre/kinh-di">Kinh Dị</Link>
                    <Link href="/genre/kinh-dien">Kinh Điển</Link>
                    <Link href="/genre/lich-su">Lịch Sử</Link>
                    <Link href="/genre/mien-tay">Miền Tây</Link>
                    <Link href="/genre/phim-18">Phim 18+</Link>
                    <Link href="/genre/phim-ngan">Phim Ngắn</Link>
                    <Link href="/genre/phieu-luu">Phiêu Lưu</Link>
                    <Link href="/genre/than-thoai">Thần Thoại</Link>
                  </div>
                  <div className={styles.megaMenuCol}>
                    <Link href="/genre/the-thao">Thể Thao</Link>
                    <Link href="/genre/tre-em">Trẻ Em</Link>
                    <Link href="/genre/tai-lieu">Tài Liệu</Link>
                    <Link href="/genre/tam-ly">Tâm Lý</Link>
                    <Link href="/genre/tinh-cam">Tình Cảm</Link>
                    <Link href="/genre/vien-tuong">Viễn Tưởng</Link>
                    <Link href="/genre/vo-thuat">Võ Thuật</Link>
                    <Link href="/genre/am-nhac">Âm Nhạc</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Quốc Gia Dropdown */}
            <div className={styles.navDropdown}>
              <button className={styles.navDropdownTrigger}>
                <span>Quốc Gia</span>
                <ChevronDown size={12} />
              </button>
              <div className={`${styles.dropdownContent} ${styles.megaMenuCountry}`}>
                <div className={styles.megaMenuCols}>
                  <div className={styles.megaMenuCol}>
                    <Link href="/country/anh">Anh</Link>
                    <Link href="/country/ba-lan">Ba Lan</Link>
                    <Link href="/country/brazil">Brazil</Link>
                    <Link href="/country/bo-dao-nha">Bồ Đào Nha</Link>
                    <Link href="/country/canada">Canada</Link>
                    <Link href="/country/chau-phi">Châu Phi</Link>
                    <Link href="/country/ha-lan">Hà Lan</Link>
                    <Link href="/country/han-quoc">Hàn Quốc</Link>
                    <Link href="/country/hong-kong">Hồng Kông</Link>
                  </div>
                  <div className={styles.megaMenuCol}>
                    <Link href="/country/indonesia">Indonesia</Link>
                    <Link href="/country/malaysia">Malaysia</Link>
                    <Link href="/country/mexico">Mexico</Link>
                    <Link href="/country/na-uy">Na Uy</Link>
                    <Link href="/country/nam-phi">Nam Phi</Link>
                    <Link href="/country/nga">Nga</Link>
                    <Link href="/country/nhat-ban">Nhật Bản</Link>
                    <Link href="/country/philippines">Philippines</Link>
                    <Link href="/country/phap">Pháp</Link>
                  </div>
                  <div className={styles.megaMenuCol}>
                    <Link href="/country/quoc-gia-khac">Quốc Gia Khác</Link>
                    <Link href="/country/thai-lan">Thái Lan</Link>
                    <Link href="/country/tho-nhi-ky">Thổ Nhĩ Kỳ</Link>
                    <Link href="/country/thuy-si">Thụy Sĩ</Link>
                    <Link href="/country/thuy-dien">Thụy Điển</Link>
                    <Link href="/country/trung-quoc">Trung Quốc</Link>
                    <Link href="/country/tay-ban-nha">Tây Ban Nha</Link>
                    <Link href="/country/uae">UAE</Link>
                    <Link href="/country/ukraina">Ukraina</Link>
                  </div>
                  <div className={styles.megaMenuCol}>
                    <Link href="/country/viet-nam">Việt Nam</Link>
                    <Link href="/country/au-my">Âu Mỹ</Link>
                    <Link href="/country/uc">Úc</Link>
                    <Link href="/country/y">Ý</Link>
                    <Link href="/country/dan-mach">Đan Mạch</Link>
                    <Link href="/country/dai-loan">Đài Loan</Link>
                    <Link href="/country/duc">Đức</Link>
                    <Link href="/country/a-rap-xe-ut">Ả Rập Xê Út</Link>
                    <Link href="/country/an-do">Ấn Độ</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Danh Sách Dropdown */}
            <div className={styles.navDropdown}>
              <button className={styles.navDropdownTrigger}>
                <span>Danh Sách</span>
                <ChevronDown size={12} />
              </button>
              <div className={`${styles.dropdownContent} ${styles.megaMenuLists}`}>
                <div className={styles.megaMenuCols}>
                  <div className={styles.megaMenuCol}>
                    <Link href="/films?sort=newest">Phim Mới</Link>
                    <Link href="/films/series">Phim Bộ</Link>
                    <Link href="/films/single">Phim Lẻ</Link>
                    <Link href="/films/tvshows">Shows</Link>
                  </div>
                  <div className={styles.megaMenuCol}>
                    <Link href="/films/anime">Hoạt Hình</Link>
                    <Link href="/films/series?sub=vietsub">Phim Vietsub</Link>
                    <Link href="/films/series?sub=thuyetminh">Phim Thuyết Minh</Link>
                    <Link href="/films/series?sub=longtieng">Phim Lồng Tiếng</Link>
                  </div>
                  <div className={styles.megaMenuCol}>
                    <Link href="/films/series?status=ongoing">Phim Bộ Đang Chiếu</Link>
                    <Link href="/films/series?status=completed">Phim Bộ Đã Hoàn Thành</Link>
                    <Link href="/films/series?sub=subteam">Subteam</Link>
                    <Link href="/films/series?sub=chieurap">Phim Chiếu Rạp</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Watchlist */}
            <Link href="/watchlist" className={`${styles.navLink} ${pathname === '/watchlist' ? styles.navLinkActive : ''}`}>
              Watchlist
            </Link>
          </nav>

          {/* Right Actions */}
          <div className={styles.navActions}>
            {/* Search */}
            <button
              id="search-btn"
              className={`btn btn-ghost btn-icon ${styles.searchBtn}`}
              onClick={() => setSearchOpen(true)}
              aria-label={t('nav.searchBtn')}
            >
              <Search size={18} />
            </button>

            <button
              className={styles.langBtn}
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Globe size={14} />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* Theme Toggle */}
            <button
              className={styles.themeBtn}
              onClick={toggleTheme}
              title={mounted && theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            >
              {mounted && theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {user ? (
              <>
                {/* Notifications Dropdown */}
                <div className={styles.notifMenu} ref={notifRef}>
                  <button
                    className={`btn btn-ghost btn-icon ${styles.notifBtn}`}
                    onClick={() => setNotifOpen(!notifOpen)}
                    title="Thông báo"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}
                  </button>

                  {notifOpen && (
                    <div className={`dropdown__menu ${styles.notifDropdown}`}>
                      <div className={styles.notifHeader}>
                        <h4>Thông báo</h4>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className={styles.markReadBtn}>
                            Đọc tất cả
                          </button>
                        )}
                      </div>
                      <div className={styles.notifList}>
                        {notifications.length === 0 ? (
                          <div className={styles.notifEmpty}>Không có thông báo mới</div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`${styles.notifItem} ${n.read ? '' : styles.notifItemUnread}`}
                              onClick={() => markAsRead(n.id)}
                            >
                              <div className={styles.notifDot} />
                              <div className={styles.notifText}>
                                <p className={styles.notifMsg}>{n.message}</p>
                                <span className={styles.notifTime}>{n.time}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className={styles.userMenu} ref={userMenuRef}>
                  <button
                    id="user-menu-btn"
                    className={styles.userMenuTrigger}
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <img
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=121921&color=e55b3c&size=32`}
                      alt={user.username}
                      className="avatar avatar-sm"
                    />
                    <span className={styles.userDisplayName}>{user.displayName || user.username}</span>
                    <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>

                  {userMenuOpen && (
                    <div className={`dropdown__menu ${styles.userDropdown}`}>
                      <Link href={`/profile/${user.username}`} className="dropdown__item" onClick={() => setUserMenuOpen(false)}>
                        <User size={15} /> {t('nav.profile')}
                      </Link>
                      <Link href="/watchlist" className="dropdown__item" onClick={() => setUserMenuOpen(false)}>
                        <Bookmark size={15} /> {t('nav.watchlist')}
                      </Link>
                      <Link href="/reviews" className="dropdown__item" onClick={() => setUserMenuOpen(false)}>
                        <Star size={15} /> {t('nav.reviews')}
                      </Link>
                      <Link href="/history" className="dropdown__item" onClick={() => setUserMenuOpen(false)}>
                        <History size={15} /> {t('nav.history')}
                      </Link>
                      <Link href="/settings" className="dropdown__item" onClick={() => setUserMenuOpen(false)}>
                        <Settings size={15} /> {t('nav.settings')}
                      </Link>
                      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                      <button
                        className="dropdown__item"
                        onClick={() => { logout(); setUserMenuOpen(false); router.push('/'); }}
                        style={{ width: '100%', textAlign: 'left', color: 'var(--red)' }}
                      >
                        <LogOut size={15} /> {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.authLinks}>
                <Link href="/login" className="btn btn-ghost btn-sm">{t('nav.login')}</Link>
                <Link href="/register" className="btn btn-primary btn-sm">{t('nav.register')}</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className={`btn btn-ghost btn-icon ${styles.mobileToggle}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={t('nav.menu')}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Sub Navigation (Browse by) */}
        <div className={styles.subNav}>
          <div className={`container ${styles.subNavInner}`}>
            <span className={styles.subNavLabel}>{t('nav.browseBy')}</span>
            <Link href="/films?sort=newest" className={styles.subNavLink}>{t('nav.newest')}</Link>
            <Link href="/films?sort=popular" className={styles.subNavLink}>{t('nav.popular')}</Link>
            <Link href="/films/series" className={styles.subNavLink}>{t('nav.series')}</Link>
            <Link href="/films/single" className={styles.subNavLink}>{t('nav.single')}</Link>
            <Link href="/films/anime" className={styles.subNavLink}>{t('nav.anime')}</Link>
            <Link href="/films/tvshows" className={styles.subNavLink}>{t('nav.tvshows')}</Link>
            <div className={styles.subNavSeparator} />
            <Link href="/search" className={`${styles.subNavLink} ${styles.findFilm}`}>
              <Search size={12} /> {t('nav.findFilm')}
            </Link>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div className={styles.searchOverlay} onClick={(e) => e.target === e.currentTarget && setSearchOpen(false)}>
          <div className={styles.searchBox}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              {isSearching ? (
                <Loader2 size={20} className={styles.spin} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              ) : (
                <Search size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
              <input
                ref={searchRef}
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="btn btn-ghost btn-icon">
                <X size={18} />
              </button>
            </form>

            {/* Live Search Results */}
            {searchQuery.trim() && (
              <div className={styles.liveResults}>
                {isSearching ? (
                  <div className={styles.liveSearchLoading}>
                    <Loader2 size={16} className={styles.spin} />
                    <span>Đang tìm kiếm...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className={styles.resultsList}>
                    {searchResults.map((item: any) => {
                      const poster = resolveImageUrl(item.thumb_url) || resolveImageUrl(item.poster_url);
                      return (
                        <Link
                          key={item.slug}
                          href={`/film/${item.slug}`}
                          className={styles.resultItem}
                          onClick={() => setSearchOpen(false)}
                        >
                          <div className={styles.resultThumb}>
                            {poster ? (
                              <img src={poster} alt={item.name} />
                            ) : (
                              <div className={styles.resultNoThumb}>
                                <Film size={18} />
                              </div>
                            )}
                          </div>
                          <div className={styles.resultMeta}>
                            <span className={styles.resultTitle}>{item.name}</span>
                            <span className={styles.resultSub}>
                              {item.origin_name} {item.year ? `(${item.year})` : ''}
                            </span>
                          </div>
                          <span className={styles.resultBadge}>
                            {item.type === 'series' ? 'Bộ' : 'Lẻ'}
                          </span>
                        </Link>
                      );
                    })}
                    <button
                      type="submit"
                      onClick={handleSearch}
                      className={styles.showAllBtn}
                    >
                      Xem tất cả kết quả cho &ldquo;{searchQuery}&rdquo;
                    </button>
                  </div>
                ) : (
                  <div className={styles.noResults}>
                    Không tìm thấy phim phù hợp
                  </div>
                )}
              </div>
            )}

            {!searchQuery.trim() && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
                {t('nav.enterSearch')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenu}>
          {NAV_LINKS.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={styles.mobileNavLink}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon size={16} /> {t(key)}
            </Link>
          ))}
          {!user && (
            <div className={styles.mobileAuthLinks}>
              <Link href="/login" className="btn btn-secondary w-full" onClick={() => setMobileMenuOpen(false)}>{t('nav.login')}</Link>
              <Link href="/register" className="btn btn-primary w-full" onClick={() => setMobileMenuOpen(false)}>{t('nav.register')}</Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
