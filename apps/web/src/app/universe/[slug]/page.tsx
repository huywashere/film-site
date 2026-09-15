import { Metadata } from "next";
import { notFound } from "next/navigation";
import { UniversePageClient } from "@/components/universe/UniversePageClient";

interface UniversePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: UniversePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "marvel") {
    return {
      title: "Vũ Trụ Marvel Studios | FlexPhim",
      description:
        "Khám phá toàn bộ bom tấn Marvel Studios, Avengers, Spider-Man, X-Men và đa vũ trụ đỉnh cao chất lượng 4K Ultra HD.",
    };
  }
  if (slug === "dc") {
    return {
      title: "Vũ Trụ DC Universe | FlexPhim",
      description:
        "Khám phá toàn bộ kiệt tác điện ảnh DC Universe, Batman, Superman, Justice League và thế giới siêu anh hùng DC chất lượng 4K Ultra HD.",
    };
  }
  if (slug === "doraemon") {
    return {
      title: "Doraemon Movie | FlexPhim",
      description:
        "Khám phá toàn bộ 48+ movie chiếu rạp Doraemon, Stand by Me và những chuyến phiêu lưu kỳ thú chất lượng cao.",
    };
  }
  if (slug === "conan") {
    return {
      title: "Thám Tử Lừng Danh Conan | FlexPhim",
      description:
        "Khám phá toàn bộ 34+ movie chiếu rạp Thám Tử Lừng Danh Conan, TV series phá án ly kỳ và cuộc đối đầu Kaito Kid, Tổ Chức Áo Đen.",
    };
  }
  return {
    title: "Chủ Đề Điện Ảnh | FlexPhim",
  };
}

export default async function UniversePage({ params }: UniversePageProps) {
  const { slug } = await params;
  if (slug !== "marvel" && slug !== "dc" && slug !== "doraemon" && slug !== "conan") {
    notFound();
  }

  const universe = slug as "marvel" | "dc" | "doraemon" | "conan";
  return <UniversePageClient key={universe} universe={universe} />;
}
