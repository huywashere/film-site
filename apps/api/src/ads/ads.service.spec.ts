import { sanitizeAdRecord } from "./ads.service";

describe("advertisement security", () => {
  it("removes executable markup and unsafe URLs before public delivery", () => {
    const ad = sanitizeAdRecord({
      title: "  Test ad  ",
      imageUrl: "javascript:alert(1)",
      targetUrl: "https://example.com/campaign",
      videoVastUrl: "http://insecure.example/vast.xml",
      htmlContent:
        '<div class="promo"><script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)" onclick="alert(4)">Open</a></div>',
    });

    expect(ad.title).toBe("Test ad");
    expect(ad.imageUrl).toBeNull();
    expect(ad.videoVastUrl).toBeNull();
    expect(ad.targetUrl).toBe("https://example.com/campaign");
    expect(ad.htmlContent).not.toMatch(/script|onerror|onclick|javascript:/i);
  });

  it("forces safe link attributes in allowed custom HTML", () => {
    const ad = sanitizeAdRecord({
      htmlContent: '<a href="https://example.com">Campaign</a>',
    });

    expect(ad.htmlContent).toContain('target="_blank"');
    expect(ad.htmlContent).toContain("noopener noreferrer nofollow sponsored");
  });
});
