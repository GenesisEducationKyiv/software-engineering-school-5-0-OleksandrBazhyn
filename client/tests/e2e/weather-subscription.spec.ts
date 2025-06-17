import { test, expect } from "@playwright/test";

test.describe("Weather Subscription SPA", () => {
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
    // We check that the browser does not submit the form and the status does not appear
    await expect(page.getByTestId('subscribe-status')).not.toContainText(/please enter a city/i);
  });

  test("Get weather for valid city", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.fill('section:has(h4:text("Current Weather")) input[placeholder="City"]', "Kyiv");
    await page.click('section:has(h4:text("Current Weather")) button:has-text("Show")');
    await expect(page.locator('text=Temperature:')).toBeVisible({ timeout: 7000 });
    await expect(page.locator('text=Humidity:')).toBeVisible();
    await expect(page.locator('text=Description:')).toBeVisible();
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

  test("WebSocket: subscribe and receive weather", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.fill('section:has(h4:text("Live Weather Updates")) input[placeholder="City"]', "Kyiv");
    await page.click('section:has(h4:text("Live Weather Updates")) button:has-text("Subscribe (WS)")');
    await expect(page.locator('text=/connected. waiting for live updates/i')).toBeVisible({ timeout: 7000 });
    await expect(page.locator('text=Temperature:')).toBeVisible({ timeout: 20000 });
  });
});
