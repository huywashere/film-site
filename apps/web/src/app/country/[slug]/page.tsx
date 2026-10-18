import type { Metadata } from "next";
import CountryPageClient from "./CountryPageClient";
import { getInitialCountryCatalog } from "@/lib/server-catalog";
import { headers } from "next/headers";
import { buildSeoMetadata } from "@/lib/seo";

type CountryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string | string[];
    category?: string | string[];
  }>;
};

const COUNTRY_CONFIG: Record<
  string,
  {
    name: string;
    description: string;
    imageUrl?: string;
  }
> = {
  "han-quoc": {
    name: "Phim Hàn Quốc",
    description:
      "Kho phim Hàn Quốc (K-Drama) mới nhất, phim truyền hình lãng mạn, phim chiếu rạp gay cấn chất lượng cao Full HD Vietsub Thuyết minh.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/wcP3FsRLog4GNEs9PFrDKKQdcof.jpg",
  },
  "trung-quoc": {
    name: "Phim Trung Quốc",
    description:
      "Tuyển tập phim Trung Quốc (C-Drama), phim cổ trang, ngôn tình, kiếm hiệp, hiện đại chất lượng Full HD vietsub mới nhất.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/5fhS6Bh4VnF0SOZyZnhNpc0XHDb.jpg",
  },
  "au-my": {
    name: "Phim Âu Mỹ",
    description:
      "Tổng hợp bom tấn điện ảnh Hollywood, phim truyền hình US-UK đỉnh cao với phụ đề tiếng Việt và thuyết minh chuẩn.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
  },
  "nhat-ban": {
    name: "Phim Nhật Bản",
    description:
      "Khám phá điện ảnh Nhật Bản, live-action, anime và phim nghệ thuật đặc sắc chất lượng cao.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg",
  },
  "thai-lan": {
    name: "Phim Thái Lan",
    description:
      "Kho phim Thái Lan hài hước, kinh dị, học đường, tình cảm đặc sắc cập nhật nhanh nhất.",
  },
  "viet-nam": {
    name: "Phim Việt Nam",
    description:
      "Phim điện ảnh Việt Nam chiếu rạp, phim bộ truyền hình Việt Nam chất lượng cao.",
  },
};

function normalizePage(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  params,
}: CountryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = COUNTRY_CONFIG[slug];
  const name =
    config?.name ||
    `Phim ${slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")}`;
  const description =
    config?.description ||
    `Xem kho ${name} chất lượng cao Full HD Vietsub thuyết minh mới nhất tại FlexPhim.`;

  return buildSeoMetadata({
    title: `${name} Hay Nhất — Cập Nhật Mới | FlexPhim`,
    description,
    path: `/country/${slug}`,
    imageUrl: config?.imageUrl,
    imageAlt: name,
    keywords: [name, `${name} hay`, "FlexPhim", "xem phim online"],
  });
}

export default async function CountryPage({ params, searchParams }: CountryPageProps) {
  const [{ slug }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);
  const page = normalizePage(query.page);
  const category = Array.isArray(query.category)
    ? query.category[0]
    : query.category;
  const initialData = category || requestHeaders.get("rsc") === "1"
    ? null
    : await getInitialCountryCatalog(slug, page);

  return (
    <CountryPageClient
      initialFastData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
