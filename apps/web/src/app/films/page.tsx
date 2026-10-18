import type { Metadata } from "next";
import BrowseFilmsClient from "./BrowseFilmsClient";
import { getInitialBrowseCatalog } from "@/lib/server-catalog";
import { headers } from "next/headers";
import { buildSeoMetadata } from "@/lib/seo";

type QueryValue = string | string[] | undefined;
type BrowseFilmsPageProps = {
  searchParams: Promise<Record<string, QueryValue>>;
};

function first(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value: QueryValue): number {
  const parsed = Number(first(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  searchParams,
}: BrowseFilmsPageProps): Promise<Metadata> {
  const query = await searchParams;
  const keyword = first(query.q) || first(query.search);

  let title = "Khám Phá & Duyệt Kho Phim | FlexPhim";
  let description =
    "Duyệt kho phim chất lượng cao với bộ lọc đa tầng theo thể loại, quốc gia, năm phát hành và định dạng tại FlexPhim.";

  if (keyword) {
    title = `Tìm kiếm phim: "${keyword}" | FlexPhim`;
    description = `Kết quả tìm kiếm cho "${keyword}" trên FlexPhim — Xem phim online tốc độ cao Full HD Vietsub.`;
  }

  return buildSeoMetadata({
    title,
    description,
    path: "/films",
    keywords: ["kho phim", "duyệt phim", "bộ lọc phim", "FlexPhim", "xem phim online"],
  });
}

export default async function BrowseFilmsPage({
  searchParams,
}: BrowseFilmsPageProps) {
  const [query, requestHeaders] = await Promise.all([searchParams, headers()]);
  const page = normalizePage(query.page);
  const keyword = first(query.q) || first(query.search);
  const initialData = keyword || requestHeaders.get("rsc") === "1"
    ? null
    : await getInitialBrowseCatalog(
        first(query.type),
        first(query.genre) || first(query.category),
        first(query.country),
        page,
      );

  return (
    <BrowseFilmsClient
      initialData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
