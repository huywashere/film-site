import GenrePageClient from "./GenrePageClient";
import { getInitialGenreCatalog } from "@/lib/server-catalog";
import { headers } from "next/headers";

type GenrePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function normalizePage(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const [{ slug }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);
  const page = normalizePage(query.page);
  const initialData =
    requestHeaders.get("rsc") === "1"
      ? null
      : await getInitialGenreCatalog(slug, page);

  return (
    <GenrePageClient
      initialData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
