export async function adminFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`/api/admin/${path.replace(/^\/+/, "")}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      document.cookie = "netphim_admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      if (window.location.pathname !== "/login") {
        window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    throw new Error(payload?.message || `Yêu cầu thất bại (HTTP ${response.status})`);
  }
  return payload as T;
}

export function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}
