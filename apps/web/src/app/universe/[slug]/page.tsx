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
      title: "Vũ Trụ Marvel Studios | NetPhim",
      description:
        "Khám phá toàn bộ bom tấn Marvel Studios, Avengers, Spider-Man, X-Men và đa vũ trụ đỉnh cao chất lượng 4K Ultra HD.",
    };
  }
  if (slug === "dc") {
    return {
      title: "Vũ Trụ DC Universe | NetPhim",
      description:
        "Khám phá toàn bộ kiệt tác điện ảnh DC Universe, Batman, Superman, Justice League và thế giới siêu anh hùng DC chất lượng 4K Ultra HD.",
    };
  }
  return {
    title: "Vũ Trụ Điện Ảnh | NetPhim",
  };
}

export default async function UniversePage({ params }: UniversePageProps) {
  const { slug } = await params;
  if (slug !== "marvel" && slug !== "dc") {
    notFound();
  }

  return <UniversePageClient universe={slug as "marvel" | "dc"} />;
}
