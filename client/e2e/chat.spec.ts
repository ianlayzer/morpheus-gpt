import { test, expect } from "@playwright/test";

const randomId = () => Math.random().toString(36).slice(2, 10);

/** Send a message and wait for the full assistant response to finish streaming. */
async function sendAndAwaitResponse(
  page: import("@playwright/test").Page,
  message: string,
  expectedResponseIndex: number
) {
  const chatInput = page.getByPlaceholder("Enter the Matrix...");
  await chatInput.fill(message);
  await page.getByRole("button", { name: /SEND/i }).click();

  // Wait for the nth MORPHEUS response to appear
  const morpheusLabel = page.locator("text=MORPHEUS >").nth(expectedResponseIndex);
  await expect(morpheusLabel).toBeVisible({ timeout: 30_000 });

  // Wait for streaming to finish (no TRANSMITTING indicators left)
  await expect(page.getByText("[TRANSMITTING]")).toHaveCount(0, {
    timeout: 30_000,
  });

  // Assert no errors occurred
  await expect(page.getByText("[SIGNAL LOST]")).toHaveCount(0);

  // Assert response content is non-empty
  const assistantMessage = page.locator(".prose").nth(expectedResponseIndex);
  await expect(assistantMessage).not.toBeEmpty();
  const content = await assistantMessage.textContent();
  expect(content!.trim().length).toBeGreaterThan(0);
}

test("register → multi-turn chat → new session", async ({ page }) => {
  // 1. Navigate to app — should see auth page
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("MORPHEUS");
  await expect(page.locator("text=SYSTEM LOGIN")).toBeVisible();

  // 2. Switch to register mode
  await page.getByText("No account? Register here.").click();
  await expect(page.locator("text=NEW USER REGISTRATION")).toBeVisible();

  // 3. Register with random credentials
  const username = `test_${randomId()}`;
  const password = `pass_${randomId()}`;
  await page.getByPlaceholder("neo").fill(username);
  await page.getByPlaceholder("******").fill(password);
  await page.getByRole("button", { name: "[ REGISTER ]" }).click();

  // 4. Should see main app (sidebar + chat area)
  await expect(page.getByText("[ Sessions ]")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByPlaceholder("Enter the Matrix...")).toBeVisible();

  // 5. First message — wait for complete response
  await sendAndAwaitResponse(page, "Hello, what is the Matrix?", 0);

  // 6. Second message in same session — wait for complete response
  await sendAndAwaitResponse(page, "Tell me more about the red pill.", 1);

  // Verify we now have 2 assistant responses visible
  await expect(page.locator("text=MORPHEUS >")).toHaveCount(2);

  // 7. Create a new session
  await page.getByText("+ NEW SESSION").click();

  // Should see empty chat (no messages)
  await expect(page.locator("text=MORPHEUS >")).toHaveCount(0);
  await expect(page.getByPlaceholder("Enter the Matrix...")).toBeVisible();

  // 8. Send a message in the new session
  await sendAndAwaitResponse(page, "Who is the Oracle?", 0);

  // Verify only 1 assistant response in this new session
  await expect(page.locator("text=MORPHEUS >")).toHaveCount(1);
});
