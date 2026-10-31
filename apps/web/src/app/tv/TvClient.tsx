"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Tv,
  Radio,
  Search,
  Heart,
  Share2,
  RefreshCw,
  Layers,
  ChevronRight,
  Globe2,
  Trophy,
  Check,
  Flame,
  LayoutDashboard,
  Play,
} from "lucide-react";
import {
  TV_CHANNELS,
  TV_CATEGORIES,
  TvChannel,
  TvCategory,
  getChannelBySlug,
  getDefaultChannel,
} from "@/lib/tv-channels";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// Dynamic import of ArtPlayer to avoid SSR window errors
const ArtPlayer = dynamic(() => import("@/components/video/ArtPlayer"), {
  ssr: false,
  loading: () => (
    <div className="relative aspect-video w-full rounded-2xl bg-[#0e1017] border border-white/10 flex flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 rounded-full border-2 border-[#23ade5] border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-neutral-400">
        Đang khởi tạo luồng phát truyền hình...
      </span>
    </div>
  ),
});

const FAVORITES_KEY = "flexphim-tv-favorites-v1";

function ChannelLogoBadge({
  channel,
  className = "h-11 w-11",
}: {
  channel?: TvChannel | null;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [channel?.id, channel?.logoUrl]);

  if (!channel) return null;

  if (channel.logoUrl && !imgError) {
    return (
      <div
        className={cn(
          "relative shrink-0 rounded-xl bg-white/5 border border-white/10 p-1 flex items-center justify-center overflow-hidden transition-all",
          className,
        )}
      >
        <img
          src={channel.logoUrl}
          alt={channel.shortName || channel.name}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-xl bg-gradient-to-br border border-white/15 flex items-center justify-center text-white font-black text-xs shadow-md select-none",
        channel.badgeColor || "from-sky-600 to-blue-800",
        className,
      )}
    >
      <span>{(channel.shortName || channel.name || "TV").slice(0, 5)}</span>
    </div>
  );
}

interface TvClientProps {
  initialChannel: TvChannel;
}

