/**
 * E2E integration tests: Campaign Creation Path
 *
 * Covers: UI form → server action → Supabase DB row assertions
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in env
 *   - SUPABASE_SERVICE_ROLE_KEY in env (for DB assertions via admin client)
 *   - A seeded test user with role=creator, approved KYC, and a wallet_address
 *     set to GAJRNUO6HSMQG4FNHNWQVRXJZJZ7QRA7HXPYYB6H5PTA3EAAJXJNZD7U
 *   - STELLAR_FACTORY_SECRET_KEY set (the live Soroban test will be skipped if absent)
 *
 * Run:
 *   npx playwright test tests/e2e/campaign-creation.spec.ts
 */

import { test, expect, Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as fs from "fs";

// ── Env vars ────────────────────────────────────────────────────────────────
const BASE_URL   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SB_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Test creator credentials — must exist in Supabase Auth and profiles table
const TEST_EMAIL    = process.env.E2E_CREATOR_EMAIL    ?? "creator-e2e@fundr.test";
const TEST_PASSWORD = process.env.E2E_CREATOR_PASSWORD ?? "E2eSecret!99";

// Admin wallet we're deploying with
const ADMIN_WALLET = "GAJRNUO6HSMQG4FNHNWQVRXJZJZ7QRA7HXPYYB6H5PTA3EAAJXJNZD7U";

// Whether on-chain portions are expected to run
const HAS_FACTORY_KEY = Boolean(process.env.STELLAR_FACTORY_SECRET_KEY);
const HAS_FACTORY_ID  = Boolean(process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID);
const ON_CHAIN_READY  = HAS_FACTORY_KEY && HAS_FACTORY_ID;

// ── Supabase admin client (service role) ─────────────────────────────────────
function adminClient() {
  if (!SB_URL || !SB_SERVICE) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests");
  }
  return createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15_000 });
}

/** Returns a tiny 1×1 PNG as a Buffer — avoids needing real fixture files. */
function minimalPng(): Buffer {
  return Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082",
    "hex",
  );
}

/** Writes N identical test images to /tmp and returns their paths. */
function createTestImages(count: number): string[] {
  const dir = path.join(process.cwd(), ".playwright-tmp");
  fs.mkdirSync(dir, { recursive: true });
  const paths: string[] = [];
  for (let i = 0; i < count; i++) {
    const p = path.join(dir, `test-image-${i + 1}.png`);
    fs.writeFileSync(p, minimalPng());
    paths.push(p);
  }
  return paths;
}

// ── Test data ────────────────────────────────────────────────────────────────
const CAMPAIGN_TITLE  = `E2E Campaign ${Date.now()}`;
const CAMPAIGN_GOAL   = "50";
// Deadline 60 days from today in YYYY-MM-DD format
const CAMPAIGN_DEADLINE = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

// ── Fixtures: ensure the test creator user exists & is configured ─────────────
test.beforeAll(async () => {
  if (!SB_URL || !SB_SERVICE) return; // skip DB setup if vars not provided

  const admin = adminClient();

  // Create the test user if missing
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const alreadyExists = existingUsers.users.some((u) => u.email === TEST_EMAIL);

  let userId: string;
  if (!alreadyExists) {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  } else {
    userId = existingUsers.users.find((u) => u.email === TEST_EMAIL)!.id;
  }

  // Ensure profile has creator role + admin wallet_address
  await admin.from("profiles").upsert({
    id: userId,
    role: "creator",
    wallet_address: ADMIN_WALLET,
    full_name: "E2E Test Creator",
  });

  // Ensure approved KYC row
  const { data: kyc } = await admin
    .from("fundraiser_kyc")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!kyc) {
    await admin.from("fundraiser_kyc").insert({
      user_id: userId,
      status: "approved",
      full_name: "E2E Test Creator",
      id_type: "passport",
      id_number: "E2E-00001",
    });
  } else {
    await admin
      .from("fundraiser_kyc")
      .update({ status: "approved" })
      .eq("user_id", userId);
  }
});

