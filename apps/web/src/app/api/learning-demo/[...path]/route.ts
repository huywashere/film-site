import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const demoCatalog: Record<string, { title: string; episodes: Array<{ server_name: string; server_data: Array<{ name: string; slug: string; link_embed: string; link_m3u8: string }> }> }> = {
  demo: {
    title: "Demo movie",
    episodes: [
      {
        server_name: "Demo Engsub (học tập)",
        server_data: [
          {
            name: "Tập 1",
            slug: "tap-1",
            link_embed: "https://www.youtube.com/embed/aqz-KE-bpKQ?autoplay=1",
            link_m3u8: "",
          },
          {
            name: "Tập 2",
            slug: "tap-2",
            link_embed: "https://www.youtube.com/embed/ScMzIvxBSi4?autoplay=1",
            link_m3u8: "",
          },
        ],
      },
    ],
  },
};

function buildDemoPayload(slug: string) {
  const item = demoCatalog[slug] || demoCatalog.demo;
  return {
    movie: {
      slug,
      name: item.title,
      origin_name: item.title,
      lang: "English",
    },
    episodes: item.episodes,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { path?: string[] } },
) {
  const segments = params?.path || [];
  const maybeSlug = segments[1] || segments[0] || "demo";

  if (segments[0] === "movie") {
    return NextResponse.json(buildDemoPayload(maybeSlug));
  }

  if (segments[0] === "search") {
    return NextResponse.json({
      data: {
        items: Object.entries(demoCatalog).map(([slug, item]) => ({
          slug,
          name: item.title,
          origin_name: item.title,
        })),
      },
    });
  }

  return NextResponse.json(buildDemoPayload(maybeSlug));
}
