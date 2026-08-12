"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { movieApi } from "@/lib/api";
import {
  FilmCard,
  FilmItem,
  FilmCardSkeleton,
} from "@/components/film/FilmCard";
import { Pagination } from "@/components/film/Pagination";
import { cardFont } from "@/lib/fonts";

const GENRE_NAMES: Record<string, string> = {
  "bi-an": "Bí Ẩn",
  "chien-tranh": "Chiến Tranh",
  "chinh-kich": "Chính Kịch",
  "co-trang": "Cổ Trang",
  "gia-dinh": "Gia Đình",
  "hai-huoc": "Hài Hước",
  "hanh-dong": "Hành Động",
  "hinh-su": "Hình Sự",
  "hoc-duong": "Học Đường",
  "khoa-hoc": "Khoa Học",
  "kinh-di": "Kinh Dị",
  "kinh-dien": "Kinh Điển",
  "lich-su": "Lịch Sử",
  "mien-tay": "Miền Tây",
  "phim-18": "Phim 18+",
  "phim-ngan": "Phim Ngắn",
  "phieu-luu": "Phiêu Lưu",
  "than-thoai": "Thần Thoại",
  "the-thao": "Thể Thao",
  "tre-em": "Trẻ Em",
  "tai-lieu": "Tài Liệu",
  "tam-ly": "Tâm Lý",
  "tinh-cam": "Tình Cảm",
  "vien-tuong": "Viễn Tưởng",
  "vo-thuat": "Võ Thuật",
  "am-nhac": "Âm Nhạc",
};

export default function GenrePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const page = Number(searchParams.get("page") || 1);
  const label = GENRE_NAMES[slug] || slug;

  const { data, isLoading } = useQuery({
    queryKey: ["genre", slug, page],
    queryFn: () => movieApi.getByGenre(slug, page).then((r) => r.data),
  });

  const films: FilmItem[] = data?.data?.items || data?.items || [];

  const rawTotal =
    data?.data?.params?.pagination?.totalPages ||
    data?.params?.pagination?.totalPages ||
    data?.pagination?.totalPages ||
    data?.paginate?.total_page ||
    data?.data?.paginate?.total_page ||
    (data?.data?.params?.pagination?.totalItems
      ? Math.ceil(
          data.data.params.pagination.totalItems /
            (data.data.params.pagination.totalItemsPerPage || 24),
        )
      : undefined);

  const totalPages =
    rawTotal && rawTotal > 1 ? rawTotal : films.length > 0 ? 50 : 1;
  const totalItems =
    data?.data?.params?.pagination?.totalItems || data?.pagination?.totalItems;

  const handlePageChange = (newPage: number) => {
    router.push(`/genre/${slug}?page=${newPage}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`${cardFont.className} min-h-screen w-full bg-background pb-20 pl-4 pr-4 pt-20 text-foreground sm:pt-24 md:pr-10 lg:pl-24`}>
      {/* Page Header — Centered */}
      <div className="flex flex-col items-center justify-center text-center mb-10 pb-6 border-b border-white/10 gap-2.5 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Thể Loại: {label}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 font-medium">
          Tổng hợp danh sách các bộ phim thuộc thể loại {label} hay nhất
        </p>
        <div className="mt-1 text-xs font-mono font-bold text-neutral-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
          Trang <span className="text-white font-extrabold">{page}</span> /{" "}
          {totalPages}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>
      ) : films.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6">
          {films.map((f, idx) => (
            <FilmCard key={`${f.slug || f._id || (f as any).id}-${idx}`} film={f} priority={idx < 8} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
          Chưa tìm thấy bộ phim nào thuộc thể loại này.
        </div>
      )}

      {/* Pagination Controls */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
