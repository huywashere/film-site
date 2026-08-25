import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { permissionsFor } from "./admin-permissions";
import { AdminPermissionGuard } from "./guards/admin-permission.guard";

describe("admin role permission matrix", () => {
  it.each([
    ["MODERATOR", "reports.manage", true],
    ["MODERATOR", "movies.write", false],
    ["CONTENT_EDITOR", "cms.manage", true],
    ["CONTENT_EDITOR", "users.manage", false],
    ["OPERATIONS", "backups.manage", true],
    ["OPERATIONS", "reviews.manage", false],
    ["ANALYST", "audit.read", true],
    ["ANALYST", "cms.manage", false],
    ["USER", "movies.read", false],
  ])("maps %s / %s correctly", (role, permission, expected) => {
    if (expected) expect(permissionsFor(role)).toContain(permission);
    else expect(permissionsFor(role)).not.toContain(permission);
  });

  it("gives ADMIN the wildcard only", () => {
    expect(permissionsFor("ADMIN")).toEqual(["*"]);
  });

  it("merges explicit permissions without duplicates", () => {
    const permissions = permissionsFor("ANALYST", ["audit.read", "cms.manage"]);
    expect(permissions.filter((item) => item === "audit.read")).toHaveLength(1);
    expect(permissions).toContain("cms.manage");
  });
});

describe("AdminPermissionGuard", () => {
  function context(permissions: string[]) {
    return {
      getHandler: () => "handler",
      getClass: () => "controller",
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions } }),
      }),
    } as never;
  }

  it("allows a session that has every required permission", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["movies.read"]),
    } as unknown as Reflector;
    const guard = new AdminPermissionGuard(reflector);
    expect(guard.canActivate(context(["movies.read"]))).toBe(true);
  });

  it("allows ADMIN wildcard", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["users.manage"]),
    } as unknown as Reflector;
    const guard = new AdminPermissionGuard(reflector);
    expect(guard.canActivate(context(["*"]))).toBe(true);
  });

  it("rejects a role missing one required permission", () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue(["movies.read", "movies.write"]),
    } as unknown as Reflector;
    const guard = new AdminPermissionGuard(reflector);
    expect(() => guard.canActivate(context(["movies.read"]))).toThrow(
      ForbiddenException,
    );
  });
});
