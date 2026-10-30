"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  Tv,
  Radio,
  Search,
  Heart,
  Share2,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
  Flame,
  Globe2,
  Trophy,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  TV_CHANNELS,
  TV_CATEGORIES,
  TvChannel,
  TvCategory,
  getChannelBySlug,
  getDefaultChannel,
} from "@/lib/tv-channels";

// Dynamic import of ArtPlayer to avoid SSR window errors
const ArtPlayer = dynamic(() => import("@/components/video/ArtPlayer"), {
  ssr: false,
  loading: () => (
    <div className="relative aspect-video w-full rounded-2xl bg-[#14171f] border border-white/10 flex flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 rounded-full border-2 border-[#23ade5] border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-neutral-400">
        Đang chuẩn bị luồng phát trực tiếp...
      </span>
    </div>
  ),
});

const FAVORITES_KEY = "flexphim-tv-favorites-v1";

function ChannelLogoBadge({
  channel,
  className = "h-11 w-11",
}: {
  channel: TvChannel;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (channel.logoUrl && !imgError) {
    return (
      <div
        className={`relative ${className} shrink-0 rounded-xl bg-white/5 border border-white/10 p-1 flex items-center justify-center overflow-hidden`}
      >
        <img
          src={channel.logoUrl}
          alt={channel.shortName}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback styled gradient badge
  return (
    <div
      className={`relative ${className} shrink-0 rounded-xl bg-gradient-to-br ${
        channel.badgeColor || "from-sky-600 to-blue-800"
      } border border-white/15 flex items-center justify-center text-white font-black text-xs shadow-md select-none`}
    >
      <span>{channel.shortName.slice(0, 5)}</span>
    </div>
  );
}

export default function TvClient({
  initialChannel,
}: {
  initialChannel: TvChannel;
}) {
  const searchParams = useSearchParams();
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Active channel resolution
  const [activeChannel, setActiveChannel] = useState<TvChannel>(() => {
    const slugParam = searchParams.get("channel");
    if (slugParam) {
      const found = getChannelBySlug(slugParam);
      if (found) return found;
    }
    return initialChannel || getDefaultChannel();
  });

  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<TvCategory | "fav">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Sync with searchParams if user navigates via browser history
  useEffect(() => {
    const slugParam = searchParams.get("channel");
    if (slugParam) {
      const found = getChannelBySlug(slugParam);
      if (found && found.id !== activeChannel.id) {
        setActiveChannel(found);
        setActiveSourceIndex(0);
      }
    }
  }, [searchParams]);

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
    if (channel.id === activeChannel.id) return;
    setActiveChannel(channel);
    setActiveSourceIndex(0);
    setReloadKey((prev) => prev + 1);

    // Update URL query param smoothly without triggering Next.js RSC fetch
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("channel", channel.slug);
      window.history.replaceState({}, "", url.toString());

      // On mobile screen, scroll back to player smoothly
      if (window.innerWidth < 1024 && playerContainerRef.current) {
        playerContainerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/tv?channel=${activeChannel.slug}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  // Determine current active stream URL
  const currentChannel = activeChannel || initialChannel || getDefaultChannel();
  const allStreamUrls = useMemo(() => {
    const urls = [currentChannel?.streamUrl || ""];
    if (currentChannel?.backupStreamUrls) {
      urls.push(...currentChannel.backupStreamUrls);
    }
    return urls.filter(Boolean);
  }, [currentChannel]);

  const currentStreamUrl = allStreamUrls[activeSourceIndex] || currentChannel?.streamUrl || "";
  const hasAlternativeSource = allStreamUrls.length > 1;

  const handleSwitchSource = () => {
    setActiveSourceIndex((prev) => (prev + 1) % allStreamUrls.length);
    setReloadKey((prev) => prev + 1);
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

  const isCurrentFav = favorites.includes(activeChannel.id);

  return (
    <div className="mx-auto max-w-[1580px] px-3 sm:px-6 lg:px-8 space-y-6">
      {/* ── Page Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
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
              <Radio size={12} className="text-[#23ade5]" /> 35+ Kênh Miễn Phí
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            Truyền Hình Trực Tuyến - Kênh Việt Nam &amp; Thế Giới
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Theo dõi trực tiếp các kênh VTV, HTV, THVL, ANTV, Thể thao và Kênh Quốc Tế chuẩn Full HD 1080p với độ trễ siêu thấp.
          </p>
        </div>

        {/* Quick stat cards */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03]">
            <Trophy size={16} className="text-amber-400 shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-neutral-400 font-medium">Chất lượng</div>
              <div className="text-xs font-bold text-white">Full HD 1080p</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03]">
            <Globe2 size={16} className="text-[#23ade5] shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-neutral-400 font-medium">Băng thông</div>
              <div className="text-xs font-bold text-white">Không Giới Hạn</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Grid Layout: Player (Left/Top) + Channel Directory (Right/Below) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Live TV Video Player & Active Channel Info (7 Cols) ── */}
        <div
          ref={playerContainerRef}
          className="lg:col-span-8 space-y-4"
        >
          {/* Main Video Player Container */}
          <div className="relative w-full overflow-hidden rounded-2xl bg-black border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] aspect-video">
            <ArtPlayer
              key={`${activeChannel.id}-${activeSourceIndex}-${reloadKey}`}
              url={currentStreamUrl}
              fallbackUrl={allStreamUrls[1]}
              isLive={true}
              title={activeChannel.name}
              autoplay={true}
            />
          </div>

          {/* Active Channel Details Bar */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#12141a] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <ChannelLogoBadge channel={activeChannel} className="h-12 w-12 sm:h-14 sm:w-14" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    LIVE
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-neutral-300">
                    {activeChannel.resolution}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#23ade5]/15 text-[#23ade5] border border-[#23ade5]/30">
                    {activeChannel.categoryName}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  {activeChannel.name}
                </h2>
                <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                  {activeChannel.broadcaster} • {activeChannel.description}
                </p>
              </div>
            </div>

            {/* Quick Channel Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto">
              {hasAlternativeSource && (
                <button
                  type="button"
                  onClick={handleSwitchSource}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                  title="Chuyển đổi nguồn phát dự phòng nếu kênh bị giật"
                >
                  <Layers size={13} className="text-[#23ade5]" />
                  <span>Nguồn {activeSourceIndex + 1}/{allStreamUrls.length}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReload}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Làm mới luồng phát"
                aria-label="Tải lại luồng"
              >
                <RefreshCw size={14} />
              </button>

              <button
                type="button"
                onClick={() => toggleFavorite(activeChannel.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                  isCurrentFav
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border-white/10"
                }`}
                title={isCurrentFav ? "Xóa khỏi kênh yêu thích" : "Lưu vào kênh yêu thích"}
                aria-label="Yêu thích"
              >
                <Heart size={14} fill={isCurrentFav ? "currentColor" : "none"} />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Sao chép link kênh"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400">Đã chép link</span>
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
        </div>

        {/* ── Right Column: Channel Directory, Search & Category Filters (4 Cols) ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#12141a] p-4 flex flex-col space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white">
                <Tv size={14} className="text-[#23ade5]" />
                Danh Sách Kênh ({filteredChannels.length})
              </span>
              <span className="text-[11px] font-semibold text-neutral-400">
                Live 24/7
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
                placeholder="Tìm kênh: vtv3, htv, vĩnh long..."
                className="w-full rounded-xl bg-white/[0.04] border border-white/10 py-2 pl-9 pr-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#23ade5] focus:bg-white/[0.06] transition-all"
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

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  activeCategory === "all"
                    ? "bg-[#23ade5] text-black shadow-md shadow-[#23ade5]/20 font-black"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06]"
                }`}
              >
                Tất cả
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("vtv")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  activeCategory === "vtv"
                    ? "bg-[#23ade5] text-black font-black"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06]"
                }`}
              >
                VTV
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("htv")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  activeCategory === "htv"
                    ? "bg-[#23ade5] text-black font-black"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06]"
                }`}
              >
                HTV
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("local")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  activeCategory === "local"
                    ? "bg-[#23ade5] text-black font-black"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06]"
                }`}
              >
                Địa Phương
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("sports")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  activeCategory === "sports"
                    ? "bg-[#23ade5] text-black font-black"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06]"
                }`}
              >
                Thể Thao
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory("international")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  activeCategory === "international"
                    ? "bg-[#23ade5] text-black font-black"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06]"
                }`}
              >
                Quốc Tế
              </button>

              {favorites.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("fav")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    activeCategory === "fav"
                      ? "bg-rose-500 text-white font-black"
                      : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25"
                  }`}
                >
                  <Heart size={11} fill="currentColor" />
                  <span>Yêu thích ({favorites.length})</span>
                </button>
              )}
            </div>

            {/* Scrollable Channels List */}
            <div className="max-h-[620px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 overscroll-contain">
              {filteredChannels.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">
                  <Tv size={28} className="mx-auto mb-2 text-neutral-500 stroke-1" />
                  <p className="text-xs font-medium">Không tìm thấy kênh phù hợp</p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Thử tìm từ khóa khác hoặc chuyển sang danh mục Tất cả
                  </p>
                </div>
              ) : (
                filteredChannels.map((channel) => {
                  const isActive = channel.id === activeChannel.id;
                  const isFav = favorites.includes(channel.id);

                  return (
                    <div
                      key={channel.id}
                      onClick={() => handleSelectChannel(channel)}
                      className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all cursor-pointer border ${
                        isActive
                          ? "bg-[#23ade5]/10 border-[#23ade5]/50 shadow-[0_0_20px_rgba(35,173,229,0.15)]"
                          : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05] hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ChannelLogoBadge channel={channel} className="h-10 w-10" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3
                              className={`truncate text-xs font-bold transition-colors ${
                                isActive
                                  ? "text-[#23ade5] font-black"
                                  : "text-neutral-200 group-hover:text-white"
                              }`}
                            >
                              {channel.name}
                            </h3>
                          </div>
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

                      {/* Right Indicator & Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(channel.id, e)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isFav
                              ? "text-rose-400 hover:text-rose-300"
                              : "text-white/20 hover:text-white/60 opacity-0 group-hover:opacity-100"
                          }`}
                          title={isFav ? "Bỏ yêu thích" : "Yêu thích"}
                          aria-label={`Yêu thích ${channel.shortName}`}
                        >
                          <Heart size={13} fill={isFav ? "currentColor" : "none"} />
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
    </div>
  );
}
