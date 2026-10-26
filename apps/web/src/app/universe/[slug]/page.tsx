import { Metadata } from "next";
import { notFound } from "next/navigation";
import { UniversePageClient } from "@/components/universe/UniversePageClient";
import { buildSeoMetadata } from "@/lib/seo";

interface UniversePageProps {
  params: Promise<{ slug: string }>;
}

const UNIVERSE_META: Record<
  string,
  {
    title: string;
    description: string;
    imageUrl: string;
    keywords: string[];
  }
> = {
  marvel: {
    title: "Vũ Trụ Điện Ảnh Marvel Studios (MCU) | FlexPhim",
    description:
      "Khám phá toàn bộ bom tấn Marvel Studios, Avengers, Spider-Man, X-Men và đa vũ trụ đỉnh cao chất lượng Full HD Vietsub thuyết minh.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    keywords: ["Marvel", "MCU", "Avengers", "Spider-Man", "Iron Man", "Phim Marvel", "FlexPhim"],
  },
  dc: {
    title: "Vũ Trụ Điện Ảnh DC Universe (DCU) | FlexPhim",
    description:
      "Khám phá toàn bộ kiệt tác điện ảnh DC Universe, Batman, Superman, Justice League và thế giới siêu anh hùng DC chất lượng Full HD siêu nét.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/9FE5eD92WfVCiivM9Pq9GVSrlWk.jpg",
    keywords: ["DC Universe", "Batman", "Superman", "Justice League", "Phim DC", "FlexPhim"],
  },
  doraemon: {
    title: "Tuyển Tập Doraemon Movie Chiếu Rạp | FlexPhim",
    description:
      "Khám phá toàn bộ 48+ movie chiếu rạp Doraemon, Stand by Me và những chuyến phiêu lưu kỳ thú chất lượng cao lồng tiếng thuyết minh.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/Z3mSxuPRNiFYxf1LBoGz3YrJzC.jpg",
    keywords: ["Doraemon", "Doraemon Movie", "Nobita", "Stand by Me", "Hoạt hình Doraemon", "FlexPhim"],
  },
  conan: {
    title: "Tuyển Tập Thám Tử Lừng Danh Conan Movie | FlexPhim",
    description:
      "Khám phá toàn bộ 34+ movie chiếu rạp Thám Tử Lừng Danh Conan, TV series phá án ly kỳ và cuộc đối đầu Kaito Kid, Tổ Chức Áo Đen.",
    imageUrl: "https://image.tmdb.org/t/p/w1280/4TMkOnI6rCYxqD059aeeQSBv5mc.jpg",
    keywords: ["Thám Tử Lừng Danh Conan", "Conan Movie", "Kaito Kid", "Tổ Chức Áo Đen", "FlexPhim"],
  },
  "khoa-hoc-vu-tru": {
    title: "Khoa Học Vũ Trụ & Star Wars | FlexPhim",
    description:
      "Khám phá toàn bộ phim điện ảnh và truyền hình đỉnh cao về khoa học vũ trụ, đại chiến ngân hà Star Wars, du hành không gian và bí ẩn thiên hà chất lượng cao.",
    imageUrl: "/Folder-Background/starwar/1140629.jpg",
    keywords: ["Khoa Học Vũ Trụ", "Star Wars", "Vũ Trụ", "Không Gian", "The Mandalorian", "Interstellar", "Dune", "FlexPhim"],
  },
  "star-wars": {
    title: "Vũ Trụ Điện Ảnh Star Wars | FlexPhim",
    description:
      "Khám phá toàn bộ kiệt tác Star Wars, The Mandalorian, Andor và những cuộc phiêu lưu thiên hà đỉnh cao chất lượng Full HD 4K.",
    imageUrl: "/Folder-Background/starwar/1140629.jpg",
    keywords: ["Star Wars", "The Mandalorian", "Darth Vader", "Khoa Học Vũ Trụ", "FlexPhim"],
  },
};

export async function generateMetadata({
  params,
}: UniversePageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = UNIVERSE_META[slug];
  if (!config) {
    return buildSeoMetadata({
      title: "Chủ Đề Điện Ảnh | FlexPhim",
      description: "Khám phá các vũ trụ điện ảnh đỉnh cao tại FlexPhim.",
      path: `/universe/${slug}`,
    });
  }

  return buildSeoMetadata({
    title: config.title,
    description: config.description,
    path: `/universe/${slug}`,
    imageUrl: config.imageUrl,
    imageAlt: config.title,
    type: "website",
    keywords: config.keywords,
  });
}

export default async function UniversePage({ params }: UniversePageProps) {
  const { slug } = await params;
  const validUniverses = ["marvel", "dc", "doraemon", "conan", "khoa-hoc-vu-tru", "star-wars"];
  if (!validUniverses.includes(slug)) {
    notFound();
  }

  const universe = slug as "marvel" | "dc" | "doraemon" | "conan" | "khoa-hoc-vu-tru" | "star-wars";
  return <UniversePageClient key={universe} universe={universe} />;
}
