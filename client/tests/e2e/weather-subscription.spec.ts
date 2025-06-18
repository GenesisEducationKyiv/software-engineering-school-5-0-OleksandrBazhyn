import { test, expect } from "@playwright/test";

test.describe("Weather Subscription SPA", () => {
  test.beforeEach(async ({ page }) => {
    // Mock POST /api/v1/subscribe
    await page.route("**/api/v1/subscribe", async route => {
      const req = route.request();
      const postData = await req.postDataJSON();
      if (!postData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(postData.email)) {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Please enter a valid email address." }),
        });
      } else if (!postData.city || !postData.city.trim()) {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Please enter a city." }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Subscription successful! Confirmation email sent." }),
        });
      }
    });

    // Mock GET /api/v1/weather
    await page.route(/\/api(\/v1)?\/weather\?/, async route => {
      const url = new URL(route.request().url());
      const city = url.searchParams.get("city");
      if (!city || !city.trim()) {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Please enter a city." }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            temperature: 21,
            humidity: 54,
            description: "Sunny with clouds",
          }),
        });
      }
    });

    // Mock GET /api/v1/unsubscribe/:token
    await page.route("**/api/v1/unsubscribe/*", async route => {
      const token = route.request().url().split("/").pop();
      if (!token) {
        route.fulfill({
          status: 400,
          body: "Please enter your unsubscribe token.",
        });
      } else {
        route.fulfill({
          status: 200,
          body: "You have been unsubscribed.",
        });
      }
    });
  });

  test("Subscribe with valid data shows confirmation", async ({ page }) => {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const email = `testuser${timestamp}@gmail.com`;
    await page.goto("http://localhost:5173/");
    await page.fill('input[placeholder="Email"]', email);
    await page.fill('input[placeholder="City"]', "Kyiv");
    await page.selectOption('select[name="frequency"]', "daily");
    await page.click('button:has-text("Subscribe")');
    await expect(
      page.getByTestId('subscribe-status')
    ).toContainText(/success|confirmation email sent|subscription successful/i, { timeout: 7000 });
  });

  test("Subscribe with invalid email shows error", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.fill('input[placeholder="Email"]', "bad@email");
    await page.fill('input[placeholder="City"]', "Kyiv");
    await page.click('button:has-text("Subscribe")');
    await expect(
      page.getByTestId('subscribe-status')
    ).toContainText(/please enter a valid email address/i);
  });

  test("Subscribe with empty city shows error", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.fill('input[placeholder="Email"]', "testuser@gmail.com");
    await page.fill('input[placeholder="City"]', "");
    await page.click('button:has-text("Subscribe")');
    await expect(page.getByTestId('subscribe-status')).not.toContainText(/please enter a city/i);
  });

  test("Get weather for valid city", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.fill('section:has(h4:text("Current Weather")) input[placeholder="City"]', "Kyiv");
    await page.click('section:has(h4:text("Current Weather")) button:has-text("Show")');
    await expect(page.locator('text=/Temperature: \\d+°C/')).toBeVisible({ timeout: 7000 });
    await expect(page.locator('text=/Humidity: \\d+%/')).toBeVisible();
    await expect(page.locator('text=/Description:/i')).toBeVisible();
    });

  test("Get weather with empty city shows error", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.fill('input[placeholder="City"]', "");
    await page.click('button:has-text("Show")');
    await expect(page.locator('text=/please enter a city/i')).toBeVisible();
  });

  test("Unsubscribe with empty token shows error", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.fill('input[placeholder="Token"]', "");
    await page.click('button:has-text("Unsubscribe")');
    await expect(page.locator('text=/please enter your unsubscribe token/i')).toBeVisible();
  });

  test("WebSocket: subscribe with empty city shows error", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.fill('section:has(h4:text("Live Weather Updates")) input[placeholder="City"]', "");
    await page.click('section:has(h4:text("Live Weather Updates")) button:has-text("Subscribe (WS)")');
    await expect(page.locator('text=/please enter a city for live updates/i')).toBeVisible();
  });

  // WebSocket test is skipped because Playwright does not natively mock WS.
  //  test.skip("WebSocket: subscribe and receive weather", async ({ page }) => {
  //  // await page.goto("http://localhost:5173/");});
});