export default function TvClient({ initialChannel }: TvClientProps) {
  const searchParams = useSearchParams();
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Initialize state directly from server-resolved initialChannel to prevent hydration divergence
  const [activeChannel, setActiveChannel] = useState<TvChannel>(initialChannel);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<TvCategory | "fav">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const currentChannel = activeChannel || initialChannel || getDefaultChannel();

  // Handle client-side browser history navigation (back/forward)
  useEffect(() => {
    const slugParam = searchParams.get("channel");
    if (slugParam) {
      const found = getChannelBySlug(slugParam);
      if (found && found.id !== activeChannel?.id) {
        setActiveChannel(found);
        setActiveSourceIndex(0);
        setPlayerError(null);
      }
    }
  }, [searchParams, activeChannel?.id]);

  // Load favorites from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const toggleFavorite = (channelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const isFav = prev.includes(channelId);
      const next = isFav
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSelectChannel = (channel: TvChannel) => {
    if (channel.id === activeChannel?.id) return;
    setActiveChannel(channel);
    setActiveSourceIndex(0);
    setPlayerError(null);
    setReloadKey((prev) => prev + 1);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("channel", channel.slug);
      window.history.replaceState({}, "", url.toString());

      // On mobile viewports (<1024px), smoothly offset-scroll back to player
      if (window.innerWidth < 1024 && playerContainerRef.current) {
        const yOffset = -76;
        const y =
          playerContainerRef.current.getBoundingClientRect().top +
          window.pageYOffset +
          yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/tv?channel=${currentChannel.slug}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const handleReload = () => {
    setPlayerError(null);
    setReloadKey((prev) => prev + 1);
  };

  const handleRetryChannel = () => {
    setPlayerError(null);
    setActiveSourceIndex(0);
    setReloadKey((prev) => prev + 1);
  };

  // Determine current active stream URLs
  const allStreamUrls = useMemo(() => {
    const urls = [currentChannel?.streamUrl || ""];
    if (currentChannel?.backupStreamUrls) {
      urls.push(...currentChannel.backupStreamUrls);
    }
    return urls.filter(Boolean);
  }, [currentChannel]);

  const currentStreamUrl =
    allStreamUrls[activeSourceIndex] || currentChannel?.streamUrl || "";
  const hasAlternativeSource = allStreamUrls.length > 1;

  const handleSwitchSource = () => {
    setActiveSourceIndex((prev) => (prev + 1) % allStreamUrls.length);
    setPlayerError(null);
    setReloadKey((prev) => prev + 1);
  };

  // Player error callback with fallback recovery
  const handlePlayerError = (error: unknown) => {
    console.warn("[LiveTV] Player encountered error:", error);
    // If backup stream URL is available, auto-switch to next source
    if (activeSourceIndex < allStreamUrls.length - 1) {
      setActiveSourceIndex((prev) => prev + 1);
      setReloadKey((prev) => prev + 1);
    } else {
      // All sources failed: activate graceful in-player fallback overlay
      setPlayerError(
        "Luồng phát hiện đang gián đoạn hoặc đài truyền hình đang bảo trì tín hiệu.",
      );
    }
  };

  // Filter channels based on category and search query
  const filteredChannels = useMemo(() => {
    let list = TV_CHANNELS;

    if (activeCategory === "fav") {
      list = list.filter((c) => favorites.includes(c.id));
    } else if (activeCategory !== "all") {
      list = list.filter((c) => c.category === activeCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.shortName.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.broadcaster.toLowerCase().includes(q),
      );
    }

    return list;
  }, [activeCategory, searchQuery, favorites]);

  // Popular channels for quick horizontal switch and 7-Cols grid
  const popularChannels = useMemo(() => {
    return TV_CHANNELS.filter((c) => c.isPopular);
  }, []);

  const isCurrentFav = favorites.includes(currentChannel.id);

  return (
    <div className={cn(cardFont.className, "mx-auto max-w-[1720px] px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8")}>
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Link href="/" className="hover:text-white transition-colors">
            Trang chủ
          </Link>
          <span className="text-neutral-600">/</span>
          <span className="text-white font-semibold">Truyền Hình</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
            </span>
            LIVE
          </span>
          <span className="text-[11px] font-bold text-[#23ade5]">
            {TV_CHANNELS.length}+ Kênh Trực Tuyến
          </span>
        </div>
      </div>

      {/* ── Mobile Compact Status Bar (Above The Fold) ── */}
      <div className="lg:hidden flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#0e1017] border border-white/[0.08]">
        <div className="flex items-center gap-2 min-w-0">
          <ChannelLogoBadge channel={currentChannel} className="h-7 w-7" />
          <span className="text-xs font-bold text-white truncate">
            {currentChannel.name}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-neutral-400 bg-white/5 px-2 py-0.5 rounded shrink-0">
          {currentChannel.resolution}
        </span>
      </div>

      {/* ── Desktop Cinematic Header Banner ── */}
      <div className="hidden lg:flex items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              TRUYỀN HÌNH TRỰC TUYẾN
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400">
              <Radio size={12} className="text-[#23ade5]" /> Chuẩn Full HD 1080p
            </span>
          </div>
          <h1 className="text-2xl xl:text-3xl font-black text-white tracking-tight">
            Truyền Hình Trực Tuyến - Kênh Việt Nam &amp; Thế Giới
          </h1>
          <p className="text-xs xl:text-sm text-neutral-400 mt-1 max-w-2xl">
            Theo dõi trực tiếp các kênh VTV, HTV, THVL, ANTV, Thể thao và Kênh Quốc Tế chuẩn Full HD 1080p với độ trễ siêu thấp.
          </p>
        </div>

        {/* Quick Stat Cards */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-white/[0.08] bg-[#0e1017]/80 backdrop-blur-sm">
            <Trophy size={16} className="text-amber-400 shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-neutral-400 font-medium">Độ phân giải</div>
              <div className="text-xs font-bold text-white">Full HD 1080p</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-white/[0.08] bg-[#0e1017]/80 backdrop-blur-sm">
            <Globe2 size={16} className="text-[#23ade5] shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-neutral-400 font-medium">Băng thông</div>
              <div className="text-xs font-bold text-white">Không Giới Hạn</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Video Player (Left/Top) + Channel Directory (Right/Below) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Live TV Video Player (8 Cols) ── */}
        <div
          ref={playerContainerRef}
          className="lg:col-span-8 space-y-4 scroll-mt-20 sm:scroll-mt-24"
        >
          {/* Main Video Player Container */}
          <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-black border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] aspect-video">
            <ArtPlayer
              key={`${currentChannel.id}-${activeSourceIndex}-${reloadKey}`}
              url={currentStreamUrl}
              fallbackUrl={allStreamUrls[1]}
              isLive={true}
              title={currentChannel.name}
              autoplay={true}
              onError={handlePlayerError}
            />

            {/* In-Player Graceful Fallback Overlay */}
            {playerError && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#141720]/95 via-[#0a0b10]/95 to-black/95 p-6 text-center backdrop-blur-md animate-in fade-in duration-300">
                <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 shadow-[0_0_25px_rgba(244,63,94,0.2)]">
                  <ChannelLogoBadge channel={currentChannel} className="h-10 w-10" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  Tín hiệu kênh tạm thời gián đoạn
                </span>
                <h3 className="text-sm sm:text-base font-black text-white max-w-md">
                  {currentChannel.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-md leading-relaxed">
                  Kênh truyền hình này hiện không phản hồi luồng phát trực tiếp. Quý khách vui lòng thử kết nối lại hoặc chuyển sang các kênh phổ biến bên dưới.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleRetryChannel}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#23ade5] hover:bg-[#1fa0d4] text-black shadow-lg shadow-[#23ade5]/20 transition-all cursor-pointer active:scale-95"
                  >
                    <RefreshCw size={13} />
                    <span>Thử kết nối lại</span>
                  </button>

                  {hasAlternativeSource && (
                    <button
                      type="button"
                      onClick={handleSwitchSource}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all cursor-pointer active:scale-95"
                    >
                      <Layers size={13} className="text-[#23ade5]" />
                      <span>
                        Đổi Nguồn {((activeSourceIndex + 1) % allStreamUrls.length) + 1}/{allStreamUrls.length}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSelectChannel(getDefaultChannel())}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Xem VTV1 HD</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Channel Details & Action Bar */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0e1017] p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <ChannelLogoBadge channel={currentChannel} className="h-12 w-12 sm:h-14 sm:w-14" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    LIVE
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-neutral-300">
                    {currentChannel.resolution}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#23ade5]/15 text-[#23ade5] border border-[#23ade5]/30">
                    {currentChannel.categoryName}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  {currentChannel.name}
                </h2>
                <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                  {currentChannel.broadcaster} • {currentChannel.description}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons (Touch Friendly & Responsive) */}
            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
              {hasAlternativeSource && (
                <button
                  type="button"
                  onClick={handleSwitchSource}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer min-h-[40px]"
                  title="Chuyển đổi nguồn phát dự phòng nếu luồng bị giật"
                >
                  <Layers size={13} className="text-[#23ade5]" />
                  <span>
                    Nguồn {activeSourceIndex + 1}/{allStreamUrls.length}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReload}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Làm mới luồng phát"
                aria-label="Tải lại luồng"
              >
                <RefreshCw size={14} />
              </button>

              <button
                type="button"
                onClick={() => toggleFavorite(currentChannel.id)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer",
                  isCurrentFav
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border-white/10",
                )}
                title={isCurrentFav ? "Xóa khỏi kênh yêu thích" : "Lưu vào kênh yêu thích"}
                aria-label="Yêu thích"
              >
                <Heart size={14} fill={isCurrentFav ? "currentColor" : "none"} />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer min-h-[40px]"
                title="Sao chép link kênh"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Share2 size={13} />
                    <span>Chia sẻ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Switcher Carousel (1-Tap Switching) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold px-1">
              <span className="flex items-center gap-1.5 text-white">
                <Flame size={13} className="text-amber-400" />
                Chuyển Kênh Nhanh 1 Chạm
              </span>
              <span className="text-[11px] text-neutral-500">
                Vuốt ngang để xem thêm
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
              {popularChannels.map((channel) => {
                const isActive = channel.id === currentChannel.id;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => handleSelectChannel(channel)}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer active:scale-95",
                      isActive
                        ? "bg-[#23ade5]/15 border-[#23ade5]/50 text-[#23ade5] shadow-sm shadow-[#23ade5]/20"
                        : "bg-[#0e1017] hover:bg-white/[0.06] text-neutral-300 hover:text-white border-white/[0.08]",
                    )}
                  >
                    <ChannelLogoBadge channel={channel} className="h-5 w-5" />
                    <span>{channel.shortName}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#23ade5] animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Column: Channel Directory, Search & Category Filters (4 Cols) ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0e1017] p-4 flex flex-col space-y-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white">
                <Tv size={14} className="text-[#23ade5]" />
                Danh Sách Kênh ({filteredChannels.length})
              </span>
              <span className="text-[11px] font-semibold text-neutral-400">
                Phát sóng 24/7
              </span>
            </div>

            {/* Instant Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kênh: vtv3, htv7, thvl, bong da..."
                className="w-full rounded-xl bg-white/[0.04] border border-white/10 py-2.5 pl-9 pr-8 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#23ade5] focus:bg-white/[0.06] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 hover:text-white bg-white/10 rounded px-1.5 py-0.5 cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Dynamic Category Filter Pills (Anti-Slop Dark Glass Capsule Style) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
              {TV_CATEGORIES.map((category) => {
                const isCatActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer",
                      isCatActive
                        ? "bg-white/15 text-white border border-white/25 shadow-sm shadow-black/40"
                        : "bg-white/[0.03] hover:bg-white/[0.07] text-neutral-400 hover:text-white border border-white/[0.06]",
                    )}
                  >
                    {category.name}
                  </button>
                );
              })}

              {favorites.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("fav")}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer",
                    activeCategory === "fav"
                      ? "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                      : "bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/20",
                  )}
                >
                  <Heart size={11} fill="currentColor" />
                  <span>Yêu thích ({favorites.length})</span>
                </button>
              )}
            </div>

            {/* Channels Directory List (Desktop: Scrollable 640px; Mobile: Natural Flow without Scroll-Trap) */}
            <div className="lg:max-h-[640px] lg:overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 overscroll-contain">
              {filteredChannels.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">
                  <Tv size={28} className="mx-auto mb-2 text-neutral-500 stroke-1" />
                  <p className="text-xs font-medium">Không tìm thấy kênh phù hợp</p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Thử tìm từ khóa khác hoặc chuyển sang tab Tất Cả Kênh
                  </p>
                </div>
              ) : (
                filteredChannels.map((channel) => {
                  const isActive = channel.id === currentChannel.id;
                  const isFav = favorites.includes(channel.id);

                  return (
                    <div
                      key={channel.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectChannel(channel)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectChannel(channel);
                        }
                      }}
                      className={cn(
                        "group flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all cursor-pointer border min-h-[52px]",
                        isActive
                          ? "bg-[#23ade5]/10 border-[#23ade5]/50 shadow-[0_0_20px_rgba(35,173,229,0.12)]"
                          : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05] hover:border-white/15",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ChannelLogoBadge channel={channel} className="h-10 w-10" />
                        <div className="min-w-0">
                          <h3
                            className={cn(
                              "truncate text-xs font-bold transition-colors",
                              isActive
                                ? "text-[#23ade5] font-black"
                                : "text-neutral-200 group-hover:text-white",
                            )}
                          >
                            {channel.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-neutral-400 truncate">
                              {channel.broadcaster}
                            </span>
                            <span className="text-[9px] font-semibold text-neutral-500 bg-white/5 px-1.5 py-0.2 rounded shrink-0">
                              {channel.resolution}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Indicator & Touch-Friendly Favorite Icon */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(channel.id, e)}
                          className={cn(
                            "p-2 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center",
                            isFav
                              ? "text-rose-400 hover:text-rose-300"
                              : "text-white/40 hover:text-white/80 opacity-60 sm:opacity-0 sm:group-hover:opacity-100",
                          )}
                          title={isFav ? "Bỏ yêu thích" : "Yêu thích"}
                          aria-label={`Yêu thích ${channel.shortName}`}
                        >
                          <Heart size={14} fill={isFav ? "currentColor" : "none"} />
                        </button>

                        {isActive ? (
                          <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#23ade5]">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#23ade5] opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#23ade5]" />
                            </span>
                          </div>
                        ) : (
                          <ChevronRight
                            size={14}
                            className="text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Featured Channels: Desktop 7-Cols Standard Section ── */}
      <section className="space-y-4 pt-4 border-t border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <LayoutDashboard size={18} className="text-[#23ade5]" />
              Kênh Truyền Hình Nổi Bật
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Các kênh truyền hình quốc gia và thể thao được quan tâm nhiều nhất
            </p>
          </div>
          <span className="text-xs font-semibold text-neutral-400 self-start sm:self-auto">
            {popularChannels.length} Kênh Chọn Lọc
          </span>
        </div>

        {/* 7-Cols Grid Layout complying with AGENTS.md Desktop 7-Cols Standard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
          {popularChannels.map((channel) => {
            const isActive = channel.id === currentChannel.id;
            return (
              <div
                key={channel.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectChannel(channel)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectChannel(channel);
                  }
                }}
                className={cn(
                  "group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all cursor-pointer bg-[#0e1017] hover:-translate-y-1",
                  isActive
                    ? "border-[#23ade5] shadow-[0_0_25px_rgba(35,173,229,0.2)] bg-[#23ade5]/[0.06]"
                    : "border-white/[0.08] hover:border-white/20 hover:bg-[#12141c]",
                )}
              >
                {/* Top Row: Logo & Live Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <ChannelLogoBadge channel={channel} className="h-10 w-10 sm:h-11 sm:w-11" />
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                      isActive
                        ? "bg-[#23ade5]/20 text-[#23ade5] border border-[#23ade5]/40"
                        : "bg-white/5 text-neutral-400 group-hover:text-white",
                    )}
                  >
                    {channel.resolution}
                  </span>
                </div>

                {/* Bottom Row: Channel Info */}
                <div>
                  <h3
                    className={cn(
                      "text-xs sm:text-sm font-bold truncate transition-colors",
                      isActive ? "text-[#23ade5]" : "text-white group-hover:text-[#23ade5]",
                    )}
                  >
                    {channel.shortName}
                  </h3>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {channel.broadcaster}
                  </p>
                </div>

                {/* Active glow / Play badge */}
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#23ade5] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#23ade5]" />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
