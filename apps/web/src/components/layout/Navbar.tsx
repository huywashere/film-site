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

export const GENRES_LIST = [
  { label: 'Bí Ẩn', slug: 'bi-an' },
  { label: 'Chiến Tranh', slug: 'chien-tranh' },
  { label: 'Chính Kịch', slug: 'chinh-kich' },
  { label: 'Cổ Trang', slug: 'co-trang' },
  { label: 'Gia Đình', slug: 'gia-dinh' },
  { label: 'Hài Hước', slug: 'hai-huoc' },
  { label: 'Hành Động', slug: 'hanh-dong' },
  { label: 'Hình Sự', slug: 'hinh-su' },
  { label: 'Học Đường', slug: 'hoc-duong' },
  { label: 'Khoa Học', slug: 'khoa-hoc' },
  { label: 'Kinh Dị', slug: 'kinh-di' },
  { label: 'Kinh Điển', slug: 'kinh-dien' },
  { label: 'Lịch Sử', slug: 'lich-su' },
  { label: 'Miền Tây', slug: 'mien-tay' },
  { label: 'Phim 18+', slug: 'phim-18' },
  { label: 'Phim Ngắn', slug: 'phim-ngan' },
  { label: 'Phiêu Lưu', slug: 'phieu-luu' },
  { label: 'Thần Thoại', slug: 'than-thoai' },
  { label: 'Thể Thao', slug: 'the-thao' },
  { label: 'Trẻ Em', slug: 'tre-em' },
  { label: 'Tài Liệu', slug: 'tai-lieu' },
  { label: 'Tâm Lý', slug: 'tam-ly' },
  { label: 'Tình Cảm', slug: 'tinh-cam' },
  { label: 'Viễn Tưởng', slug: 'vien-tuong' },
  { label: 'Võ Thuật', slug: 'vo-thuat' },
  { label: 'Âm Nhạc', slug: 'am-nhac' },
];

export const COUNTRIES_LIST = [
  { label: 'Anh', slug: 'anh' },
  { label: 'Ba Lan', slug: 'ba-lan' },
  { label: 'Brazil', slug: 'brazil' },
  { label: 'Bồ Đào Nha', slug: 'bo-dao-nha' },
  { label: 'Canada', slug: 'canada' },
  { label: 'Châu Phi', slug: 'chau-phi' },
  { label: 'Hà Lan', slug: 'ha-lan' },
  { label: 'Hàn Quốc', slug: 'han-quoc' },
  { label: 'Hồng Kông', slug: 'hong-kong' },
  { label: 'Indonesia', slug: 'indonesia' },
  { label: 'Malaysia', slug: 'malaysia' },
  { label: 'Mexico', slug: 'mexico' },
  { label: 'Na Uy', slug: 'na-uy' },
  { label: 'Nam Phi', slug: 'nam-phi' },
  { label: 'Nga', slug: 'nga' },
  { label: 'Nhật Bản', slug: 'nhat-ban' },
  { label: 'Philippines', slug: 'philippines' },
  { label: 'Pháp', slug: 'phap' },
  { label: 'Quốc Gia Khác', slug: 'quoc-gia-khac' },
  { label: 'Thái Lan', slug: 'thai-lan' },
  { label: 'Thổ Nhĩ Kỳ', slug: 'tho-nhi-ky' },
  { label: 'Thụy Sĩ', slug: 'thuy-si' },
  { label: 'Thụy Điển', slug: 'thuy-dien' },
  { label: 'Trung Quốc', slug: 'trung-quoc' },
  { label: 'Tây Ban Nha', slug: 'tay-ban-nha' },
  { label: 'UAE', slug: 'uae' },
  { label: 'Ukraina', slug: 'ukraina' },
  { label: 'Việt Nam', slug: 'viet-nam' },
  { label: 'Âu Mỹ', slug: 'au-my' },
  { label: 'Úc', slug: 'uc' },
  { label: 'Ý', slug: 'y' },
  { label: 'Đan Mạch', slug: 'dan-mach' },
  { label: 'Đài Loan', slug: 'dai-loan' },
  { label: 'Đức', slug: 'duc' },
  { label: 'Ả Rập Xê Út', slug: 'a-rap-xe-ut' },
  { label: 'Ấn Độ', slug: 'an-do' },
];

