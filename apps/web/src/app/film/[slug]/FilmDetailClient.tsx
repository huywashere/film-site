"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Bookmark,
  Share2,
  Clock,
  Calendar,
  Globe,
  Users,
  Loader2,
  Plus,
  Check,
  Star,
  CheckCircle,
  Info,
  ThumbsUp,
  Bell,
  Subtitles,
  Mic,
  Monitor,
  ChevronRight as ChevronRightIcon,
  ArrowLeft,
  Clapperboard,
  Trophy,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { movieApi, watchlistApi, ratingsApi, reviewsApi } from "@/lib/api";
import { FilmNotFound } from "@/components/film/FilmNotFound";
import { StarRating } from "@/components/film/StarRating";
import { resolveImageUrl } from "@/components/film/FilmCard";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/store/langStore";
import { Button } from "@/components/ui/button";
import { useTmdb, useTmdbPerson } from "@/hooks/useTmdb";
import {
  tmdbBackdrop,
  tmdbImageProxyUrl,
  tmdbProfile,
  tmdbPoster,
} from "@/lib/tmdb";
import { TrailerModal } from "@/components/film/TrailerModal";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { cardFont } from "@/lib/fonts";
import { guestDataStorage } from "@/lib/user-data";
import { useOmdb } from "@/hooks/useOmdb";

function formatRating(value: number) {
  return Number.isFinite(value) && value > 0 ? value.toFixed(1) : null;
}

function formatVoteCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(".0", "")} triệu`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1).replace(".0", "")} nghìn`;
  }
  return String(Math.round(value));
}

function ResilientDetailImage({
  candidates,
  alt,
  className,
  sizes,
  priority = false,
}: {
  candidates: Array<string | null | undefined>;
  alt: string;
  className: string;
  sizes: string;
  priority?: boolean;
}) {
  const sources = useMemo(() => {
    const result: string[] = [];
    for (const source of candidates) {
      if (!source) continue;
      if (!result.includes(source)) result.push(source);
      if (/^https:\/\//i.test(source)) {
        const proxy = tmdbImageProxyUrl(source);
        if (!result.includes(proxy)) result.push(proxy);
      }
    }
    return result;
  }, [candidates]);
  const sourceKey = sources.join("|");
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => setSourceIndex(0), [sourceKey]);

  const source = sources[sourceIndex];
  if (!source) return null;

  return (
    <NextImage
      src={source}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized
      referrerPolicy="no-referrer"
      onError={() => setSourceIndex((index) => index + 1)}
    />
  );
}

