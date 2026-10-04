import { test,expect } from '@playwright/test';

test('production pages have no runtime errors, external requests, or reference-image requests',async({page})=>{
  const errors:string[]=[],forbidden:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')errors.push(message.text())});
  page.on('request',request=>{const url=new URL(request.url());if(url.pathname.includes('/design-reference/')||url.origin!=='http://127.0.0.1:4173')forbidden.push(request.url())});
  for(const route of ['#/','#/fitness','#/cpa','#/timeline','#/knowledge','#/goals','#/profile','#/templates','#/tags','#/capture']){await page.goto(`./${route}`);await expect(page.locator('.app-shell')).toBeVisible();}
  expect(forbidden).toEqual([]);expect(errors).toEqual([]);
});