const LISTS_CATALOG = [
  { label: 'Phim Mới', href: '/search?sort=modified.time%20desc' },
  { label: 'Phim Bộ', href: '/films/series' },
  { label: 'Phim Lẻ', href: '/films/single' },
  { label: 'Shows', href: '/films/tvshows' },
  { label: 'Hoạt Hình', href: '/films/anime' },
  { label: 'Phim Vietsub', href: '/search?q=vietsub' },
  { label: 'Phim Thuyết Minh', href: '/search?q=thuyet%20minh' },
  { label: 'Phim Lồng Tiếng', href: '/search?q=long%20tieng' },
  { label: 'Phim Bộ Đang Chiếu', href: '/search?status=ongoing' },
  { label: 'Phim Bộ Đã Hoàn Thành', href: '/search?status=completed' },
  { label: 'Subteam', href: '/search?q=subteam' },
  { label: 'Phim Chiếu Rạp', href: '/search?q=chieu%20rap' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { t, lang, setLang, isTransitioning } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
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
    searchRef.current?.focus();
  }, []);

  // Debounced live search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await movieApi.search(searchQuery.trim(), 1, 12);
        const items = res.data?.data?.items || [];
        setSearchResults(items.slice(0, 12));
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
      setSearchQuery('');
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 flex items-center",
          scrolled ? "bg-background/95 shadow-md backdrop-blur-md" : "bg-gradient-to-b from-background/80 via-background/20 to-transparent"
        )}
      >
        <div className="w-full px-4 md:px-8 flex items-center justify-between">
          {/* Left Block: Logo */}
          <div className="flex items-center w-auto lg:w-1/4">
            <Link href="/" className="flex items-center space-x-1.5 group">
              <span className="text-foreground text-2xl font-black tracking-tighter lowercase font-sans">
                cineverse
              </span>
            </Link>
          </div>

          {/* Center Block: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center justify-center space-x-6 text-sm font-medium text-neutral-600 dark:text-neutral-300 flex-1">
            {/* Thể Loại Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 hover:text-neutral-900 dark:hover:text-white transition-colors focus:outline-none font-semibold">
                <span>{t('nav.genres')}</span>
                <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[520px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-3 gap-y-1.5 gap-x-2 z-50">
                {GENRES_LIST.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/genre/${item.slug}`}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 block truncate"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Quốc Gia Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 hover:text-neutral-900 dark:hover:text-white transition-colors focus:outline-none font-semibold">
                <span>{t('nav.country')}</span>
                <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[640px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-4 gap-y-1.5 gap-x-2 z-50 max-h-[75vh] overflow-y-auto scrollbar-thin">
                {COUNTRIES_LIST.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/country/${item.slug}`}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 block truncate"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Danh Sách Dropdown */}
            <div className="relative group py-5">
              <button className="flex items-center space-x-1 hover:text-neutral-900 dark:hover:text-white transition-colors focus:outline-none font-semibold">
                <span>{t('nav.list')}</span>
                <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="absolute top-[85%] left-1/2 -translate-x-1/2 mt-0 w-[500px] p-4 bg-[#090c15]/65 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 grid grid-cols-3 gap-y-1.5 gap-x-2 z-50">
                {LISTS_CATALOG.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/15 hover:backdrop-blur-md hover:translate-x-1 transition-all duration-200 block truncate"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hover:text-neutral-900 dark:hover:text-white transition-colors font-semibold",
                  pathname === link.href 
                    ? "text-neutral-900 dark:text-white font-black" 
                    : "text-neutral-600 dark:text-neutral-300"
                )}
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>
          {/* Right Block: Search & Actions & Profile */}
          <div className="flex items-center justify-end space-x-3 w-auto min-w-0">
            {/* Search Input inline */}
            <div className="relative flex items-center min-w-0">
              <form onSubmit={handleSearchSubmit} className="flex items-center relative min-w-0">
                <div className="relative min-w-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Tìm kiếm phim, diễn viên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-[16rem] sm:max-w-[18rem] md:max-w-[20rem] bg-black/5 dark:bg-black/60 border border-black/10 dark:border-white/20 rounded-full pl-10 pr-4 py-2 text-sm text-neutral-800 dark:text-white focus:border-neutral-400 dark:focus:border-white transition-all duration-300 outline-none"
                  />
                </div>
              </form>

              {/* Instant Search Results Dropdown */}
              {searchQuery.trim() && (
                <div className="absolute right-0 top-11 w-80 md:w-96 bg-[#141414] border border-white/10 rounded shadow-xl overflow-hidden z-50 text-xs">
                  {isSearching ? (
                    <div className="p-4 flex items-center justify-center space-x-2 text-neutral-400">
                      <Loader2 size={16} className="animate-spin text-netflixRed" />
                      <span>Đang tìm kiếm...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
                      {searchResults.map((film) => {
                        const poster = resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url);
                        return (
                          <Link
                            key={film._id || film.slug}
                            href={`/film/${film.slug}`}
                            onClick={() => setSearchQuery('')}
                            className="flex items-center space-x-3 p-2.5 hover:bg-white/10 transition-colors group"
                          >
                            <div className="w-10 h-14 bg-neutral-800 rounded overflow-hidden flex-shrink-0 relative">
                              {poster ? (
                                <img src={poster} alt={film.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                  <Film size={16} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white group-hover:text-netflixRed transition-colors truncate">
                                {film.name}
                              </p>
                              <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                                {film.origin_name} ({film.year})
                              </p>
                              <div className="flex items-center space-x-2 text-[10px] text-neutral-500 mt-1">
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-white">{film.quality || 'FHD'}</span>
                                <span>{film.lang || 'Vietsub'}</span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-neutral-400">
                      Không tìm thấy kết quả nào cho "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile / Actions */}
            {user ? (
              <>
                {/* Notifications Bell Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="relative p-2 text-neutral-300 hover:text-white transition-colors focus:outline-none">
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-netflixRed animate-pulse" />
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 p-2 bg-[#141414] border border-white/10 text-neutral-300 text-xs shadow-2xl z-50">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 mb-1">
                      <span className="font-bold text-white text-sm">Thông báo</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] text-neutral-400 hover:text-white transition-colors"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1">
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
                    <DropdownMenuItem
                      className="hover:bg-white/10"
                      onClick={toggleTheme}
                    >
                      {mounted && theme === 'light' ? <Moon size={14} className="mr-2" /> : <Sun size={14} className="mr-2" />}
                      <span>{theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="hover:bg-white/10"
                      onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
                    >
                      <Languages size={14} className="mr-2" />
                      <span>{lang === 'vi' ? 'English' : 'Tiếng Việt'}</span>
                    </DropdownMenuItem>
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
        <div className="fixed inset-0 z-40 bg-background pt-20 flex flex-col p-6 space-y-4 text-neutral-300 text-base font-semibold animate-in fade-in slide-in-from-top-4 duration-300 overflow-y-auto">
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
