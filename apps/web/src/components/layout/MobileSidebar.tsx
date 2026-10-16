"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Tv,
  Film as FilmIcon,
  Sparkles,
  Users,
  BookmarkCheck,
  BookOpen,
  History,
  ChevronDown,
  Menu,
  User,
  LogOut,
  Clapperboard,
  Globe,
  Languages,
  HelpCircle,
  Shield,
  FileText,
  Mail,
  ListFilter,
  MessageSquare,
  Shuffle,
  UserCheck,
  CalendarDays,
  SlidersHorizontal,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useAuthModalStore } from "@/store/authModalStore";
import { useTranslation } from "@/store/langStore";
import { GENRES_LIST, COUNTRIES_LIST, CountryFlagImage } from "./Navbar";
import { cardFont, logoFont } from "@/lib/fonts";
import { getNameColorProps, getAvatarFrameConfig } from "@/lib/profile-appearance";
import { InteractiveAdminMascot } from "@/components/mascot/InteractiveAdminMascot";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { t, lang, setLang } = useTranslation();
  const [showMore, setShowMore] = useState(false);
  const [showGenres, setShowGenres] = useState(false);
  const [showCountries, setShowCountries] = useState(false);

  const mainItems = [
    { title: t("nav.home"), href: "/", icon: Home },
    { title: t("nav.series"), href: "/films/series", icon: Tv },
    { title: t("nav.single"), href: "/films/single", icon: FilmIcon },
    { title: t("nav.anime"), href: "/films/anime", icon: Clapperboard },
    { title: lang === "en" ? "Watch Party" : "Xem Chung", href: "/watch-party", icon: Users },
  ];

  const personalItems = [
    { title: t("nav.watchlist"), href: "/watchlist", icon: BookmarkCheck },
    { title: lang === "en" ? "Library" : "Thư viện", href: "/library", icon: BookOpen },
    { title: t("nav.history"), href: "/history", icon: History },
  ];

  // Lock background body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm xl:hidden touch-none"
            onClick={onClose}
          />

          {/* Minimalist Black & White Sheet Drawer */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.8 }}
            className={`${cardFont.className} fixed bottom-0 left-0 top-0 z-[65] h-[100dvh] w-[84vw] max-w-[304px] overflow-y-auto overscroll-contain border-r border-white/10 bg-[#0a0c10] shadow-[0_0_40px_rgba(0,0,0,0.9)] touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-none xl:hidden`}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center gap-1.5 border-b border-white/10 bg-[#0a0c10]/95 px-4 py-3.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={onClose}
                aria-label={t("nav.closeSearch", "Đóng")}
                className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-neutral-300 transition-colors hover:bg-white/10 hover:text-white active:scale-90 touch-manipulation"
              >
                <Menu size={22} strokeWidth={2.2} />
              </button>
          <Link
            href="/"
            className="flex items-center space-x-2"
            onClick={onClose}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/flexphim-logo.svg"
              alt="FlexPhim Logo"
              className="h-7 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/flexphim-logo.png";
              }}
            />
            <span
              className={cn(
                logoFont.className,
                "text-[22px] font-bold uppercase tracking-[-0.01em] text-white select-none leading-none",
              )}
            >
              Flex
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                Phim
              </span>
            </span>
          </Link>
        </div>

        {/* User Profile Card (Visible when logged in) */}
        {user ? (() => {
          const frameConfig = getAvatarFrameConfig(user.avatarFrameColor);
          const nameProps = getNameColorProps(user.nameColor);
          const isMascotAvatar = user.avatarUrl === "/avatars/admin-mascot-riso.png";
          const isTargetAdmin =
            user.email?.toLowerCase() === "huywashere@gmail.com" ||
            user.username?.toLowerCase() === "huywashere";

          const renderSidebarAvatar = () => {
            const avatarContent = isMascotAvatar ? (
              <InteractiveAdminMascot size={36} className="w-full h-full bg-[#faf9f7]" />
            ) : user.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=80`;
                }}
              />
            ) : isTargetAdmin ? (
              <InteractiveAdminMascot size={36} className="w-full h-full bg-[#faf9f7]" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=80`}
                alt={user.displayName || user.username}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=8b5cf6&color=ffffff&size=80`;
                }}
              />
            );

            if (frameConfig.isRainbowWrap) {
              return (
                <div className="relative shrink-0 anim-frame-rainbow-wrap h-9 w-9">
                  <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
                    {avatarContent}
                  </div>
                </div>
              );
            }

            return (
              <div
                className={cn(
                  "h-9 w-9 shrink-0 rounded-full overflow-hidden bg-neutral-900 shadow-md",
                  frameConfig.className || "border border-white/20",
                )}
                style={frameConfig.style}
              >
                {avatarContent}
              </div>
            );
          };

          return (
            <div className="border-b border-white/10 bg-white/[0.02] px-3 py-2.5">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-3">
                  {renderSidebarAvatar()}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-extrabold text-xs truncate transition-all",
                        nameProps.className || "text-white",
                      )}
                      style={nameProps.style}
                    >
                      {user.displayName || user.username}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Link
                    href={`/user/${encodeURIComponent(user.username)}`}
                    className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 text-center text-[11px] font-semibold text-white transition-all hover:bg-white/20 active:scale-95"
                    onClick={onClose}
                  >
                    <User size={13} />
                    <span>{t("nav.profile")}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-center text-[11px] font-bold text-neutral-300 transition-all hover:bg-white/10 hover:text-white active:scale-95"
                  >
                    <LogOut size={13} />
                    <span>{t("nav.logout")}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })() : (
          <div className="border-b border-white/10 bg-white/[0.02] px-3 py-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                useAuthModalStore.getState().openModal("login");
              }}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/15 text-white px-4 text-xs font-bold transition-all active:scale-[0.98]"
            >
              <User size={15} className="text-neutral-300" />
              <span>{t("nav.login")} / {t("nav.register")}</span>
            </button>
          </div>
        )}

        {/* Language Selection Bar in Mobile Drawer */}
        <div className="flex h-10 items-center justify-between border-b border-white/10 px-3.5">
          <span className="flex items-center gap-2 text-[11px] font-semibold text-neutral-400">
            <Languages size={14} className="text-neutral-400" />
            <span>{t("nav.language", "Ngôn ngữ")}:</span>
          </span>
          <div className="flex h-7 items-center rounded-full border border-white/10 bg-white/[0.06] p-0.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setLang("vi")}
              className={cn(
                "h-[1.35rem] rounded-full px-2.5 transition-all cursor-pointer",
                lang === "vi"
                  ? "bg-white text-black font-extrabold shadow-sm"
                  : "text-neutral-400 hover:text-white",
              )}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "h-[1.35rem] rounded-full px-2.5 transition-all cursor-pointer",
                lang === "en"
                  ? "bg-white text-black font-extrabold shadow-sm"
                  : "text-neutral-400 hover:text-white",
              )}
            >
              EN
            </button>
          </div>
        </div>

        {/* Scrollable Navigation List */}
        <nav className="space-y-4 px-3 py-3 pb-5">
          {/* Main Navigation Group */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {t("nav.browseBy", "Khám phá")}
            </p>
            <div className="space-y-1">
              {mainItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-white/10 border border-white/15 text-white font-bold shadow-sm"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white",
                    )}
                    onClick={onClose}
                  >
                    <item.icon
                      size={17}
                      className={cn(
                        isActive ? "text-white" : "text-neutral-400",
                      )}
                      strokeWidth={2}
                    />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Personal Group */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {lang === "en" ? "My Library" : "Thư viện cá nhân"}
            </p>
            <div className="space-y-1">
              {personalItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-white/10 border border-white/15 text-white font-bold shadow-sm"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white",
                    )}
                    onClick={onClose}
                  >
                    <item.icon
                      size={17}
                      className={cn(
                        isActive ? "text-white" : "text-neutral-400",
                      )}
                      strokeWidth={2}
                    />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowGenres(!showGenres)}
              className="flex min-h-11 w-full items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Sparkles size={17} className="text-neutral-400" />
                <span>{t("nav.genres")}</span>
              </div>
              <ChevronDown
                size={15}
                className={cn(
                  "transition-transform duration-200 text-neutral-500",
                  showGenres && "rotate-180 text-white",
                )}
              />
            </button>

            {showGenres && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 px-1 pt-1 animate-in fade-in duration-200">
                {GENRES_LIST.map((genre) => (
                  <Link
                    key={genre.slug}
                    href={`/genre/${genre.slug}`}
                    className={cn(
                      "px-3 py-2 rounded-lg text-[11px] font-medium transition-all truncate border",
                      pathname === `/genre/${genre.slug}`
                        ? "bg-white/15 border-white/30 text-white font-bold"
                        : "border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/10",
                    )}
                    onClick={onClose}
                  >
                    {t(`genres_list.${genre.slug}`, genre.label)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Countries Collapsible Grid */}
          <div>
            <button
              type="button"
              onClick={() => setShowCountries(!showCountries)}
              className="flex min-h-11 w-full items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Globe size={17} className="text-neutral-400" />
                <span>{t("nav.country")}</span>
              </div>
              <ChevronDown
                size={15}
                className={cn(
                  "transition-transform duration-200 text-neutral-500",
                  showCountries && "rotate-180 text-white",
                )}
              />
            </button>

            {showCountries && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 px-1 pt-1 animate-in fade-in duration-200">
                {COUNTRIES_LIST.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/country/${c.slug}`}
                    className={cn(
                      "flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border truncate",
                      pathname === `/country/${c.slug}`
                        ? "bg-white/15 border-white/30 text-white font-bold"
                        : c.isHot
                          ? "border-amber-500/25 bg-amber-500/[0.08] text-amber-200 hover:text-white hover:bg-amber-500/15"
                          : "border-white/5 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/10",
                    )}
                    onClick={onClose}
                  >
                    <CountryFlagImage
                      code={c.code}
                      label={t(`countries_list.${c.slug}`, c.label)}
                      className="w-4 h-3 object-cover rounded-[2px] shrink-0"
                    />
                    <span className="truncate flex-1">
                      {t(`countries_list.${c.slug}`, c.label)}
                    </span>
                    {c.isHot && (
                      <Flame
                        size={12}
                        className="text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.65)] shrink-0 ml-auto"
                      />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Thêm Collapsible Section */}
          <div>
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="flex min-h-11 w-full items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <span>{t("nav.more", "Thêm")}</span>
              <ChevronDown
                size={15}
                className={cn(
                  "transition-transform duration-200 text-neutral-500",
                  showMore && "rotate-180 text-white",
                )}
              />
            </button>

            {showMore && (
              <div className="mt-1 space-y-1 px-1 pt-1 animate-in fade-in duration-200">
                {[
                  {
                    title: t("nav.comments", "Bình luận"),
                    href: "/comments",
                    icon: MessageSquare,
                  },
                  {
                    title: t("nav.randomMovie", "Phim ngẫu nhiên"),
                    href: "/random",
                    icon: Shuffle,
                  },
                  {
                    title: t("nav.watchParty", "Xem Chung"),
                    href: "/watch-party",
                    icon: Users,
                  },
                  {
                    title: t("nav.actors", "Diễn viên"),
                    href: "/actors",
                    icon: UserCheck,
                  },
                  {
                    title: t("nav.schedule", "Lịch chiếu"),
                    href: "/schedule",
                    icon: CalendarDays,
                  },
                  {
                    title: t("nav.tvshows", "TV Shows"),
                    href: "/films/tv-shows",
                    icon: Tv,
                  },
                  {
                    title: t("nav.yearFilter", "Bộ lọc theo năm"),
                    href: "/films",
                    icon: SlidersHorizontal,
                  },
                ].map((subItem) => {
                  const isActive =
                    pathname === subItem.href ||
                    pathname.startsWith(subItem.href + "/");
                  const SubIcon = subItem.icon;
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all",
                        isActive
                          ? "bg-white/15 text-white font-semibold"
                          : "text-neutral-300 hover:bg-white/10 hover:text-white",
                      )}
                      onClick={onClose}
                    >
                      {SubIcon && (
                        <SubIcon
                          size={15}
                          className={isActive ? "text-white" : "text-neutral-400"}
                        />
                      )}
                      <span>{subItem.title}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Support & Legal Group */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {t("footer.support", "Hỗ trợ & Bản quyền")}
            </p>
            <div className="space-y-1">
              {[
                { title: "Báo lỗi", href: "/report", icon: HelpCircle, disabled: true },
                { title: "Chính sách bảo mật", href: "/privacy", icon: Shield, disabled: true },
                { title: "Điều khoản sử dụng", href: "/terms", icon: FileText, disabled: true },
                { title: "Liên hệ", href: "/contact", icon: Mail, disabled: true },
              ].map((item) => {
                if (item.disabled) {
                  return (
                    <div
                      key={item.href}
                      className="flex min-h-11 items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-500 cursor-not-allowed select-none opacity-50"
                      title="Tính năng đang tạm đóng để nâng cấp và bảo trì"
                    >
                      <item.icon size={17} className="text-neutral-600" strokeWidth={2} />
                      <span>{item.title}</span>
                    </div>
                  );
                }

                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-violet-600 text-white font-bold shadow-sm"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white",
                    )}
                    onClick={onClose}
                  >
                    <item.icon
                      size={17}
                      className={cn(
                        isActive ? "text-white" : "text-neutral-400",
                      )}
                      strokeWidth={2}
                    />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </motion.aside>
    </>
  )}
</AnimatePresence>
  );
}
