import { test, expect } from '@playwright/test';

test('PWA shell reloads offline after first cache', async ({ page, context }) => {
  await page.goto('./#/');
  await page.waitForLoadState('networkidle');
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('当前重点')).toBeVisible();
  await context.setOffline(false);
});

test('quick capture survives reload in IndexedDB', async ({ page }) => {
  await page.goto('./#/capture');
  await page.getByLabel('记录内容').fill('离线记录验收 #健');
  await expect(page.locator('.tag-suggestions').getByRole('button', { name: '#健身' })).toBeVisible();
  await page.getByRole('button', { name: '完成' }).click();
  await page.reload();
  const count = await page.evaluate(async () => {
    const request = indexedDB.open('MYMDatabase');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<number>((resolve, reject) => {
      const tx = database.transaction('entries', 'readonly');
      const counter = tx.objectStore('entries').count();
      counter.onsuccess = () => resolve(counter.result);
      counter.onerror = () => reject(counter.error);
    });
  });
  expect(count).toBe(1);
});
