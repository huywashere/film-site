import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GenrePageClient from "./GenrePageClient";
import { getInitialGenreCatalog } from "@/lib/server-catalog";
import { headers } from "next/headers";
import { buildSeoMetadata } from "@/lib/seo";

type GenrePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

const GENRE_NAMES: Record<string, string> = {
  "hanh-dong": "Hành Động",
  "tinh-cam": "Tình Cảm",
  "kinh-di": "Kinh Dị",
  "vien-tuong": "Khoa Học Viễn Tưởng",
  "co-trang": "Cổ Trang",
  "hai-huoc": "Hài Hước",
  "tam-ly": "Tâm Lý",
  "hinh-su": "Hình Sự",
  "chien-tranh": "Chiến Tranh & Lịch Sử",
  "hoc-duong": "Học Đường",
  "phieu-luu": "Phiêu Lưu",
  "bi-an": "Bí Ẩn",
  "gia-dinh": "Gia Đình",
  "vo-thuat": "Võ Thuật",
  "tai-lieu": "Tài Liệu",
  "hoat-hinh": "Hoạt Hình",
  "chinh-kich": "Chính Kịch",
  "tre-em": "Trẻ Em (Kids)",
  "gia-tuong": "Phim Giả Tưởng",
  "khoa-hoc-vu-tru": "Khoa Học Vũ Trụ",
};

function normalizePage(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  params,
}: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "khoa-hoc-vu-tru" || slug === "star-wars") {
    redirect("/universe/khoa-hoc-vu-tru");
  }
  const name =
    GENRE_NAMES[slug] ||
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return buildSeoMetadata({
    title: `Phim ${name} Hay Nhất — Tuyển Chọn Mới | FlexPhim`,
    description: `Khám phá kho phim ${name} chất lượng cao Full HD Vietsub thuyết minh mới nhất tại FlexPhim.`,
    path: `/genre/${slug}`,
    keywords: [`phim ${name}`, `phim ${name} hay`, name, "FlexPhim", "xem phim online"],
  });
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const [{ slug }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);
  if (slug === "khoa-hoc-vu-tru" || slug === "star-wars") {
    redirect("/universe/khoa-hoc-vu-tru");
  }
  const page = normalizePage(query.page);
  const initialData =
    requestHeaders.get("rsc") === "1"
      ? null
      : await getInitialGenreCatalog(slug, page);

  return (
    <GenrePageClient
      initialData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