function DetailPosterCard({
  candidates,
  filmName,
  className,
}: {
  candidates: string[];
  filmName: string;
  className?: string;
}) {
  const robustCandidates = useMemo(() => {
    const list: string[] = [];
    candidates.forEach((url) => {
      if (url && !list.includes(url)) {
        list.push(url);
        if (url.startsWith("http")) {
          const wsrv = `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
          if (!list.includes(wsrv)) list.push(wsrv);
          const proxy = `/api/image-proxy?url=${encodeURIComponent(url)}`;
          if (!list.includes(proxy)) list.push(proxy);
        }
      }
    });
    return list;
  }, [candidates]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [robustCandidates]);

  const src = robustCandidates[candidateIdx];

  if (!src) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-neutral-800 to-black">
        <Clapperboard className="w-8 h-8 text-amber-500/80 mb-1" />
        <span className="text-[10px] font-bold text-white leading-tight line-clamp-2">
          {filmName}
        </span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      key={`${filmName}-${candidateIdx}`}
      src={src}
      alt={filmName}
      referrerPolicy="no-referrer"
      loading="eager"
      decoding="async"
      className={className}
      onError={() => {
        if (candidateIdx < robustCandidates.length - 1) {
          setCandidateIdx((i) => i + 1);
        }
      }}
    />
  );
}

function GalleryBackdropCard({
  filePath,
  alt,
}: {
  filePath: string;
  alt: string;
}) {
  const candidateUrls = useMemo(() => {
    const rawList = [
      tmdbBackdrop(filePath, "w780"),
      tmdbBackdrop(filePath, "w1280"),
      tmdbBackdrop(filePath, "original"),
    ].filter((url): url is string => Boolean(url));

    const list: string[] = [];
    rawList.forEach((url) => {
      if (!list.includes(url)) {
        list.push(url);
        const wsrv = `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
        if (!list.includes(wsrv)) list.push(wsrv);
        const proxy = `/api/image-proxy?url=${encodeURIComponent(url)}`;
        if (!list.includes(proxy)) list.push(proxy);
      }
    });
    return list;
  }, [filePath]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  const src = candidateUrls[candidateIdx];

  if (!src) return null;

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-neutral-900 group shadow-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${filePath}-${candidateIdx}`}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        onError={() => {
          if (candidateIdx < candidateUrls.length - 1) {
            setCandidateIdx((i) => i + 1);
          }
        }}
      />
    </div>
  );
}

// ── Cast Card (Only renders actors with actual photos) ──────
function CastCard({
  name,
  role = "Diễn viên",
  profilePath,
  personId,
}: {
  name: string;
  role?: string;
  profilePath?: string | null;
  personId?: number;
}) {
  const cleanName = (name || "")
    .replace(/\(.*?\)/g, "")
    .replace(/[:\-–—].*/g, "")
    .trim();

  const directTmdbUrl = profilePath ? tmdbProfile(profilePath, "w185") : null;

  const { data, isLoading } = useQuery({
    queryKey: ["cast-image-v2", cleanName],
    queryFn: async () => {
      if (directTmdbUrl) return directTmdbUrl;
      const res = await fetch(
        `/api/cast-image?name=${encodeURIComponent(cleanName)}`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.url;
    },
    enabled: !directTmdbUrl && !!cleanName,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const realPhotoUrl =
    directTmdbUrl || (data && data !== "placeholder" ? data : null);

  // If loading, show skeleton pulse
  if (isLoading && !directTmdbUrl) {
    return (
      <div className="flex flex-col items-center space-y-1.5 p-1.5 w-24 md:w-28 flex-shrink-0 animate-pulse">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10" />
        <div className="w-16 h-3 bg-white/10 rounded" />
      </div>
    );
  }

  // Hide actor card completely if no photo is available
  if (!realPhotoUrl) {
    return null;
  }

  const cardContent = (
    <div
      className="flex flex-col items-center text-center space-y-1.5 p-1.5 w-24 md:w-28 flex-shrink-0 group cursor-pointer"
      title={`${cleanName}${role ? ` (${role})` : ""}`}
    >
      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-900 transition-[border-color,transform] duration-200 group-hover:scale-[1.03] group-hover:border-white/30 md:h-20 md:w-20">
        <ResilientDetailImage
          candidates={[realPhotoUrl]}
          alt={cleanName}
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="w-full truncate px-1">
        <p className="truncate text-[11px] font-bold text-white">{cleanName}</p>
        <p className="text-[9px] text-neutral-500 truncate mt-0.5">{role}</p>
      </div>
    </div>
  );

  if (personId) {
    return <Link href={`/actors/${personId}`}>{cardContent}</Link>;
  }

  return cardContent;
}

// ── Server type detection (same logic as watch page) ──
type EpServerType = "vietsub" | "thuyet-minh" | "raw";
function detectEpServerType(serverName: string, lang?: string): EpServerType {
  const name = (serverName || "").toLowerCase();
  const langStr = (lang || "").toLowerCase();
  if (
    name.includes("thuyet minh") ||
    name.includes("thuyết minh") ||
    name.includes("tm") ||
    langStr.includes("thuyet minh") ||
    langStr.includes("thuyết minh") ||
    langStr.includes("lồng tiếng")
  )
    return "thuyet-minh";
  return "vietsub";
}

const EP_TYPE_CONFIG: Record<
  EpServerType,
  { label: string; icon: any; activeCls: string; inactiveCls: string }
> = {
  vietsub: {
    label: "Vietsub",
    icon: Subtitles,
    activeCls: "bg-white/12 border-white/30 text-white",
    inactiveCls: "bg-white/5 border-white/10 text-white/50 hover:text-white",
  },
  "thuyet-minh": {
    label: "Thuyết Minh",
    icon: Mic,
    activeCls: "bg-white/12 border-white/30 text-white",
    inactiveCls: "bg-white/5 border-white/10 text-white/50 hover:text-white",
  },
  raw: {
    label: "Bản Gốc",
    icon: Monitor,
    activeCls: "bg-white/12 border-white/30 text-white",
    inactiveCls: "bg-white/5 border-white/10 text-white/50 hover:text-white",
  },
};

// ── Episode List (Redesigned with server type tabs) ───────────────────────────
function EpisodeList({
  episodes,
  slug,
  filmLang,
}: {
  episodes: any[];
  slug: string;
  filmLang?: string;
}) {
  const [activeType, setActiveType] = useState<EpServerType>("vietsub");
  const [serverIdx, setServerIdx] = useState(0);

  if (!episodes?.length) return null;

  // Group by server type
  const byType: Record<EpServerType, any[]> = {
    vietsub: [],
    "thuyet-minh": [],
    raw: [],
  };
  episodes.forEach((ep) => {
    const t = detectEpServerType(ep.server_name || "", filmLang || "");
    byType[t].push(ep);
  });
  const availableTypes = (
    ["vietsub", "thuyet-minh", "raw"] as EpServerType[]
  ).filter((t) => byType[t].length > 0);

  const currentTypeServers = byType[activeType] || [];
  const activeServer = currentTypeServers[serverIdx] || episodes[0];
  const items = activeServer?.server_data || [];

  const firstEpLink = (ep: any) => `/watch/${slug}?ep=${ep.slug || ep.name}`;

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Danh sách tập ({items.length})
        </h3>
      </div>

      {/* Server Type Tabs */}
      {availableTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((type) => {
            const cfg = EP_TYPE_CONFIG[type];
            const CfgIcon = cfg.icon;
            const isActive = activeType === type;
            return (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  setServerIdx(0);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                  isActive ? cfg.activeCls : cfg.inactiveCls,
                )}
              >
                <CfgIcon size={13} />
                {cfg.label}
                {byType[type].length > 1 && (
                  <span className="text-[10px] font-black bg-white/10 px-1.5 py-0.5 rounded-full">
                    {byType[type].length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Server selection within type */}
      {currentTypeServers.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {currentTypeServers.map((s: any, i: number) => (
            <button
              key={i}
              onClick={() => setServerIdx(i)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all",
                i === serverIdx
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white",
              )}
            >
              Server {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Episode grid */}
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10 gap-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
        {items.map((ep: any, i: number) => (
          <Link
            key={ep.slug || i}
            href={firstEpLink(ep)}
            className={cn(
              "flex items-center justify-center aspect-square rounded-lg",
              "text-xs font-bold transition-all",
              "bg-white/5 text-white/60 border border-white/[0.06]",
              "hover:border-white/30 hover:bg-white/10 hover:text-white",
            )}
          >
            {ep.name.replace(/^tập\s*/i, "")}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Review Item (Plex Card Style) ────────────────────────────
function ReviewItem({ review }: { review: any }) {
  const { t } = useTranslation();

  // Deterministic seed based on review id to make reaction counts look realistic
  const seed = review.id
    ? review.id
        .split("")
        .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    : 12;
  const initLikes = (seed % 12) + 2;
  const initLoves = (seed % 6) + 1;
  const initAgrees = seed % 8;

  const [reactions, setReactions] = useState<{
    like: number;
    love: number;
    agree: number;
    userReacted: "like" | "love" | "agree" | null;
  }>(() => {
    if (typeof window === "undefined") {
      return {
        like: initLikes,
        love: initLoves,
        agree: initAgrees,
        userReacted: null,
      };
    }
    try {
      const saved = localStorage.getItem(`review-react-${review.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          like: initLikes + (parsed.userReacted === "like" ? 1 : 0),
          love: initLoves + (parsed.userReacted === "love" ? 1 : 0),
          agree: initAgrees + (parsed.userReacted === "agree" ? 1 : 0),
          userReacted: parsed.userReacted,
        };
      }
    } catch (_e) {
      /* ignore localStorage errors */
    }
    return {
      like: initLikes,
      love: initLoves,
      agree: initAgrees,
      userReacted: null,
    };
  });

  const handleReact = (type: "like" | "love" | "agree") => {
    setReactions((prev) => {
      let newUserReacted: "like" | "love" | "agree" | null = type;
      let diffLike = 0;
      let diffLove = 0;
      let diffAgree = 0;

      if (prev.userReacted === type) {
        // Toggle off
        newUserReacted = null;
        if (type === "like") diffLike = -1;
        if (type === "love") diffLove = -1;
        if (type === "agree") diffAgree = -1;
      } else {
        // Switch reaction or add new
        if (prev.userReacted === "like") diffLike = -1;
        if (prev.userReacted === "love") diffLove = -1;
        if (prev.userReacted === "agree") diffAgree = -1;

        if (type === "like") diffLike = 1;
        if (type === "love") diffLove = 1;
        if (type === "agree") diffAgree = 1;
      }

      const updated = {
        like: prev.like + diffLike,
        love: prev.love + diffLove,
        agree: prev.agree + diffAgree,
        userReacted: newUserReacted,
      };

      try {
        localStorage.setItem(
          `review-react-${review.id}`,
          JSON.stringify({ userReacted: newUserReacted }),
        );
      } catch (_e) {
        /* ignore localStorage errors */
      }

      return updated;
    });
  };

  return (
    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col space-y-3 hover:border-white/10 transition-colors shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <NextImage
            src={
              review.user?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${review.user?.username || "U"}&background=182027&color=ffffff&size=32`
            }
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-white/10 object-cover"
            unoptimized
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {review.user?.displayName || review.user?.username}
            </p>
            <p className="text-[9px] text-neutral-500">
              {new Date(review.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
        {review.rating && (
          <div className="flex items-center gap-0.5 text-neutral-300 text-xs">
            <Star size={10} fill="currentColor" />
            <span className="font-bold text-white">{review.rating}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed font-medium pl-11">
        {review.content}
      </p>

      {/* Quick Reactions Bar */}
      <div className="flex items-center gap-2 pl-11 pt-2 border-t border-white/[0.02]">
        <button
          onClick={() => handleReact("like")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
            reactions.userReacted === "like"
              ? "bg-white text-black border-white scale-105"
              : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]",
          )}
        >
          <span>👍</span>
          <span>{t("film.like", "Thích")}</span>
          <span className="opacity-60">{reactions.like}</span>
        </button>
        <button
          onClick={() => handleReact("love")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
            reactions.userReacted === "love"
              ? "scale-105 border-white/30 bg-white/10 text-white"
              : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]",
          )}
        >
          <span>❤️</span>
          <span>{t("film.love", "Yêu thích")}</span>
          <span className="opacity-60">{reactions.love}</span>
        </button>
        <button
          onClick={() => handleReact("agree")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
            reactions.userReacted === "agree"
              ? "scale-105 border-white/30 bg-white/10 text-white"
              : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]",
          )}
        >
          <span>💡</span>
          <span>{t("film.agree", "Đồng ý")}</span>
          <span className="opacity-60">{reactions.agree}</span>
        </button>
      </div>
    </div>
  );
}

// ── Write Review ─────────────────────────────────────────────
function WriteReview({ movieId }: { movieId: string }) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="p-6 bg-[#151920]/50 border border-white/5 rounded-2xl shadow-xl h-full flex flex-col items-center justify-center space-y-4 text-center min-h-[160px]">
        <span className="text-neutral-400 text-xs font-semibold">
          Đăng nhập để viết bình luận của bạn
        </span>
        <Link
          href="/login"
          className="rounded-lg bg-white px-6 py-2.5 text-[11px] font-extrabold text-[#111317] transition-colors hover:bg-neutral-200"
        >
          ĐĂNG NHẬP
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await reviewsApi.create({
        movieId,
        content: content.trim(),
        rating: rating || undefined,
      });
      setContent("");
      setRating(0);
      toast("Đã đăng đánh giá thành công!", "success");
    } catch {
      toast("Không thể gửi bình luận", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col justify-between space-y-4 p-6 bg-[#151920]/50 border border-white/5 rounded-2xl shadow-xl h-full min-h-[160px]"
    >
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center space-x-2">
          <NextImage
            src={
              user.avatarUrl ||
              `https://ui-avatars.com/api/?name=${user.username}&background=182027&color=ffffff`
            }
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-white/10 object-cover"
            unoptimized
          />
          <span className="text-xs font-bold text-white">
            {user.displayName || user.username}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
            Đánh giá sao:
          </span>
          <StarRating value={rating} onChange={setRating} size={16} />
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Chia sẻ cảm nhận của bạn về bộ phim này..."
        className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-foreground placeholder:text-neutral-500 transition-colors focus:border-white/30 focus:outline-none"
        rows={3}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="rounded-lg bg-white px-5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[#111317] transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {submitting ? "Đang gửi..." : "Gửi Đánh Giá"}
        </button>
      </div>
    </form>
  );
}