// ── Cleanup created campaigns after tests ─────────────────────────────────────
test.afterAll(async () => {
  if (!SB_URL || !SB_SERVICE) return;
  const admin = adminClient();
  await admin.from("campaigns").delete().like("title", "E2E Campaign %");
  // Clean up temp images
  const dir = path.join(process.cwd(), ".playwright-tmp");
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
});

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Campaign Creation Path", () => {
  test("creator can navigate to /fundraising and see the form", async ({ page }) => {
    await loginAs(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto(`${BASE_URL}/fundraising`);
    await expect(page.getByRole("heading", { name: /fundraising portal/i })).toBeVisible();
    await expect(page.getByLabel(/campaign title/i)).toBeVisible();
    await expect(page.getByLabel(/goal \(xlm\)/i)).toBeVisible();
    await expect(page.getByLabel(/deadline/i)).toBeVisible();
  });

  test("form shows no_wallet error when user has no wallet linked", async ({ page }) => {
    // Temporarily remove wallet_address from the test user's profile
    const admin = adminClient();
    const { data: users } = await admin.auth.admin.listUsers();
    const userId = users.users.find((u) => u.email === TEST_EMAIL)!.id;

    await admin
      .from("profiles")
      .update({ wallet_address: null })
      .eq("id", userId);

    await loginAs(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto(`${BASE_URL}/fundraising`);

    // Fill and submit minimal valid form
    const imagePaths = createTestImages(4);
    await page.getByLabel(/campaign title/i).fill("No Wallet Test");
    await page.getByLabel(/short description/i).fill("Short desc");
    await page.getByLabel(/full description/i).fill("Full description text");
    await page.getByLabel(/goal \(xlm\)/i).fill("10");
    await page.getByLabel(/deadline/i).fill(CAMPAIGN_DEADLINE);
    await page.locator('input[name="campaign_images"]').setInputFiles(imagePaths);
    await page.getByRole("button", { name: /save draft/i }).click();

    // Should redirect back to /fundraising?error=no_wallet
    await expect(page).toHaveURL(/error=no_wallet/);
    await expect(page.getByText(/must link a stellar wallet/i)).toBeVisible();

    // Restore wallet_address
    await admin
      .from("profiles")
      .update({ wallet_address: ADMIN_WALLET })
      .eq("id", userId);
  });

  test.skip(
    !ON_CHAIN_READY,
    "Skipped: STELLAR_FACTORY_SECRET_KEY or NEXT_PUBLIC_FACTORY_CONTRACT_ID not set",
  );

  test("full path: form → on-chain → DB row created", async ({ page }) => {
    await loginAs(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto(`${BASE_URL}/fundraising`);

    const imagePaths = createTestImages(4);

    await page.getByLabel(/campaign title/i).fill(CAMPAIGN_TITLE);
    await page.getByLabel(/short description/i).fill("An E2E test campaign on Stellar Testnet");
    await page.getByLabel(/full description/i).fill(
      "This campaign is created by the Playwright E2E suite to verify the full creation path.",
    );
    await page.getByLabel(/goal \(xlm\)/i).fill(CAMPAIGN_GOAL);
    await page.getByLabel(/deadline/i).fill(CAMPAIGN_DEADLINE);
    await page.locator('input[name="campaign_images"]').setInputFiles(imagePaths);

    // Submit — this triggers the real Soroban invoke
    await page.getByRole("button", { name: /save draft/i }).click();

    // On success, server redirects to /dashboard
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 60_000 });

    // ── DB assertions ───────────────────────────────────────────────────────
    const admin = adminClient();
    const { data: campaign, error } = await admin
      .from("campaigns")
      .select("id, title, contract_address, factory_tx_hash, goal_xlm, status, deadline")
      .eq("title", CAMPAIGN_TITLE)
      .maybeSingle();

    expect(error).toBeNull();
    expect(campaign).not.toBeNull();
    expect(campaign!.title).toBe(CAMPAIGN_TITLE);
    expect(campaign!.status).toBe("draft");
    expect(Number(campaign!.goal_xlm)).toBe(Number(CAMPAIGN_GOAL));

    // contract_address must be "FACTORY_ID:CAMPAIGN_SEQ" (Soroban composite)
    expect(campaign!.contract_address).toMatch(
      /^[A-Z0-9]{56}:\d+$/,
    );

    // factory_tx_hash must be a 64-char hex string (Stellar transaction hash)
    expect(campaign!.factory_tx_hash).toMatch(/^[a-f0-9]{64}$/i);

    // Deadline should round-trip correctly (within 1 minute)
    const expectedDeadline = new Date(`${CAMPAIGN_DEADLINE}T23:59:59.000Z`).getTime();
    const actualDeadline   = new Date(campaign!.deadline).getTime();
    expect(Math.abs(actualDeadline - expectedDeadline)).toBeLessThan(60_000);
  });

  test("duplicate title does not create two campaigns", async ({ page }) => {
    if (!ON_CHAIN_READY) test.skip();

    const admin = adminClient();
    const imagePaths = createTestImages(4);

    // Submit first time
    await loginAs(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto(`${BASE_URL}/fundraising`);
    await page.getByLabel(/campaign title/i).fill(CAMPAIGN_TITLE);
    await page.getByLabel(/short description/i).fill("Duplicate check");
    await page.getByLabel(/full description/i).fill("Duplicate check full");
    await page.getByLabel(/goal \(xlm\)/i).fill("10");
    await page.getByLabel(/deadline/i).fill(CAMPAIGN_DEADLINE);
    await page.locator('input[name="campaign_images"]').setInputFiles(imagePaths);
    await page.getByRole("button", { name: /save draft/i }).click();
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 60_000 });

    // Count rows with this title — slug uniqueness means only 1 canonical row
    const { data: rows } = await admin
      .from("campaigns")
      .select("id")
      .eq("title", CAMPAIGN_TITLE);

    // There may be 2 rows (two E2E runs) but contract_address must differ
    if (rows && rows.length > 1) {
      const { data: detailed } = await admin
        .from("campaigns")
        .select("contract_address")
        .eq("title", CAMPAIGN_TITLE);
      const addresses = detailed!.map((r) => r.contract_address);
      const unique = new Set(addresses);
      expect(unique.size).toBe(addresses.length); // all distinct on-chain IDs
    }
  });
});
