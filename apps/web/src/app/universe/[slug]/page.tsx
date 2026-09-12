import { Metadata } from "next";
import { notFound } from "next/navigation";
import { UniversePageClient } from "@/components/universe/UniversePageClient";
import { getUniverseSpotlights } from "@/lib/universe-catalog";

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

  const universe = slug as "marvel" | "dc";
  const spotlights = getUniverseSpotlights(universe);
  const initial = spotlights[0];
  const universeBrandLogo =
    universe === "marvel"
      ? "/images/logos/marvel-studios.svg"
      : "/images/logos/dc-universe.svg";

  return (
    <>
      {/* ── HIGH-PRIORITY PRELOAD HEADERS FOR 0MS HERO RENDER ── */}
      {initial?.heroBackdrop && (
        <link
          rel="preload"
          as="image"
          href={initial.heroBackdrop}
          fetchPriority="high"
        />
      )}
      <link
        rel="preload"
        as="image"
        href={universeBrandLogo}
        fetchPriority="high"
      />
      {initial?.titleLogo && (
        <link
          rel="preload"
          as="image"
          href={initial.titleLogo}
          fetchPriority="high"
        />
      )}
      <UniversePageClient universe={universe} />
    </>
  );
}
