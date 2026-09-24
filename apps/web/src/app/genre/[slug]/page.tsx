import GenrePageClient from "./GenrePageClient";
import { getInitialGenreCatalog } from "@/lib/server-catalog";

type GenrePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function normalizePage(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = normalizePage(query.page);
  const initialData = await getInitialGenreCatalog(slug, page);

  return (
    <GenrePageClient
      initialData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
