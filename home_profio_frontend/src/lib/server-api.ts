import { cache } from "react";
import type { PublicBusiness, PublicProfile, PublicWork, WorkTemplate } from "@/lib/api";

/** Server-side base URL for the backend (inside Docker this is the service name). */
export const API_INTERNAL = process.env.API_INTERNAL_URL || "http://127.0.0.1:8000";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Anonymous fetches: exactly what a visitor gets. no-store so visibility changes apply on the next request. */
async function getPublic<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_INTERNAL}${path}`, { cache: "no-store" });
  if (res.status === 404 || res.status === 422) return null;
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export const getPublicProfile = cache((username: string) => getPublic<PublicProfile>(`/profiles/${encodeURIComponent(username)}`));
export const getPublicWork = cache((id: string) => getPublic<PublicWork>(`/public/works/${encodeURIComponent(id)}`));
export const getPublicBusiness = cache((slug: string) => getPublic<PublicBusiness>(`/public/businesses/${encodeURIComponent(slug)}`));
export const getTemplates = cache(async () => (await getPublic<WorkTemplate[]>("/templates")) ?? []);

/** Absolute URL for a stored file as a browser sees it (for <img> and og:image). */
export function publicMediaUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith("/files/") ? `/api${path}` : path;
}
