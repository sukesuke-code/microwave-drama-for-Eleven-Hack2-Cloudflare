import { expect, test } from '@playwright/test';

test('main flow works from top to result and back', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Microwave Show' })).toBeVisible();
  await expect(page.getByText('世界で最も退屈な待ち時間を')).toBeVisible();

  await page.getByRole('button', { name: '開始' }).click();
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();

  await page.getByRole('button', { name: '30Sec' }).click();
  await page.getByRole('button', { name: '実況開始！' }).click();

  await expect(page.getByText('秒経過 / 30 秒')).toBeVisible({ timeout: 5000 });

  await page.getByRole('button', { name: '⏸ 一時停止' }).click();
  await expect(page.getByRole('button', { name: '▶ 再開' })).toBeVisible();
  await page.getByRole('button', { name: '▶ 再開' }).click();

  await expect(page.getByText('ドラマ完了！')).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('button', { name: 'もう一度' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'トップに戻る' })).toBeVisible();

  await page.getByRole('button', { name: 'トップに戻る' }).click();
  await expect(page.getByRole('button', { name: '開始' })).toBeVisible();
});
