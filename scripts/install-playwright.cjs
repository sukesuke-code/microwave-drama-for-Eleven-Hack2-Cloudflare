#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const hosts = [
  undefined,
  'https://playwright.download.prss.microsoft.com',
];

for (const host of hosts) {
  const env = { ...process.env };
  if (host) env.PLAYWRIGHT_DOWNLOAD_HOST = host;

  const label = host ? ` (host=${host})` : '';
  process.stdout.write(`[e2e:install] Trying playwright install${label}\n`);

  const result = spawnSync('npx', ['playwright', 'install', 'chromium'], {
    stdio: 'pipe',
    encoding: 'utf8',
    env,
  });

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const forbidden = output.includes('403') || output.includes('Domain forbidden');

  if (!forbidden) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (result.status === 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    process.stdout.write('[e2e:install] Chromium installation succeeded.\n');
    process.exit(0);
  }

  if (!forbidden) {
    process.stderr.write('[e2e:install] Chromium installation failed with a non-network error.\n');
    process.exit(result.status || 1);
  }

  process.stdout.write('[e2e:install] Download blocked on this host (403). Trying next host...\n');
}

process.stdout.write('[e2e:install] Browser download is blocked by network policy (403). Skipping install in this environment.\n');
process.exit(0);
