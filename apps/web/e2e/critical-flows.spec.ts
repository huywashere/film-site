import { expect, test } from "@playwright/test";

test.describe("critical visitor flows", () => {
  test("a successful email login creates a cookie-backed session and opens home", async ({
    page,
  }) => {
    const authRequests: string[] = [];
    let loginSucceeded = false;
    const user = {
      id: "e2e-user-id",
      email: "member@netphim.test",
      username: "netphim_member",
      displayName: "NetPhim Member",
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
      loginSucceeded = true;
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
      if (!loginSucceeded) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Unauthenticated" }),
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
    await page.getByRole("textbox", { name: "Email hoặc Tên đăng nhập" }).fill(user.email);
    await page.getByRole("textbox", { name: "Mật khẩu" }).fill("correct-password");
    await page
      .locator("form")
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .click();

    await expect.poll(() => authRequests).not.toEqual([]);
    await expect(page).toHaveURL("/");
    await expect
      .poll(() =>
        page.evaluate(() => document.cookie.includes("netphim-auth=true")),
      )
      .toBe(true);
  });

  test("a guest watchlist survives a reload", async ({ page }) => {
    await page.goto("/watchlist");
    await page.evaluate(() => {
      localStorage.setItem(
        "netphim_guest_watchlist",
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
    await expect(
      page.getByRole("link", { name: "Phim khách thử nghiệm", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Phim khách thử nghiệm", exact: true }),
    ).toBeVisible();
  });

  test("a guest watch progress is available in history", async ({ page }) => {
    await page.goto("/history");
    await page.evaluate(() => {
      localStorage.setItem(
        "netphim_continue_watching",
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
    const historyItem = page.locator('a[href="/watch/demo-film?ep=tap-1"]');
    await expect(historyItem).toBeVisible();
    await expect(
      historyItem.getByRole("heading", {
        name: "Tiến độ khách thử nghiệm",
        exact: true,
      }),
    ).toBeVisible();
    await expect(historyItem.getByText("20%", { exact: true })).toBeVisible();
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
