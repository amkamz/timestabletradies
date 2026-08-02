import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * E2E config for the student app.
 *
 * Tests run against a real Supabase project — every run signs up a throwaway
 * parent and student rather than sharing fixtures, so runs never collide.
 * Workers are pinned to 1: the suite asserts on coin and material balances,
 * which are per-student but cheap enough to keep serial and easy to read.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The app is phone-first; testing at desktop width would exercise a
    // layout no kid ever sees.
    ...devices["Pixel 7"],
  },

  projects: [{ name: "student-app", use: { ...devices["Pixel 7"] } }],

  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
