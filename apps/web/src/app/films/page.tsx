import BrowseFilmsClient from "./BrowseFilmsClient";
import { getInitialBrowseCatalog } from "@/lib/server-catalog";

type QueryValue = string | string[] | undefined;
type BrowseFilmsPageProps = {
  searchParams: Promise<Record<string, QueryValue>>;
};

function first(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value: QueryValue): number {
  const parsed = Number(first(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function BrowseFilmsPage({
  searchParams,
}: BrowseFilmsPageProps) {
  const query = await searchParams;
  const page = normalizePage(query.page);
  const keyword = first(query.q) || first(query.search);
  const initialData = keyword
    ? null
    : await getInitialBrowseCatalog(
        first(query.type),
        first(query.genre) || first(query.category),
        first(query.country),
        page,
      );

  return (
    <BrowseFilmsClient
      initialData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
