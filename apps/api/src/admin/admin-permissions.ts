import { SetMetadata } from "@nestjs/common";

export const ADMIN_PERMISSIONS_KEY = "admin_permissions";

export const ADMIN_PERMISSIONS = [
  "analytics.read",
  "audit.read",
  "backups.manage",
  "cache.manage",
  "cms.manage",
  "incidents.manage",
  "movies.read",
  "movies.write",
  "playback.manage",
  "reports.manage",
  "reviews.manage",
  "sync.manage",
  "users.manage",
  "watch-party.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<string, AdminPermission[] | ["*"]> = {
  ADMIN: ["*"],
  MODERATOR: [
    "analytics.read",
    "movies.read",
    "reports.manage",
    "reviews.manage",
    "watch-party.manage",
  ],
  CONTENT_EDITOR: ["cms.manage", "movies.read", "movies.write", "cache.manage"],
  OPERATIONS: [
    "analytics.read",
    "backups.manage",
    "cache.manage",
    "incidents.manage",
    "movies.read",
    "playback.manage",
    "sync.manage",
  ],
  ANALYST: ["analytics.read", "audit.read", "movies.read"],
};

export function permissionsFor(role: string, custom: string[] = []) {
  const base = ROLE_PERMISSIONS[role] || [];
  return base.includes("*" as never)
    ? ["*"]
    : [...new Set([...base, ...custom])];
}

export const RequireAdminPermissions = (...permissions: AdminPermission[]) =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
