import HomePageClient from "./HomePageClient";
import type { PublicSiteConfiguration } from "@/lib/api";

export const revalidate = 60;

async function getInitialPublicConfiguration(): Promise<PublicSiteConfiguration | null> {
  const apiBase = (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3001/api/v1"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(`${apiBase}/config/public`, {
      next: { revalidate: 60, tags: ["public-site-configuration"] },
    });
    if (!response.ok) return null;
    return (await response.json()) as PublicSiteConfiguration;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const initialPublicConfig = await getInitialPublicConfiguration();
  return <HomePageClient initialPublicConfig={initialPublicConfig} />;
}
