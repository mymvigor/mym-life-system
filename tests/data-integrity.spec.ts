import { test,expect } from '@playwright/test';

test('custom line, goal, tag merge and template snapshot form a persistent loop',async({page})=>{
  test.setTimeout(90_000);await page.goto('./#/goals');
  await page.getByRole('button',{name:'管理主线'}).click();const lineDialog=page.getByRole('dialog',{name:'管理主线'});await lineDialog.getByPlaceholder('新主线名称').fill('表达');await lineDialog.getByRole('button',{name:'新建',exact:true}).click();await lineDialog.getByRole('button',{name:'关闭'}).click();
  await page.getByLabel('新建目标').click();await page.locator('.dialog-sheet').getByLabel('目标名称').fill('每周录3次视频');await page.locator('.dialog-sheet').getByLabel('所属主线').selectOption({label:'表达'});await page.locator('.dialog-sheet').getByLabel('状态').selectOption('focus');await page.getByRole('button',{name:'保存目标'}).click();await expect(page.getByText('每周录3次视频')).toBeVisible();

  await page.goto('./#/templates');await page.getByText('新建自定义模板').click();const editor=page.locator('.dialog-sheet');await editor.getByLabel('模板名称').fill('口语练习');await editor.getByLabel('描述').fill('记录每次口语练习');await editor.getByLabel('默认标签').fill('表达练习');
  for(let i=0;i<5;i++)await editor.getByRole('button',{name:/添加/}).click();const names=['主题','视频','今天哪里卡','新句型','自评分'];const types=['text','media','textarea','textarea','rating'];
  for(let i=0;i<names.length;i++){await editor.getByLabel('字段名称').nth(i).fill(names[i]);await editor.locator('.field-editor article select').nth(i).selectOption(types[i]);}
  await editor.getByRole('button',{name:/添加/}).click();await editor.getByLabel('字段名称').nth(5).fill('下一步');await editor.locator('.field-editor article select').nth(5).selectOption('textarea');await editor.getByRole('button',{name:'保存模板'}).click();
  await page.locator('.template-grid article').filter({hasText:'口语练习'}).getByRole('button',{name:'使用'}).click();await page.getByLabel('记录标题').fill('模板练习记录');
  await page.locator('.template-fields input[type=text]').first().fill('自我介绍');await page.locator('.template-fields textarea').first().fill('连接词不自然');await page.getByLabel('记录内容').fill('自由补充仍然可写');await page.getByRole('button',{name:'完成'}).click();await expect(page.getByRole('heading',{name:'模板练习记录'})).toBeVisible();await expect(page.getByText('自我介绍')).toBeVisible();
  const noteUrl=page.url();await page.goto('./#/tags');const row=page.locator('.tag-list>div').filter({hasText:'#表达练习'});await row.getByRole('button').click();await page.getByRole('button',{name:'合并到其他标签'}).click();await page.locator('.dialog-sheet select').selectOption({label:'#表达'});await page.getByRole('button',{name:'保存'}).click();
  await page.goto(noteUrl);await expect(page.getByText('#表达',{exact:true})).toBeVisible();await expect(page.getByText('#表达练习',{exact:true})).toHaveCount(0);await page.reload();await expect(page.getByText('自我介绍')).toBeVisible();
});
