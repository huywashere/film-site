import FilmsTypeClient from "./FilmsTypeClient";
import { getInitialFilmCatalog } from "@/lib/server-catalog";

type FilmsTypePageProps = {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function normalizePage(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function FilmsTypePage({
  params,
  searchParams,
}: FilmsTypePageProps) {
  const [{ type }, query] = await Promise.all([params, searchParams]);
  const page = normalizePage(query.page);
  const initialData = await getInitialFilmCatalog(type, page);

  return (
    <FilmsTypeClient
      type={type}
      page={page}
      initialData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
