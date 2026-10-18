import type { Metadata } from "next";
import ActorDetailPageClient from "./ActorDetailPageClient";
import { buildSeoMetadata } from "@/lib/seo";
import { tmdbProfile } from "@/lib/tmdb";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const personId = Number(id);

  try {
    const tmdbToken = process.env.TMDB_ACCESS_TOKEN?.trim() || "";
    const tmdbApiKey = process.env.TMDB_API_KEY?.trim() || "";
    const url = tmdbToken
      ? `https://api.tmdb.org/3/person/${personId}?language=vi-VN`
      : `https://api.tmdb.org/3/person/${personId}?api_key=${tmdbApiKey}&language=vi-VN`;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (tmdbToken && tmdbToken.startsWith("eyJ")) {
      headers.Authorization = `Bearer ${tmdbToken}`;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const person = await res.json();
      const name = person.name || "Diễn Viên";
      const profile = person.profile_path
        ? tmdbProfile(person.profile_path, "h632")
        : null;
      return buildSeoMetadata({
        title: `Diễn Viên ${name} — Tiểu Sử & Phim Đã Đóng | FlexPhim`,
        description: person.biography
          ? person.biography.replace(/\s+/g, " ").trim().slice(0, 180) + "..."
          : `Khám phá tiểu sử và các bộ phim nổi bật của diễn viên ${name} tại FlexPhim.`,
        path: `/actors/${id}`,
        imageUrl: profile,
        imageAlt: name,
        type: "profile",
        keywords: [name, "tiểu sử diễn viên", "phim diễn viên", "FlexPhim"],
      });
    }
  } catch {
    // fallback
  }

  return buildSeoMetadata({
    title: "Hồ Sơ Diễn Viên | FlexPhim",
    description: "Khám phá thông tin và các bộ phim của diễn viên tại FlexPhim.",
    path: `/actors/${id}`,
    type: "profile",
  });
}

export default function ActorPage() {
  return <ActorDetailPageClient />;
}
