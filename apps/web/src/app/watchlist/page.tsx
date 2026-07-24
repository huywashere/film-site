"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, FolderOpen, Loader2 } from "lucide-react";
import { watchlistApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
} from "@/components/film/FilmCard";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

function WatchlistContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") || 1);

  const { data, isLoading } = useQuery({
    queryKey: ["watchlist", page],
    queryFn: () => watchlistApi.get(page).then((r) => r.data),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-md flex flex-col items-center justify-center space-y-4">
        <Bookmark
          size={48}
          className="text-neutral-500 opacity-40 animate-pulse"
        />
        <h2 className="text-xl font-bold text-foreground">
          Bạn chưa đăng nhập
        </h2>
        <p className="text-xs text-muted-foreground">
          Vui lòng đăng nhập tài khoản để xem danh sách phim yêu thích cá nhân
          của bạn.
        </p>
        <Link
          href="/login"
          className="bg-netflixRed hover:bg-[#C11119] text-white font-bold text-xs px-6 py-2.5 rounded transition-all"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const items = data?.items || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-24 pb-16">
      <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-foreground flex items-center space-x-2 tracking-wide">
          <Bookmark size={28} className="text-netflixRed fill-netflixRed/10" />
          <span>Watchlist của tôi</span>
        </h1>
        {data?.total > 0 && (
          <span className="bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full border border-border">
            {data.total} phim
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <FilmCardSkeleton key={i} hideDetails={false} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
          <FolderOpen size={54} className="text-neutral-500 opacity-30" />
          <h3 className="text-lg font-bold">
            Chưa có phim nào trong Watchlist
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Danh sách lưu trữ phim yêu thích của bạn hiện đang trống. Hãy khám
            phá kho phim khổng lồ của chúng tôi để thêm những bộ phim bạn yêu
            thích vào đây nhé!
          </p>
          <Link
            href="/"
            className="inline-flex bg-netflixRed hover:bg-[#C11119] text-white font-bold text-xs px-6 py-3 rounded shadow transition-all pt-2.5"
          >
            Khám phá phim ngay
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
            {items.map((item: any) => {
              const film: FilmItem = {
                slug: item.movie.id,
                name: item.movie.title,
                thumb_url: item.movie.thumbUrl || item.movie.posterUrl,
                year: item.movie.year,
                type: item.movie.type,
              };
              return <FilmCard key={item.id} film={film} />;
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-1.5 pt-10">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={cn(
                    "w-9 h-9 rounded text-xs font-bold border transition-colors flex items-center justify-center",
                    p === page
                      ? "bg-netflixRed border-netflixRed text-white"
                      : "bg-card border-border text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => router.push(`/watchlist?page=${p}`)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-24 text-center">
          <Loader2
            className="animate-spin text-netflixRed mx-auto mb-2"
            size={32}
          />
          <p className="text-neutral-400 text-sm">Đang tải watchlist...</p>
        </div>
      }
    >
      <WatchlistContent />
    </Suspense>
  );
}
