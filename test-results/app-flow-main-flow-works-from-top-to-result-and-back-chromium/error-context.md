# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-flow.spec.ts >> main flow works from top to result and back
- Location: tests/e2e/app-flow.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('世界で最も退屈な待ち時間を')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('世界で最も退屈な待ち時間を')

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - generic [ref=e7]:
      - img [ref=e8]
      - combobox "Language switcher" [ref=e12]:
        - option "English" [selected]
        - option "日本語"
    - button "Dark mode switcher" [ref=e13] [cursor=pointer]:
      - img [ref=e14]
      - text: Light
  - generic [ref=e20]:
    - generic [ref=e21]:
      - img "Microwave Show icon" [ref=e22]
      - heading "Microwave Show" [level=1] [ref=e23]:
        - img [ref=e24]
        - generic [ref=e26]: Microwave Show
        - img [ref=e27]
    - paragraph [ref=e30]: Turn the world’s most boring wait into
    - paragraph [ref=e31]: your most dramatic moment.
    - generic [ref=e32]:
      - generic [ref=e33]:
        - generic [ref=e34]: 🏟️ Sports
        - generic [ref=e35]: ·
      - generic [ref=e36]:
        - generic [ref=e37]: 🎬 Movie
        - generic [ref=e38]: ·
      - generic [ref=e39]:
        - generic [ref=e40]: 😱 Horror
        - generic [ref=e41]: ·
      - generic [ref=e42]:
        - generic [ref=e43]: 🌍 Nature
        - generic [ref=e44]: ·
      - generic [ref=e45]:
        - generic [ref=e46]: 📜 History
        - generic [ref=e47]: ·
      - generic [ref=e49]: 🔥 Anime
    - button "START" [ref=e51] [cursor=pointer]: START
    - generic [ref=e73]: Your microwave show starts now
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test('main flow works from top to result and back', async ({ page }) => {
  4  |   await page.goto('/');
  5  | 
  6  |   await expect(page.getByRole('heading', { name: 'Microwave Show' })).toBeVisible();
> 7  |   await expect(page.getByText('世界で最も退屈な待ち時間を')).toBeVisible();
     |                                                 ^ Error: expect(locator).toBeVisible() failed
  8  | 
  9  |   await page.getByRole('button', { name: '開始' }).click();
  10 |   await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
  11 | 
  12 |   await page.getByRole('button', { name: '30Sec' }).click();
  13 |   await page.getByRole('button', { name: '実況開始！' }).click();
  14 | 
  15 |   await expect(page.getByText('秒経過 / 30 秒')).toBeVisible({ timeout: 5000 });
  16 | 
  17 |   await page.getByRole('button', { name: '⏸ 一時停止' }).click();
  18 |   await expect(page.getByRole('button', { name: '▶ 再開' })).toBeVisible();
  19 |   await page.getByRole('button', { name: '▶ 再開' }).click();
  20 | 
  21 |   await expect(page.getByText('ドラマ完了！')).toBeVisible({ timeout: 45000 });
  22 |   await expect(page.getByRole('button', { name: 'もう一度' })).toBeVisible();
  23 |   await expect(page.getByRole('button', { name: 'トップに戻る' })).toBeVisible();
  24 | 
  25 |   await page.getByRole('button', { name: 'トップに戻る' }).click();
  26 |   await expect(page.getByRole('button', { name: '開始' })).toBeVisible();
  27 | });
  28 | 
```