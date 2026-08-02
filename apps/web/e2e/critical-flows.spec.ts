import { expect, test } from "@playwright/test";

test.describe("critical visitor flows", () => {
  test("a successful email login creates a cookie-backed session and opens home", async ({
    page,
  }) => {
    const authRequests: string[] = [];
    const user = {
      id: "e2e-user-id",
      email: "member@cineverse.test",
      username: "cineverse_member",
      displayName: "CineVerse Member",
      role: "USER",
    };

    // Keep the critical login test independent from Cloudflare's external
    // challenge while still exercising the form's token-required path.
    await page.addInitScript(() => {
      const pageWindow = window as Window & {
        turnstile?: {
          ready: (callback: () => void) => void;
          render: (
            container: HTMLElement,
            options: { callback: (token: string) => void },
          ) => string;
          remove: (widgetId: string) => void;
        };
      };
      pageWindow.turnstile = {
        ready: (callback: () => void) => callback(),
        render: (_container: HTMLElement, options: { callback: (token: string) => void }) => {
          window.setTimeout(() => options.callback("playwright-turnstile-token"), 0);
          return "playwright-turnstile";
        },
        remove: () => {},
      };
    });

    await page.route("**/auth/login**", async (route) => {
      authRequests.push(route.request().url());
      const origin =
        (await route.request().headerValue("origin")) ||
        "http://127.0.0.1:3000";
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": origin,
            "access-control-allow-credentials": "true",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
        },
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route("**/auth/me**", async (route) => {
      authRequests.push(route.request().url());
      const origin =
        (await route.request().headerValue("origin")) ||
        "http://127.0.0.1:3000";
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": origin,
            "access-control-allow-credentials": "true",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
        },
        body: JSON.stringify(user),
      });
    });

    await page.goto("/login");
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill("correct-password");
    await page.getByRole("button", { name: "Đăng nhập ngay" }).click();

    await expect.poll(() => authRequests).not.toEqual([]);
    await expect(page).toHaveURL("/");
    await expect
      .poll(() =>
        page.evaluate(() => document.cookie.includes("cineverse-auth=true")),
      )
      .toBe(true);
  });

  test("a guest watchlist survives a reload", async ({ page }) => {
    await page.goto("/watchlist");
    await page.evaluate(() => {
      localStorage.setItem(
        "cineverse_guest_watchlist",
        JSON.stringify([
          {
            id: "guest-demo-film",
            movieId: "demo-film",
            movieData: { title: "Phim khách thử nghiệm", type: "single" },
            addedAt: Date.now(),
          },
        ]),
      );
    });
    await page.reload();
    await expect(page.getByText("Phim khách thử nghiệm")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Phim khách thử nghiệm")).toBeVisible();
  });

  test("a guest watch progress is available in history", async ({ page }) => {
    await page.goto("/history");
    await page.evaluate(() => {
      localStorage.setItem(
        "cineverse_continue_watching",
        JSON.stringify([
          {
            slug: "demo-film",
            epSlug: "tap-1",
            epName: "Tập 1",
            title: "Tiến độ khách thử nghiệm",
            poster: "",
            currentTime: 120,
            duration: 600,
            updatedAt: Date.now(),
          },
        ]),
      );
    });
    await page.reload();
    await expect(page.getByText("Tiến độ khách thử nghiệm")).toBeVisible();
    await expect(page.getByText("20%")).toBeVisible();
  });

  test("an unknown route renders the branded 404 page", async ({ page }) => {
    await page.goto("/khong-ton-tai-e2e");
    await expect(
      page.getByRole("heading", {
        name: "Oops! Trang web bạn tìm kiếm không tồn tại.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Đi tới trang chủ" }),
    ).toBeVisible();
  });
});
