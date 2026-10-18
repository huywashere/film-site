import type { Metadata } from "next";
import FilmsTypeClient from "./FilmsTypeClient";
import { getInitialFilmCatalog } from "@/lib/server-catalog";
import { headers } from "next/headers";
import { buildSeoMetadata } from "@/lib/seo";

type FilmsTypePageProps = {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

const TYPE_CONFIG: Record<
  string,
  {
    title: string;
    description: string;
    imageUrl?: string;
    keywords: string[];
  }
> = {
  series: {
    title: "Phim Bộ Chọn Lọc Mới Nhất | FlexPhim",
    description:
      "Tuyển tập phim bộ Hàn Quốc, Trung Quốc, Âu Mỹ, Thái Lan cập nhật liên tục tập mới chất lượng cao Full HD Vietsub Thuyết minh.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/5fhS6Bh4VnF0SOZyZnhNpc0XHDb.jpg",
    keywords: ["phim bộ", "phim bo hay", "phim hàn quốc", "phim trung quốc", "phim truyền hình", "FlexPhim"],
  },
  single: {
    title: "Phim Lẻ & Bom Tấn Chiếu Rạp Mới Nhất | FlexPhim",
    description:
      "Tổng hợp phim lẻ, phim bom tấn chiếu rạp Hollywood, Châu Á chất lượng cao Full HD Vietsub Thuyết minh miễn phí.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    keywords: ["phim lẻ", "phim chiếu rạp", "bom tấn", "phim hành động", "phim lẻ hay", "FlexPhim"],
  },
  anime: {
    title: "Kho Phim Hoạt Hình & Anime Vietsub Mới Nhất | FlexPhim",
    description:
      "Khám phá thế giới anime Nhật Bản, hoạt hình 3D, movie chiếu rạp bom tấn cập nhật nhanh nhất chất lượng cao tại FlexPhim.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg",
    keywords: ["anime", "hoạt hình", "anime vietsub", "hoat hinh 3d", "anime hay", "FlexPhim"],
  },
  tvshows: {
    title: "TV Shows & Chương Trình Truyền Hình Thực Tế | FlexPhim",
    description:
      "Tuyển tập gameshow, truyền hình thực tế, talkshow đặc sắc trong và ngoài nước chất lượng cao Full HD.",
    keywords: ["tv shows", "gameshow", "truyền hình thực tế", "talkshow", "FlexPhim"],
  },
};

function normalizePage(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  params,
}: FilmsTypePageProps): Promise<Metadata> {
  const { type } = await params;
  const config = TYPE_CONFIG[type] || {
    title: `Danh Sách Phim ${type} | FlexPhim`,
    description: `Khám phá danh sách phim ${type} chất lượng cao Full HD Vietsub tại FlexPhim.`,
    keywords: [type, "phim online", "FlexPhim"],
  };

  return buildSeoMetadata({
    title: config.title,
    description: config.description,
    path: `/films/${type}`,
    imageUrl: config.imageUrl,
    imageAlt: config.title,
    keywords: config.keywords,
  });
}

export default async function FilmsTypePage({
  params,
  searchParams,
}: FilmsTypePageProps) {
  const [{ type }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);
  const page = normalizePage(query.page);
  const initialData =
    requestHeaders.get("rsc") === "1"
      ? null
      : await getInitialFilmCatalog(type, page);

  return (
    <FilmsTypeClient
      type={type}
      page={page}
      initialData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
