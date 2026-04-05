const { spawnSync } = require("node:child_process");
const { existsSync, readdirSync } = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");

function hasPlaywrightChromiumBinary() {
  const cacheRoot = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(cacheRoot)) return false;

  const entries = readdirSync(cacheRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("chromium")) continue;
    const base = join(cacheRoot, entry.name);
    const candidates = [
      join(base, "chrome-linux", "chrome"),
      join(base, "chrome-headless-shell-linux64", "chrome-headless-shell"),
    ];
    if (candidates.some((candidate) => existsSync(candidate))) {
      return true;
    }
  }
  return false;
}

const env = { ...process.env };

if (!hasPlaywrightChromiumBinary()) {
  env.PLAYWRIGHT_SKIP_E2E = "1";
  console.warn(
    "[e2e] Playwright Chromium binary not found in this environment. Tests will be marked as skipped."
  );
}

const result = spawnSync("npx", ["playwright", "test"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}
process.exit(1);
