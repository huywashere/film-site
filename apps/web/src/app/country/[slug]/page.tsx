import CountryPageClient from "./CountryPageClient";
import { getInitialCountryCatalog } from "@/lib/server-catalog";

type CountryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string | string[];
    category?: string | string[];
  }>;
};

function normalizePage(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function CountryPage({ params, searchParams }: CountryPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = normalizePage(query.page);
  const category = Array.isArray(query.category)
    ? query.category[0]
    : query.category;
  const initialData = category
    ? null
    : await getInitialCountryCatalog(slug, page);

  return (
    <CountryPageClient
      initialFastData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
