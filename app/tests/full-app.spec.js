import { test } from "@playwright/test";

test.use({
  storageState: "auth.json",
  video: "on",
  screenshot: "on",
  trace: "on",
});

test("AlgoNook full UI test", async ({ page }) => {
  const errors = [];
  const failedRequests = [];

  page.on("console", msg => {
    if (msg.type() === "error") {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  page.on("pageerror", error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  page.on("requestfailed", request => {
    failedRequests.push(
      `REQUEST FAILED: ${request.method()} ${request.url()}`
    );
  });

  await page.goto("http://localhost:3000");
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: "test-results/start.png",
    fullPage: true
  });

  const buttons = page.locator("button:visible");
  const buttonCount = await buttons.count();

  console.log(`BUTTONS FOUND: ${buttonCount}`);

  for (let i = 0; i < buttonCount; i++) {
    try {
      const button = buttons.nth(i);
      const text = (await button.innerText()).trim();

      console.log(`CLICKING: ${text}`);

      await button.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log(`BUTTON FAILED: ${error.message}`);
    }
  }

  await page.screenshot({
    path: "test-results/end.png",
    fullPage: true
  });

  console.log("\n========== RESULTS ==========");
  console.log(`Buttons found: ${buttonCount}`);
  console.log(`Browser errors: ${errors.length}`);
  console.log(`Failed requests: ${failedRequests.length}`);

  if (errors.length) {
    console.log("\nERRORS:");
    errors.forEach(e => console.log(e));
  }

  if (failedRequests.length) {
    console.log("\nFAILED REQUESTS:");
    failedRequests.forEach(e => console.log(e));
  }
});
