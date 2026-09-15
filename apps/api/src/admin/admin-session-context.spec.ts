import {
  adminContextFingerprint,
  adminSessionContextMatches,
  normalizeAdminIp,
} from "./admin-session-context";

describe("admin session device binding", () => {
  const stored = {
    ipAddress: "::ffff:127.0.0.1",
    userAgent: "FlexPhim Admin Browser/1.0",
  };

  it("normalizes loopback and IPv4-mapped addresses", () => {
    expect(normalizeAdminIp("::1")).toBe("127.0.0.1");
    expect(normalizeAdminIp("::ffff:10.0.0.2")).toBe("10.0.0.2");
  });

  it("accepts the same device and IP", () => {
    expect(
      adminSessionContextMatches(stored, {
        ipAddress: "127.0.0.1",
        userAgent: "FlexPhim Admin Browser/1.0",
      }),
    ).toBe(true);
  });

  it("rejects a different browser fingerprint", () => {
    expect(
      adminSessionContextMatches(stored, {
        ipAddress: "127.0.0.1",
        userAgent: "Unknown Browser/2.0",
      }),
    ).toBe(false);
  });

  it("rejects a different IP when binding is enabled", () => {
    expect(
      adminSessionContextMatches(
        stored,
        {
          ipAddress: "10.0.0.9",
          userAgent: "FlexPhim Admin Browser/1.0",
        },
        true,
      ),
    ).toBe(false);
  });

  it("binds the GitHub 2FA challenge to the same request context", () => {
    expect(adminContextFingerprint(stored)).toBe(
      adminContextFingerprint({
        ipAddress: "127.0.0.1",
        userAgent: "FlexPhim Admin Browser/1.0",
      }),
    );
  });
});
