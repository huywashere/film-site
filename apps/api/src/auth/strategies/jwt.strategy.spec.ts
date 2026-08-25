import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy session validation", () => {
  const activeSession = {
    id: "session-1",
    userId: "user-1",
    isRevoked: false,
    expiresAt: new Date(Date.now() + 60_000),
  };
  const activeUser = {
    id: "user-1",
    email: "user@example.com",
    username: "netphim-user",
    isLocked: false,
    isBanned: false,
  };

  const createStrategy = (session: any = activeSession, user: any = activeUser) => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue(session),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const config = { get: jest.fn().mockReturnValue("test-jwt-secret") };
    return new JwtStrategy(config as any, prisma as any);
  };

  it("accepts a valid user bound to an active refresh session", async () => {
    await expect(
      createStrategy().validate(
        { headers: { "user-agent": undefined }, ip: "127.0.0.1" },
        { sub: "user-1", jti: "session-1" },
      ),
    ).resolves.toMatchObject({ id: "user-1", jti: "session-1" });
  });

  it.each([
    ["missing", null],
    ["revoked", { ...activeSession, isRevoked: true }],
    ["expired", { ...activeSession, expiresAt: new Date(Date.now() - 1) }],
    ["different user", { ...activeSession, userId: "user-2" }],
  ])("rejects a %s session", async (_label, session) => {
    await expect(
      createStrategy(session).validate(
        { headers: {}, ip: "127.0.0.1" },
        { sub: "user-1", jti: "session-1" },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects tokens without a session id", async () => {
    await expect(
      createStrategy().validate({ headers: {} }, { sub: "user-1" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects and revokes a session used from a different browser family", async () => {
    const session = {
      ...activeSession,
      userAgent: "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36",
    };
    await expect(
      createStrategy(session).validate(
        { headers: { "user-agent": "Mozilla/5.0 Firefox/127.0" } },
        { sub: "user-1", jti: "session-1" },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
