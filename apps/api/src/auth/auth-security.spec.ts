import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";

jest.mock("otplib", () => ({
  generateSecret: jest.fn(),
  verify: jest.fn(),
  generateURI: jest.fn(),
}));

describe("AuthService account security", () => {
  const buildService = (overrides: Record<string, any> = {}) => {
    const prisma: any = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({
          id: "user-1",
          username: "netphim-user",
          googleId: "google-1",
        }),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      resetPasswordToken: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      twoFactorAuth: { findUnique: jest.fn() },
      $transaction: jest.fn(async (operations) => Promise.all(operations)),
      ...overrides,
    };
    const service = new AuthService(
      prisma,
      {} as any,
      { get: jest.fn().mockReturnValue("test-secret") } as any,
      {} as any,
      {} as any,
    );
    return { service, prisma };
  };

  it("changes the password and revokes every other session", async () => {
    const passwordHash = await bcrypt.hash("OldPassword1", 4);
    const { service, prisma } = buildService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash,
      isLocked: false,
      isBanned: false,
    });

    await expect(
      service.changePassword("user-1", "session-1", {
        currentPassword: "OldPassword1",
        newPassword: "NewPassword2",
      }),
    ).resolves.toMatchObject({ success: true });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "session-1" } }),
      }),
    );
  });

  it("does not change a password when the current password is wrong", async () => {
    const passwordHash = await bcrypt.hash("OldPassword1", 4);
    const { service, prisma } = buildService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash,
      isLocked: false,
      isBanned: false,
    });

    await expect(
      service.changePassword("user-1", "session-1", {
        currentPassword: "WrongPassword1",
        newPassword: "NewPassword2",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not let a Google identity already owned by another user be linked", async () => {
    const { service, prisma } = buildService();
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        isLocked: false,
        isBanned: false,
      })
      .mockResolvedValueOnce({ id: "user-2" });

    await expect(
      service.linkGoogleAccount("user-1", {
        googleId: "google-1",
        email: "verified@example.com",
        emailVerified: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("prevents Control Room accounts from disabling 2FA", async () => {
    const { service, prisma } = buildService();
    prisma.user.findUnique.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      adminAccessEnabled: true,
    });

    await expect(
      service.disable2FA("admin-1", { code: "123456" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
