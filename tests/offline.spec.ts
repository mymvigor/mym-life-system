import { test,expect } from '@playwright/test';
import { pngBuffer,wavBuffer,webmBuffer } from './media-fixtures';

test('full app data and OPFS media survive an offline restart',async({page,context})=>{
  test.setTimeout(90_000);
  await page.goto('./#/capture');await page.waitForLoadState('networkidle');
  await page.getByLabel('记录标题').fill('第一次表达练习');await page.getByLabel('记录内容').fill('今天完成了第一次完整表达练习。');
  const input=page.locator('input[type=file]');
  await input.setInputFiles({name:'practice.png',mimeType:'image/png',buffer:pngBuffer});await expect(page.locator('.media-previews>div')).toHaveCount(1);
  const video=await webmBuffer(page);await input.setInputFiles({name:'practice.webm',mimeType:'video/webm',buffer:video});await expect(page.locator('.media-previews>div')).toHaveCount(2,{timeout:20_000});
  await input.setInputFiles({name:'voice.wav',mimeType:'audio/wav',buffer:wavBuffer()});await expect(page.locator('.media-previews>div')).toHaveCount(3);
  await page.getByPlaceholder('新标签').fill('表达练习');await page.getByRole('button',{name:'创建'}).click();
  await page.getByRole('button',{name:'完成'}).click();await expect(page.getByRole('heading',{name:'第一次表达练习'})).toBeVisible();
  const noteUrl=page.url();await page.reload();await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null);
  await expect(page.locator('.note-media-strip img.full-media')).toBeVisible();await expect(page.locator('.note-media-strip video')).toBeVisible();await expect(page.locator('.note-media-strip audio')).toBeVisible();
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'第一次表达练习'})).toBeVisible();
  await expect(page.locator('.note-media-strip img.full-media')).toBeVisible();await expect(page.locator('.note-media-strip video')).toBeVisible();await expect(page.locator('.note-media-strip audio')).toBeVisible();
  for(const route of ['#/','#/timeline','#/knowledge','#/goals','#/tags','#/templates']){await page.goto(`./${route}`,{waitUntil:'domcontentloaded'});await expect(page.locator('.app-shell')).toBeVisible();}
  await page.goto('./#/timeline');await expect(page.getByText('第一次表达练习')).toBeVisible();await expect(page.locator('.timeline-list article img')).toBeVisible();
  await page.goto('./#/capture');await page.getByLabel('记录内容').fill('飞行模式下新增记录');await page.getByRole('button',{name:'完成'}).click();await expect(page.getByText('飞行模式下新增记录',{exact:false})).toBeVisible();
  await page.goto(noteUrl,{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'第一次表达练习'})).toBeVisible();await context.setOffline(false);
});
