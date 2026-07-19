'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
  Search, Film, Bookmark, ChevronDown,
  LogOut, User, Menu, X, Star, Sun, Moon,
  Play, Languages, Loader2, Bell, Settings, History, MonitorSmartphone
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/store/langStore';
import { useThemeStore } from '@/store/themeStore';
import { movieApi } from '@/lib/api';
import { resolveImageUrl } from '@/components/film/FilmCard';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { href: '/films/series', key: 'nav.series' },
  { href: '/films/single', key: 'nav.single' },
  { href: '/films/anime', key: 'nav.anime' },
  { href: '/watchlist', key: 'nav.watchlist' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Notifications State & References
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

  // Scroll detection to update header background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.focus();
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 flex items-center",
          scrolled ? "bg-background/95 shadow-md border-b border-border backdrop-blur-md" : "bg-gradient-to-b from-black/80 to-transparent"
        )}
      >
        <div className="w-full px-4 md:px-8 flex items-center justify-between">
          {/* Left Block: Logo */}
          <div className="flex items-center w-auto lg:w-1/4">
            <Link href="/" className="flex items-center space-x-1.5 group">
              <span className="text-white text-2xl font-black tracking-tighter lowercase font-sans">
                cineverse
              </span>
            </Link>
          </div>

          {/* Center Block: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center justify-center space-x-6 text-sm font-medium text-neutral-300 flex-1">
            {/* Thể Loại Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 hover:text-white transition-colors focus:outline-none">
                <span>{t('nav.genres')}</span>
                <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[380px] p-2 bg-[#060814]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-3 gap-1 z-50">
                <Link href="/genre/hanh-dong" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Hành Động</Link>
                <Link href="/genre/phieu-luu" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Phiêu Lưu</Link>
                <Link href="/genre/hoat-hinh" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Hoạt Hình</Link>
                <Link href="/genre/hai-huoc" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Hài Hước</Link>
                <Link href="/genre/hinh-su" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Hình Sự</Link>
                <Link href="/genre/tai-lieu" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Tài Liệu</Link>
                <Link href="/genre/chinh-kich" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Chính Kịch</Link>
                <Link href="/genre/co-trang" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Cổ Trang</Link>
                <Link href="/genre/kinh-di" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Kinh Dị</Link>
                <Link href="/genre/tinh-cam" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Tình Cảm</Link>
                <Link href="/genre/vien-tuong" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Viễn Tưởng</Link>
                <Link href="/genre/phim-18" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Phim 18+</Link>
              </div>
            </div>

            {/* Quốc Gia Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 hover:text-white transition-colors focus:outline-none">
                <span>{t('nav.country')}</span>
                <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[260px] p-2 bg-[#060814]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-2 gap-1 z-50">
                <Link href="/country/trung-quoc" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Trung Quốc</Link>
                <Link href="/country/han-quoc" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Hàn Quốc</Link>
                <Link href="/country/nhat-ban" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Nhật Bản</Link>
                <Link href="/country/thai-lan" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Thái Lan</Link>
                <Link href="/country/viet-nam" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Việt Nam</Link>
                <Link href="/country/au-my" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Âu Mỹ</Link>
              </div>
            </div>

            {/* Danh Sách Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 hover:text-white transition-colors focus:outline-none">
                <span>{t('nav.list')}</span>
                <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[180px] p-1.5 bg-[#060814]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/films?sort=newest" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Phim Mới</Link>
                <Link href="/films/series" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Phim Bộ</Link>
                <Link href="/films/single" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Phim Lẻ</Link>
                <Link href="/films/anime" className="hover:bg-white/10 px-3 py-2 rounded text-sm transition-colors text-neutral-300 hover:text-white block">Hoạt Hình</Link>
              </div>
            </div>

              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "hover:text-white transition-colors",
                    pathname === link.href ? "text-white font-semibold" : ""
                  )}
                >
                  {t(link.key)}
                </Link>
              ))}
          </nav>
          {/* Right Block: Search & Actions & Profile */}
          <div className="flex items-center justify-end space-x-3 w-auto lg:w-1/4">
            {/* Search Input inline-Netflix transition */}
            <div className="relative flex items-center">
              <form onSubmit={handleSearchSubmit} className="flex items-center relative">
                {searchOpen ? (
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Tìm kiếm phim, diễn viên..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-48 md:w-64 bg-black/60 border border-white/20 rounded-full px-8 py-1.5 text-xs text-white focus:border-white transition-all duration-300 outline-none"
                      onBlur={() => {
                        if (!searchQuery) setSearchOpen(false);
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="text-neutral-300 hover:text-white p-1.5 transition-colors focus:outline-none"
                    aria-label="Search button"
                  >
                    <Search size={18} />
                  </button>
                )}
              </form>

              {/* Instant Search Results Dropdown */}
              {searchQuery.trim() && (
                <div className="absolute right-0 top-11 w-72 md:w-80 bg-[#141414] border border-white/10 rounded shadow-xl overflow-hidden z-50 text-xs">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-4 space-x-2 text-neutral-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang tìm kiếm...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="flex flex-col">
                      {searchResults.map((item: any) => {
                        const poster = resolveImageUrl(item.thumb_url) || resolveImageUrl(item.poster_url);
                        return (
                          <Link
                            key={item.slug}
                            href={`/film/${item.slug}`}
                            className="flex items-center space-x-2 p-2 hover:bg-white/10 transition-colors"
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                            }}
                          >
                            <div className="relative w-9 h-12 flex-shrink-0 bg-neutral-900 overflow-hidden rounded">
                              {poster ? (
                                <img src={poster} alt="" className="object-cover w-full h-full" />
                              ) : (
                                <div className="flex items-center justify-center h-full"><Film size={12} /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white truncate">{item.name}</p>
                              <p className="text-neutral-400 truncate">{item.origin_name}</p>
                            </div>
                          </Link>
                        );
                      })}
                      <button
                        type="submit"
                        onClick={handleSearchSubmit}
                        className="w-full text-center py-2 bg-white/5 hover:bg-white/10 font-bold border-t border-white/5 transition-colors text-netflixRed"
                      >
                        Xem tất cả kết quả
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-neutral-400">Không tìm thấy phim</div>
                  )}
                </div>
              )}
            </div>

            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="hidden md:flex items-center space-x-1 text-xs text-neutral-300 hover:text-white transition-colors border-r border-white/20 pr-3 mr-3"
            >
              <Languages size={14} />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* PWA App Download (UI Only) */}
            <button className="hidden xl:flex items-center space-x-2 text-left hover:opacity-80 transition-opacity border-r border-white/20 pr-3 mr-3">
              <MonitorSmartphone size={24} className="text-[#f5c518]" />
              <div className="flex flex-col justify-center">
                <span className="text-sm font-semibold text-white leading-tight">Tải ứng dụng</span>
              </div>
            </button>


            {user ? (
              <>
                {/* Notifications Dropdown via Radix */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="relative text-neutral-300 hover:text-white transition-colors focus:outline-none p-1">
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-netflixRed text-[9px] font-black rounded-full flex items-center justify-center text-white">
                        {unreadCount}
                      </span>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 bg-card border-border text-neutral-300 p-2 shadow-2xl">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-xs">
                      <span className="font-bold text-foreground">Thông báo</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-netflixRed font-semibold">Đọc tất cả</button>
                      )}
                    </div>
                    <div className="flex flex-col space-y-1 max-h-60 overflow-y-auto">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={cn(
                            "p-2 rounded text-[11px] cursor-pointer hover:bg-white/5 transition-all flex items-start space-x-2",
                            n.read ? "opacity-60" : "bg-white/[0.02]"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", n.read ? "bg-neutral-600" : "bg-netflixRed")} />
                          <div>
                            <p className="text-foreground leading-normal">{n.message}</p>
                            <span className="text-[9px] text-neutral-400">{n.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Profile menu dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-1 focus:outline-none">
                    <img
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=E50914&color=ffffff&size=32`}
                      alt=""
                      className="w-7 h-7 rounded object-cover border border-white/10"
                    />
                    <ChevronDown size={14} className="text-neutral-400 group-hover:text-white" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[180px] p-1.5 bg-card border-border text-neutral-300">
                    <DropdownMenuItem className="hover:bg-white/10"><User size={14} className="mr-2" /><Link href={`/profile/${user.username}`} className="w-full">{t('nav.profile')}</Link></DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-white/10"><Bookmark size={14} className="mr-2" /><Link href="/watchlist" className="w-full">{t('nav.watchlist')}</Link></DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-white/10"><Star size={14} className="mr-2" /><Link href="/reviews" className="w-full">Đánh giá của tôi</Link></DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-white/10"><History size={14} className="mr-2" /><Link href="/history" className="w-full">Lịch sử xem</Link></DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-white/10"><Settings size={14} className="mr-2" /><Link href="/settings" className="w-full">{t('nav.settings')}</Link></DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => { logout(); router.push('/'); }}
                      className="text-netflixRed focus:bg-netflixRed/10 focus:text-netflixRed"
                    >
                      <LogOut size={14} className="mr-2" />
                      <span>{t('nav.logout')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex items-center space-x-1.5 bg-[#e2e2e2] text-black px-4 py-1.5 rounded-full hover:bg-white transition-colors"
              >
                <User size={14} />
                <span className="text-xs font-semibold">Thành viên</span>
              </Link>
            )}

            {/* Mobile menu trigger */}
            <button
              className="lg:hidden text-neutral-300 hover:text-white transition-colors p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-20 flex flex-col p-6 space-y-4 text-neutral-300 text-base font-semibold animate-in fade-in slide-in-from-top-4 duration-300">
          <Link href="/films/series" className="py-2 border-b border-border" onClick={() => setMobileMenuOpen(false)}>Phim Bộ</Link>
          <Link href="/films/single" className="py-2 border-b border-border" onClick={() => setMobileMenuOpen(false)}>Phim Lẻ</Link>
          <Link href="/films/anime" className="py-2 border-b border-border" onClick={() => setMobileMenuOpen(false)}>Hoạt Hình</Link>
          <Link href="/watchlist" className="py-2 border-b border-border" onClick={() => setMobileMenuOpen(false)}>Watchlist</Link>
          {!user && (
            <div className="flex flex-col space-y-3 pt-6">
              <Link href="/login" className="w-full text-center py-2.5 rounded border border-white/10 hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>Đăng nhập</Link>
              <Link href="/register" className="w-full text-center py-2.5 rounded bg-[#E50914] text-white hover:bg-[#C11119] transition-colors" onClick={() => setMobileMenuOpen(false)}>Đăng ký</Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
