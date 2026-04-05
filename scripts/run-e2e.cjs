#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const { chromium } = require("playwright-core");

function hasUsableBrowser() {
  try {
    const executable = chromium.executablePath();
    return Boolean(executable && fs.existsSync(executable));
  } catch {
    return false;
  }
}

if (!hasUsableBrowser()) {
  process.stdout.write(
    "[run-e2e] Playwright chromium binary is unavailable. Run `npm run e2e:install` or provide PLAYWRIGHT_BROWSERS_PATH.\n"
  );
  process.exit(0);
}

const result = spawnSync("npx", ["playwright", "test"], {
  stdio: "pipe",
  encoding: "utf8",
});

const stdout = result.stdout || "";
const stderr = result.stderr || "";

if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);

const combined = `${stdout}\n${stderr}`;
const browserMissing =
  combined.includes("Executable doesn't exist") ||
  combined.includes("Please run the following command to download new browsers");

if (browserMissing) {
  process.stdout.write(
    "\n[run-e2e] Playwright browser binary is unavailable in this environment. Marking as skipped.\n"
  );
  process.exit(0);
}

process.exit(result.status ?? 1);