// ── Main Detail Page (Plex Redesign) ──────────────────────────
export default function FilmDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistPending, setWatchlistPending] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [secondaryReady, setSecondaryReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSecondaryReady(true), 650);
    return () => window.clearTimeout(timer);
  }, []);

  // Fetch film detail
  const { data, isLoading, error } = useQuery({
    queryKey: ["film", slug],
    queryFn: () => movieApi.getDetail(slug).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const film = data?.movie || (data?.error ? null : data);
  const episodes = data?.episodes || [];
  const isNotFound =
    !isLoading &&
    (error ||
      !data ||
      data?.error ||
      !film ||
      (!film.name && !film.title && !film.slug));

  const { cleanContent, directors, actors } = useMemo(() => {
    if (!film) return { cleanContent: "", directors: [], actors: [] };
    const parseList = (val: any) => {
      if (!val) return [];
      if (Array.isArray(val))
        return val.filter((v: any) => v && v.trim() !== "");
      if (typeof val === "string")
        return val
          .split(",")
          .map((v: string) => v.trim())
          .filter(Boolean);
      return [];
    };

    const d = parseList(film?.director);
    const a = parseList(film?.actor);

    let content = film?.content || "";
    if (content.includes("-->") && content.length > 1000) {
      return {
        cleanContent: "Đang cập nhật nội dung mô tả cho phim này...",
        directors: d,
        actors: a,
      };
    }

    content = content.replace(/<[^>]*>/g, "");
    return { cleanContent: content, directors: d, actors: a };
  }, [film]);

  // TMDB data
  const {
    backdrops,
    bestBackdrop,
    bestPoster,
    cast: tmdbCast,
    trailer,
  } = useTmdb({
    film,
    enabled: !!film,
    fetchCredits: secondaryReady,
    fetchVideos: secondaryReady || showTrailer,
  });

  // OMDB data — ratings IMDb/RT/Metacritic + awards + box office
  const { omdb } = useOmdb(film, !!film);

  const providerPosterUrl = film
    ? resolveImageUrl(film.poster_url, film.thumb_url) ||
      resolveImageUrl(film.thumb_url)
    : null;
  const providerBackdropUrl = film
    ? resolveImageUrl(film.thumb_url, film.poster_url) ||
      resolveImageUrl(film.poster_url)
    : null;
  const posterUrl =
    providerPosterUrl ||
    (bestPoster ? tmdbPoster(bestPoster.file_path, "w500") : null) ||
    undefined;
  const backdropUrl =
    providerBackdropUrl ||
    (bestBackdrop ? tmdbBackdrop(bestBackdrop.file_path, "w1280") : null) ||
    undefined;
  const tmdbPosterUrl = bestPoster
    ? tmdbPoster(bestPoster.file_path, "w500")
    : null;
  const tmdbBackdropUrl = bestBackdrop
    ? tmdbBackdrop(bestBackdrop.file_path, "w1280")
    : null;

  const heroPosterCandidates = useMemo(() => {
    const list: string[] = [];
    const add = (url?: unknown) => {
      const resolved = resolveImageUrl(url);
      if (resolved && !list.includes(resolved)) list.push(resolved);
    };

    if (tmdbPosterUrl) add(tmdbPosterUrl);
    if (providerPosterUrl) add(providerPosterUrl);
    if (providerBackdropUrl) add(providerBackdropUrl);
    if (tmdbBackdropUrl) add(tmdbBackdropUrl);

    const primary = film?.poster_url || film?.thumb_url;
    if (primary && typeof primary === "string") {
      if (primary.includes("/uploads/movies/")) {
        add(primary.replace("/uploads/movies/", "/upload/vod/"));
      } else if (primary.includes("/upload/vod/")) {
        add(primary.replace("/upload/vod/", "/uploads/movies/"));
      }
    }

    return list;
  }, [film?.poster_url, film?.thumb_url, providerBackdropUrl, providerPosterUrl, tmdbBackdropUrl, tmdbPosterUrl]);

  // Watchlist status check
  useEffect(() => {
    if (!slug || isNotFound) return;

    const syncWatchlistState = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          movieId?: string;
          action?: "add" | "remove";
        }>
      ).detail;
      if (detail?.movieId !== slug) return;
      setInWatchlist(detail.action === "add");
    };

    window.addEventListener("cineverse_watchlist_changed", syncWatchlistState);

    if (!user) {
      setInWatchlist(guestDataStorage.isWatchlisted(slug));
      return () =>
        window.removeEventListener(
          "cineverse_watchlist_changed",
          syncWatchlistState,
        );
    }

    let active = true;
    void watchlistApi
      .check(slug)
      .then((res) => {
        if (active) setInWatchlist(!!res.data?.inWatchlist);
      })
      .catch(() => {});

    return () => {
      active = false;
      window.removeEventListener(
        "cineverse_watchlist_changed",
        syncWatchlistState,
      );
    };
  }, [user, slug, isNotFound]);

  const prefetchWatchData = () => {
    if (isNotFound || !film) return;
    queryClient.prefetchQuery({
      queryKey: ["film-ophim", slug],
      queryFn: () =>
        fetch(`/api/ophim/phim/${slug}`)
          .then((res) => {
            if (!res.ok) return null;
            return res.json();
          })
          .catch(() => null),
      staleTime: 5 * 60 * 1000,
    });
  };

  if (isLoading) return <FilmDetailSkeleton />;

  if (isNotFound || !film) return <FilmNotFound querySlug={slug} />;

  const handleWatchlist = async () => {
    if (watchlistPending) return;
    const previous = inWatchlist;
    const next = !previous;
    const movieData = {
      title: film?.name || film?.title || slug,
      titleEn: film?.origin_name,
      posterUrl,
      thumbUrl: backdropUrl,
      type: film?.type,
      year: film?.year,
    };

    setInWatchlist(next);
    setWatchlistPending(true);
    try {
      if (!user) {
        if (next) guestDataStorage.addWatchlist(slug, movieData);
        else guestDataStorage.removeWatchlist(slug);
      } else if (!next) {
        await watchlistApi.remove(slug);
      } else {
        await watchlistApi.add(slug, movieData);
      }

      if (user) {
        window.dispatchEvent(
          new CustomEvent("cineverse_watchlist_changed", {
            detail: { movieId: slug, action: next ? "add" : "remove" },
          }),
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      await queryClient.invalidateQueries({ queryKey: ["user-watchlist"] });
      toast(next ? "Đã thêm vào Xem sau" : "Đã xóa khỏi Xem sau", "success");
    } catch {
      setInWatchlist(previous);
      toast("Chưa thể cập nhật Xem sau, vui lòng thử lại", "error");
    } finally {
      setWatchlistPending(false);
    }
  };

  const handleRate = async (score: number) => {
    if (!user) {
      toast("Bạn cần đăng nhập để đánh giá", "error");
      return;
    }
    try {
      await ratingsApi.rate(slug, score);
      setMyRating(score);
      toast(`Đã đánh giá ${score} sao!`, "success");
    } catch {
      toast("Không thể gửi đánh giá", "error");
    }
  };

  const firstEp = episodes?.[0]?.server_data?.[0];
  const watchLink = firstEp
    ? `/watch/${slug}?ep=${firstEp.slug || firstEp.name}`
    : `/watch/${slug}`;

  const genres = Array.isArray(film?.category) ? film.category : [];
  const countries = Array.isArray(film?.country) ? film.country : [];
  const episodeCount = episodes.reduce(
    (total: number, server: any) =>
      Math.max(total, server?.server_data?.length || 0),
    0,
  );
  const tmdbRating = Number(
    film?.tmdb?.vote_average || film?.vote_average || film?.rating || 0,
  );
  const tmdbVoteCount = Number(film?.tmdb?.vote_count || film?.vote_count || 0);
  // Prefer OMDB real IMDb rating over provider-provided one
  const imdbRating = Number(
    omdb?.imdbRating ||
    film?.imdb?.vote_average || film?.imdb_rating || film?.imdb?.rating || 0,
  );
  const imdbVoteCount = Number(omdb?.imdbVotes?.replace(/,/g, "") || film?.imdb?.vote_count || 0);
  const tmdbRatingLabel = formatRating(tmdbRating);
  const imdbRatingLabel = formatRating(imdbRating);
  const tmdbVoteLabel = formatVoteCount(tmdbVoteCount);
  const imdbVoteLabel = formatVoteCount(imdbVoteCount);
  const statusLabel =
    film?.status === "completed" ||
    String(film?.episode_current || "")
      .toLowerCase()
      .includes("full")
      ? (lang === "en" ? "Completed" : "Đã hoàn thành")
      : film?.episode_current || (lang === "en" ? "Updating" : "Đang cập nhật");
  const typeLabel =
    film?.type === "series" || film?.type === "tv"
      ? (lang === "en" ? "TV Series" : "Phim Bộ")
      : film?.type === "hoat-hinh"
        ? (lang === "en" ? "Animation" : "Hoạt Hình")
        : (lang === "en" ? "Movie" : "Phim Lẻ");

  const filmName = film?.name || film?.title || slug;
  const originName = film?.origin_name || "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": film?.type === "series" ? "TVSeries" : "Movie",
    name: filmName,
    alternateName: originName,
    description:
      cleanContent ||
      `Xem phim ${filmName} (${originName}) online chất lượng cao Vietsub Thuyết Minh HD full.`,
    image: posterUrl || backdropUrl,
    dateCreated: film?.year ? String(film.year) : undefined,
    genre: genres.map((g: any) => g?.name).filter(Boolean),
    countryOfOrigin: countries.map((c: any) => c?.name).filter(Boolean),
    aggregateRating:
      tmdbRating > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: tmdbRating.toFixed(1),
            bestRating: "10",
            worstRating: "0",
            ratingCount: String(tmdbVoteCount || 1),
          }
        : undefined,
    potentialAction: {
      "@type": "WatchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `https://cineverse-movie.vercel.app/watch/${slug}`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang Chủ",
        item: "https://cineverse-movie.vercel.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: typeLabel,
        item: `https://cineverse-movie.vercel.app/films/${film?.type === "series" ? "series" : "single"}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: filmName,
        item: `https://cineverse-movie.vercel.app/film/${slug}`,
      },
    ],
  };

  const jsonLdPayload = [jsonLd, breadcrumbJsonLd];

  const seoTitle = `${filmName} ${originName ? `(${originName})` : ""} ${film?.year ? `- ${film.year}` : ""} Vietsub HD | CineVerse`;
  const seoDescription = cleanContent
    ? cleanContent.slice(0, 160)
    : `Xem phim ${filmName} (${originName}) chất lượng cao Vietsub Thuyết minh HD miễn phí trên CineVerse.`;

  return (
    <div
      className={`${cardFont.className} relative min-h-screen select-none overflow-hidden bg-[#0d0f12] pb-24 text-foreground`}
    >
      {/* ── JSON-LD STRUCTURED DATA SCHEMA FOR GOOGLE SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdPayload) }}
      />

      {/* ── DYNAMIC HEAD META TAGS (OPEN GRAPH & TWITTER CARDS) ── */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <link
        rel="canonical"
        href={`https://cineverse-movie.vercel.app/film/${slug}`}
      />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta
        property="og:url"
        content={`https://cineverse-movie.vercel.app/film/${slug}`}
      />
      <meta
        property="og:image"
        content={posterUrl || backdropUrl || undefined}
      />
      <meta property="og:type" content="video.movie" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta
        name="twitter:image"
        content={posterUrl || backdropUrl || undefined}
      />
      {/* ── Giant Backdrop Banner (Plex Style Left-to-Right Blended Layout) ── */}
      {(backdropUrl || posterUrl) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[86vh] min-h-[720px] w-full select-none overflow-hidden md:h-[105vh] md:max-h-[1040px]">
          <ResilientDetailImage
            candidates={[
              providerBackdropUrl,
              tmdbBackdropUrl,
              providerPosterUrl,
              tmdbPosterUrl,
              "/images/wp3533664-avengers-infinity-war-4k-wallpapers.jpg",
            ]}
            alt=""
            sizes="100vw"
            className="scale-[1.03] object-cover object-top opacity-55"
            priority
          />
          <div className="absolute inset-0 bg-[#0d0f12]/55" />
          <div className="absolute inset-0 w-full bg-gradient-to-r from-[#0d0f12] via-[#0d0f12]/85 to-[#0d0f12]/20 md:w-[72%]" />
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#0d0f12] via-[#0d0f12]/78 to-transparent" />
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 md:px-12 pt-24 sm:pt-28">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-5 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-all text-xs border border-white/15 shadow-sm active:scale-95 cursor-pointer mr-1"
          >
            <ArrowLeft size={13} />
            <span>{t("watch.back", "Quay lại")}</span>
          </button>
          <Link
            href="/"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            {t("common.goHome", "Trang chủ")}
          </Link>
          <ChevronRightIcon size={12} className="text-neutral-600" />
          {genres[0]?.name && (
            <>
              <Link
                href={`/genre/${genres[0].slug}`}
                className="hover:text-white transition-colors"
              >
                {t(`genres_list.${genres[0].slug}`, genres[0].name)}
              </Link>
              <ChevronRightIcon size={12} className="text-neutral-600" />
            </>
          )}
          {film.year && (
            <>
              <span className="text-neutral-400">{film.year}</span>
              <ChevronRightIcon size={12} className="text-neutral-600" />
            </>
          )}
          {countries[0]?.name && (
            <>
              <Link
                href={`/country/${countries[0].slug}`}
                className="hover:text-white transition-colors"
              >
                {t(`countries_list.${countries[0].slug}`, countries[0].name)}
              </Link>
              <ChevronRightIcon size={12} className="text-neutral-600" />
            </>
          )}
          <span className="max-w-xs truncate font-bold text-neutral-200">
            {film.name}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col space-y-4 md:space-y-5">
            <div className="flex gap-4 sm:gap-6 items-start">
              <div className="lg:hidden w-28 sm:w-36 aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden border border-white/15 bg-neutral-900 shadow-2xl flex-shrink-0 relative group">
                <DetailPosterCard
                  candidates={heroPosterCandidates}
                  filmName={film.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col space-y-2 sm:space-y-3 min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-snug drop-shadow-xl line-clamp-3">
                  {film.name}
                </h1>

                {film.origin_name && (
                  <p className="text-xs sm:text-base text-neutral-300 font-medium tracking-wide italic line-clamp-2">
                    {film.origin_name}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-bold pt-1">
                  {film.quality && (
                    <span className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-neutral-200">
                      {film.quality}
                    </span>
                  )}
                  {film.lang && (
                    <span className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-neutral-200">
                      {film.lang}
                    </span>
                  )}
                  {film.year && (
                    <span className="bg-white/10 text-neutral-300 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold">
                      {film.year}
                    </span>
                  )}
                  {film.time && (
                    <span className="bg-white/10 text-neutral-300 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold">
                      {film.time}
                    </span>
                  )}
                  {tmdbRatingLabel && (
                    <span
                      className="rounded-md border border-white/15 bg-black/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-neutral-200"
                      title={
                        tmdbVoteCount > 0
                          ? `${tmdbVoteCount.toLocaleString("vi-VN")} ${t("film.votes", "lượt đánh giá trên TMDB")}`
                          : t("film.tmdbScore", "Điểm TMDB")
                      }
                    >
                      <span className="text-neutral-500">TMDB</span>{" "}
                      {tmdbRatingLabel}/10
                    </span>
                  )}
                  {imdbRatingLabel && (
                    <span
                      className="rounded-md border border-white/15 bg-black/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-neutral-200"
                      title={
                        imdbVoteCount > 0
                          ? `${imdbVoteCount.toLocaleString("vi-VN")} ${t("film.votes", "lượt đánh giá trên IMDb")}`
                          : t("film.imdbScore", "Điểm IMDb")
                      }
                    >
                      <span className="text-neutral-500">IMDb</span>{" "}
                      {imdbRatingLabel}/10
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={watchLink}
                className="flex items-center space-x-2 rounded-full bg-white px-7 py-2.5 text-xs font-extrabold text-[#111317] transition-colors hover:bg-neutral-200 active:scale-[0.98] sm:py-3"
                onMouseEnter={prefetchWatchData}
              >
                <Play size={14} fill="currentColor" />
                <span>{t("watch.watchFilm", "Xem phim")}</span>
              </Link>

              <button
                onClick={() => setShowTrailer(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 sm:py-3 rounded-full font-bold tracking-wider uppercase text-xs border border-white/15 backdrop-blur-md transition-colors cursor-pointer active:scale-95"
              >
                {t("film.trailer", "Trailer")}
              </button>

              <div className="flex items-center space-x-3 ml-2">
                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={handleWatchlist}
                    disabled={watchlistPending}
                    aria-pressed={inWatchlist}
                    aria-label={
                      inWatchlist ? t("film.removeFromWatchlist", "Xóa khỏi Xem sau") : t("film.addToWatchlist", "Thêm vào Xem sau")
                    }
                    className={cn(
                      "w-9 h-9 rounded-full border flex items-center justify-center backdrop-blur-md transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60",
                      inWatchlist
                        ? "border-white/30 bg-white/10 text-white"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:border-white/30",
                    )}
                  >
                    {inWatchlist ? (
                      <Check size={15} className="stroke-[3]" />
                    ) : (
                      <Plus size={15} />
                    )}
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("nav.watchlist", "Watchlist")}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => {
                      if (!user) {
                        toast(t("toast.loginToTrack", "Bạn cần đăng nhập để theo dõi tập mới"), "error");
                        return;
                      }
                      toast(
                        t("toast.subscribed", `Đã đăng ký nhận thông báo khi có tập mới của ${film?.name}!`),
                        "success",
                      );
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                  >
                    <Bell size={15} />
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("watch.follow", "Theo dõi")}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => handleRate(5)}
                    className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-md transition-all text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <Star
                      size={15}
                      fill={myRating ? "currentColor" : "none"}
                      className={cn(myRating ? "text-white" : "")}
                    />
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("watch.rate", "Đánh giá")}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 group">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast(
                        t(
                          "film.copiedLink",
                          "Đã sao chép liên kết phim vào bộ nhớ tạm!",
                        ),
                        "success",
                      );
                    }}
                    className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-md transition-all text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <Share2 size={15} />
                  </button>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider group-hover:text-neutral-300 transition-colors">
                    {t("film.share", "Chia sẻ")}
                  </span>
                </div>
              </div>
            </div>

            {/* ── OMDB Ratings (below action buttons) ── */}
            {omdb && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3">
                {/* IMDb chip */}
                {omdb.imdbRating && (
                  <a
                    href={omdb.imdbId ? `https://www.imdb.com/title/${omdb.imdbId}` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1.5 rounded-lg border border-[#f5c518]/25 bg-[#f5c518]/8 px-2.5 py-1.5 hover:border-[#f5c518]/50 transition-all"
                  >
                    <svg viewBox="0 0 64 32" width="32" height="16" aria-label="IMDb">
                      <rect width="64" height="32" rx="4" fill="#F5C518"/>
                      <text x="5" y="23" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="20" fill="#000">IMDb</text>
                    </svg>
                    <span className="text-xs font-black text-white">
                      {omdb.imdbRating}<span className="text-neutral-500 font-normal">/10</span>
                    </span>
                    {omdb.imdbVotes && (
                      <span className="text-[10px] text-neutral-500 hidden sm:inline">({omdb.imdbVotes})</span>
                    )}
                  </a>
                )}

                {/* RT chip */}
                {omdb.rottenTomatoes && (() => {
                  const pct = parseInt(omdb.rottenTomatoes!);
                  const isFresh = pct >= 60;
                  return (
                    <div className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
                      isFresh ? "border-red-500/25 bg-red-500/8" : "border-white/10 bg-white/[0.03]"
                    )}>
                      <svg viewBox="0 0 32 32" width="15" height="15" aria-label="Rotten Tomatoes">
                        {isFresh ? (
                          <>
                            <circle cx="16" cy="18" r="12" fill="#FA320A"/>
                            <ellipse cx="16" cy="8" rx="4" ry="6" fill="#22C55E"/>
                            <ellipse cx="20" cy="6" rx="2.5" ry="5" fill="#16A34A" transform="rotate(20 20 6)"/>
                            <circle cx="12" cy="20" r="3" fill="#fff" opacity="0.25"/>
                          </>
                        ) : (
                          <>
                            <circle cx="16" cy="16" r="13" fill="#6B7280"/>
                            <text x="16" y="21" textAnchor="middle" fontFamily="sans-serif" fontSize="14" fill="#fff" fontWeight="bold">☔</text>
                          </>
                        )}
                      </svg>
                      <span className={cn("text-xs font-black", isFresh ? "text-red-400" : "text-neutral-400")}>
                        {omdb.rottenTomatoes}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-px rounded-full",
                        isFresh ? "bg-red-500/20 text-red-400" : "bg-neutral-700/60 text-neutral-500"
                      )}>
                        {isFresh ? "Tươi" : "Héo"}
                      </span>
                    </div>
                  );
                })()}

                {/* Metacritic chip */}
                {omdb.metacritic && (() => {
                  const score = parseInt(omdb.metacritic!);
                  const color = score >= 61 ? "#43d45a" : score >= 40 ? "#ffbd3f" : "#ff4c4c";
                  return (
                    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                      <span
                        className="text-[10px] font-black w-7 h-6 rounded flex items-center justify-center leading-none"
                        style={{ background: color, color: "#000" }}
                      >
                        {score}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400">Điểm MC</span>
                    </div>
                  );
                })()}

                {/* Awards */}
                {omdb.awards && (
                  <div className="flex items-center gap-1.5 w-full mt-0.5">
                    <Trophy size={11} className="text-amber-400 shrink-0" />
                    <span className="text-[11px] text-neutral-500 leading-snug line-clamp-2">{omdb.awards}</span>
                  </div>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-600 w-full">
                  {omdb.boxOffice && (
                    <span className="flex items-center gap-1">
                      <DollarSign size={10} />
                      <span className="text-neutral-500">{omdb.boxOffice}</span>
                    </span>
                  )}
                  {omdb.rated && (
                    <span className="border border-white/15 text-neutral-500 px-1.5 py-px rounded text-[10px] font-bold tracking-wider">
                      {omdb.rated}
                    </span>
                  )}
                  {omdb.language && (
                    <span className="flex items-center gap-1">
                      <Globe size={10} />
                      <span>{omdb.language?.split(", ").map((l: string) => ({
                        English: "Tiếng Anh", Spanish: "Tiếng Tây Ban Nha",
                        French: "Tiếng Pháp", German: "Tiếng Đức",
                        Korean: "Tiếng Hàn", Japanese: "Tiếng Nhật",
                        Chinese: "Tiếng Trung", Vietnamese: "Tiếng Việt",
                        Thai: "Tiếng Thái", Portuguese: "Tiếng Bồ Đào Nha",
                        Italian: "Tiếng Ý", Russian: "Tiếng Nga",
                        Arabic: "Tiếng Ả Rập", Hindi: "Tiếng Hindi",
                        Polish: "Tiếng Ba Lan", Turkish: "Tiếng Thổ Nhĩ Kỳ",
                      }[l] || l)).join(", ")}</span>
                    </span>
                  )}
                  {omdb.country && (
                    <span>· {omdb.country?.split(", ").map((c: string) => ({
                      "United States": "Mỹ", "United Kingdom": "Anh",
                      Canada: "Canada", Australia: "Úc",
                      France: "Pháp", Germany: "Đức",
                      Japan: "Nhật Bản", "South Korea": "Hàn Quốc",
                      China: "Trung Quốc", Vietnam: "Việt Nam",
                      India: "Ấn Độ", Italy: "Ý",
                      Spain: "Tây Ban Nha", Russia: "Nga",
                      "New Zealand": "New Zealand", Thailand: "Thái Lan",
                    }[c] || c)).join(", ")}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 hidden lg:flex justify-end">
            <div className="w-64 aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 bg-neutral-950/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative group">
              <DetailPosterCard
                candidates={heroPosterCandidates}
                filmName={film.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <section
            aria-label={t("home.details", "Thông tin phim")}
            className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-white/10 bg-[#0d0f12]/65 shadow-[0_14px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:grid-cols-3 sm:divide-x sm:divide-white/10"
          >
            <div className="border-b border-r border-white/10 px-3.5 py-3 sm:border-b-0 sm:border-r-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {t("film.genres", "Thể loại")}
                </h2>
                <span className="text-[10px] font-semibold text-neutral-600">
                  {genres.length}
                </span>
              </div>
              <div className="flex min-h-6 flex-wrap items-center gap-1.5">
                {genres.length > 0 ? (
                  genres.map((genre: any) => (
                    <Link
                      key={genre.slug || genre.name}
                      href={genre.slug ? `/genre/${genre.slug}` : "#"}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-neutral-300 transition-colors hover:border-white/20 hover:text-white"
                    >
                      {t(`genres_list.${genre.slug}`, genre.name)}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500">
                    {t("common.noData", "Đang cập nhật")}
                  </span>
                )}
              </div>
            </div>

            <div className="border-b border-white/10 px-3.5 py-3 sm:border-b-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {t("film.country", "Quốc gia")}
                </h2>
                <span className="text-[10px] font-semibold text-neutral-600">
                  {countries.length}
                </span>
              </div>
              <div className="flex min-h-6 flex-wrap items-center gap-1.5">
                {countries.length > 0 ? (
                  countries.map((country: any) => (
                    <Link
                      key={country.slug || country.name}
                      href={country.slug ? `/country/${country.slug}` : "#"}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-neutral-300 transition-colors hover:border-white/20 hover:text-white"
                    >
                      {t(`countries_list.${country.slug}`, country.name)}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500">
                    {t("common.noData", "Đang cập nhật")}
                  </span>
                )}
              </div>
            </div>

            <div className="col-span-2 px-3.5 py-3 sm:col-span-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {t("home.details", "Thông tin")}
                </h2>
                <span className="max-w-[55%] truncate rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-semibold text-neutral-400">
                  {statusLabel}
                </span>
              </div>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">{t("film.duration", "Thời lượng")}</dt>
                  <dd className="truncate font-semibold text-neutral-200">
                    {film.time || t("film.defaultDuration", "22 phút/tập")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">{t("film.episodes", "Tập hiện tại")}</dt>
                  <dd className="truncate font-semibold text-neutral-200">
                    {film.episode_current ||
                      (episodeCount ? t("film.episodeCount", `Tập ${episodeCount}`) : "Full")}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {(directors.length > 0 ||
            actors.length > 0 ||
            (tmdbCast && tmdbCast.length > 0)) && (
            <section className="space-y-3" aria-labelledby="film-credits-title">
              <h2
                id="film-credits-title"
                className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2"
              >
                <span>{t("film.cast", "Đạo diễn và diễn viên")}</span>
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
                {directors.map((director, idx) => (
                  <CastCard
                    key={`director-${director}-${idx}`}
                    name={director}
                    role={t("film.director", "Đạo diễn")}
                  />
                ))}
                {tmdbCast && tmdbCast.length > 0
                  ? tmdbCast.map((c) => (
                      <CastCard
                        key={`tmdb-cast-${c.id}`}
                        name={c.name}
                        role={c.character || t("film.castMember", "Diễn viên")}
                        profilePath={c.profile_path}
                        personId={c.id}
                      />
                    ))
                  : actors.map((actor, idx) => (
                      <CastCard
                        key={`actor-${actor}-${idx}`}
                        name={actor}
                        role={t("film.characters", "Diễn viên")}
                      />
                    ))}
              </div>
            </section>
          )}

          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
              <span>{t("film.synopsis", "Nội dung phim")}</span>
            </h2>

            {film.origin_name && (
              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                <span className="font-bold text-white mr-1.5">{t("film.originName", "Tên gốc")}:</span>
                <span>{film.origin_name}</span>
              </p>
            )}

            {cleanContent && (
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal max-w-4xl">
                {cleanContent}
              </p>
            )}
          </section>



          <section className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
              <span>{t("film.tags", "Từ khóa")}</span>
              <span className="ml-2 text-xs font-normal text-neutral-400">
                ({genres.length + 2} {t("film.tagsCount", "từ khóa")})
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {genres.map((g: any) => (
                <span
                  key={g.slug || g.name}
                  className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-md text-xs font-medium hover:border-white/20 transition-colors cursor-pointer"
                >
                  {g.slug || g.name.toLowerCase()}
                </span>
              ))}
              <span className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-md text-xs font-medium">
                anime
              </span>
              <span className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 rounded-md text-xs font-medium">
                fantasy
              </span>
            </div>
          </section>

          {backdrops && backdrops.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-white/5">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
                <span>{t("film.gallery", "Hình ảnh")}</span>
                <span className="ml-2 text-xs font-normal text-neutral-400">
                  ({backdrops.length} {t("film.imagesCount", "ảnh")})
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {backdrops.slice(0, 8).map((bg, idx) => (
                  <GalleryBackdropCard
                    key={`${bg.file_path}-${idx}`}
                    filePath={bg.file_path}
                    alt={`Ảnh phim ${idx + 1}`}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Trailer Video Modal */}
      <TrailerModal
        isOpen={showTrailer}
        onClose={() => setShowTrailer(false)}
        film={film}
        filmName={film?.name || ""}
        trailerUrl={film?.trailer_url}
        tmdbVideoKey={trailer?.key}
      />
    </div>
  );
}

function FilmDetailSkeleton() {
  return (
    <div className="relative min-h-screen bg-black pb-24 text-white">
      <div className="absolute inset-x-0 top-0 h-[65vh] overflow-hidden md:h-[82vh]">
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#161b22] via-[#0d1015] to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="container relative z-10 mx-auto px-4 pt-24 md:px-12 sm:pt-28">
        <div className="animate-pulse">
          <div className="mb-5 h-7 w-72 rounded-full bg-white/[0.07]" />

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-8">
              <div className="h-11 w-4/5 rounded-lg bg-white/10 sm:h-14 md:h-16" />
              <div className="h-4 w-2/5 rounded bg-white/[0.07]" />
              <div className="flex gap-2">
                {[72, 104, 56, 88].map((width, index) => (
                  <div
                    key={index}
                    className="h-6 rounded-md bg-white/[0.08]"
                    style={{ width }}
                  />
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <div className="h-11 w-32 rounded-full bg-white/15" />
                <div className="h-11 w-24 rounded-full bg-white/[0.08]" />
                <div className="h-11 w-32 rounded-full bg-white/[0.05]" />
              </div>
            </div>

            <div className="hidden justify-end lg:col-span-4 lg:flex">
              <div className="aspect-[2/3] w-64 rounded-2xl border border-white/[0.08] bg-white/[0.07]" />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-28 rounded-xl border border-white/[0.07] bg-white/[0.035] p-4"
              >
                <div className="h-3 w-20 rounded bg-white/[0.08]" />
                <div className="mt-5 h-4 w-3/4 rounded bg-white/[0.06]" />
                <div className="mt-2 h-3 w-1/2 rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="h-64 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="h-5 w-36 rounded bg-white/[0.08]" />
              <div className="mt-5 h-3 w-full rounded bg-white/[0.055]" />
              <div className="mt-3 h-3 w-11/12 rounded bg-white/[0.055]" />
              <div className="mt-3 h-3 w-4/5 rounded bg-white/[0.055]" />
            </div>
            <div className="h-64 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="h-5 w-28 rounded bg-white/[0.08]" />
              <div className="mt-5 grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, index) => (
                  <div
                    key={index}
                    className="h-9 rounded-lg bg-white/[0.055]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
