import { movieApi } from "@/lib/api";
import HeroBannerOptimized from "./HeroBannerOptimized";

// ── Server Component để fetch data trước ────────────────────────
export async function HeroBannerServer() {
  try {
    // Fetch data ở server-side với timeout ngắn
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

    const data = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/kkphim/danh-sach/phim-moi-cap-nhat?page=1`,
      {
        next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
        signal: controller.signal,
      },
    ).then((res) => res.json());

    clearTimeout(timeoutId);

    const films = data?.data?.items || data?.items || [];

    // Shuffle and take 6 films
    const shuffled = [...films].sort(() => Math.random() - 0.5).slice(0, 6);

    return <HeroBannerOptimized films={shuffled} />;
  } catch (error) {
    // Fallback to client-side rendering if server fetch fails
    console.error("Hero banner server fetch failed:", error);
    return <HeroBannerOptimized films={[]} />;
  }
}
