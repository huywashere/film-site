import FilmsTypeClient from "./FilmsTypeClient";
import { getInitialFilmCatalog } from "@/lib/server-catalog";
import { headers } from "next/headers";

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
  const [{ type }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);
  const page = normalizePage(query.page);
  const initialData =
    requestHeaders.get("rsc") === "1"
      ? null
      : await getInitialFilmCatalog(type, page);

  return (
    <FilmsTypeClient
      type={type}
      page={page}
      initialData={initialData ?? undefined}
      initialDataUpdatedAt={initialData ? Date.now() : undefined}
    />
  );
}
