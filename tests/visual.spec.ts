import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'node:fs';
import path from 'node:path';

const pages:[string,string][]=[
  ['01_home','/'],['02_fitness','/fitness'],['03_cpa','/cpa'],['04_knowledge','/knowledge'],['05_timeline','/timeline'],
  ['06_quick_capture','/capture'],['07_goals','/goals'],['08_note_detail','/note/cpa'],['09_profile','/profile'],['10_templates','/templates'],['11_tags','/tags']
];

fs.mkdirSync('test-output',{recursive:true});
fs.mkdirSync('test-output/diff',{recursive:true});

for(const [name,url] of pages){
  test(name,async({page})=>{
    await page.goto(url);
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:`test-output/${name}.png`});
    const reference=PNG.sync.read(fs.readFileSync(path.join('design-reference',`${name}.png`)));
    const actual=PNG.sync.read(fs.readFileSync(path.join('test-output',`${name}.png`)));
    const scaled=new PNG({width:393,height:852});
    for(let y=0;y<852;y++)for(let x=0;x<393;x++){
      const src=((y*2)*reference.width+x*2)*4,dst=(y*393+x)*4;
      scaled.data[dst]=reference.data[src];scaled.data[dst+1]=reference.data[src+1];scaled.data[dst+2]=reference.data[src+2];scaled.data[dst+3]=reference.data[src+3];
    }
    const diff=new PNG({width:393,height:852});
    const mismatched=pixelmatch(scaled.data,actual.data,diff.data,393,852,{threshold:.12,includeAA:false});
    fs.writeFileSync(`test-output/diff/${name}.png`,PNG.sync.write(diff));
    const ratio=mismatched/(393*852);
    const maxMismatchRatio=.22;
    fs.writeFileSync(`test-output/${name}.json`,JSON.stringify({name,mismatched,ratio,maxMismatchRatio,verdict:ratio<=maxMismatchRatio?'PASS':'FAIL'},null,2));
    expect(ratio,`${name} pixel mismatch ${(ratio*100).toFixed(2)}%`).toBeLessThanOrEqual(maxMismatchRatio);
  });
}
