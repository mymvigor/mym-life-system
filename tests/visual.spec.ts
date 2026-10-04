import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'node:fs';
import path from 'node:path';

const pages:[string,string][]=[
  ['01_home','./#/?fixture=1'],['02_fitness','./#/fitness?fixture=1'],['03_cpa','./#/cpa?fixture=1'],['04_knowledge','./#/knowledge?fixture=1'],['05_timeline','./#/timeline?fixture=1'],
  ['06_quick_capture','./#/capture?fixture=1'],['07_goals','./#/goals?fixture=1'],['08_note_detail','./#/note/fixture-note?fixture=1'],['09_profile','./#/profile?fixture=1'],['10_templates','./#/templates?fixture=1'],['11_tags','./#/tags?fixture=1']
];

fs.mkdirSync('test-output',{recursive:true});
fs.mkdirSync('test-output/diff',{recursive:true});

for(const [name,url] of pages){
  test(name,async({page})=>{
    await page.goto(url);
    await page.evaluate(()=>document.documentElement.style.setProperty('--safe-top','34px'));
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(300);
    const dynamicRects=[{x:0,y:0,width:393,height:34},...await page.locator('[data-visual-dynamic],.media-thumbnail,.media-placeholder,.goal-row>.domain-visual').evaluateAll(elements=>elements.map(element=>{const rect=element.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height}}))];
    await page.screenshot({path:`test-output/${name}.png`});
    const reference=PNG.sync.read(fs.readFileSync(path.join('design-reference',`${name}.png`)));
    const actual=PNG.sync.read(fs.readFileSync(path.join('test-output',`${name}.png`)));
    const scaled=new PNG({width:393,height:852});
    for(let y=0;y<852;y++)for(let x=0;x<393;x++){
      const src=((y*2)*reference.width+x*2)*4,dst=(y*393+x)*4;
      scaled.data[dst]=reference.data[src];scaled.data[dst+1]=reference.data[src+1];scaled.data[dst+2]=reference.data[src+2];scaled.data[dst+3]=reference.data[src+3];
    }
    const rawDiff=new PNG({width:393,height:852});
    const rawMismatched=pixelmatch(scaled.data,actual.data,rawDiff.data,393,852,{threshold:.12,includeAA:false});
    for(const rect of dynamicRects){
      const left=Math.max(0,Math.floor(rect.x)),right=Math.min(393,Math.ceil(rect.x+rect.width)),top=Math.max(0,Math.floor(rect.y)),bottom=Math.min(852,Math.ceil(rect.y+rect.height));
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const index=(y*393+x)*4;for(const image of [scaled,actual]){image.data[index]=91;image.data[index+1]=125;image.data[index+2]=108;image.data[index+3]=255;}}
    }
    const diff=new PNG({width:393,height:852});
    const mismatched=pixelmatch(scaled.data,actual.data,diff.data,393,852,{threshold:.12,includeAA:false});
    fs.writeFileSync(`test-output/diff/${name}.png`,PNG.sync.write(diff));
    const ratio=mismatched/(393*852);
    const maxMismatchRatio=.22;
    fs.writeFileSync(`test-output/${name}.json`,JSON.stringify({name,rawMismatched,rawRatio:rawMismatched/(393*852),dynamicRegionsExcluded:dynamicRects.length,mismatched,ratio,maxMismatchRatio,verdict:ratio<=maxMismatchRatio?'PASS':'FAIL'},null,2));
    expect(ratio,`${name} pixel mismatch ${(ratio*100).toFixed(2)}%`).toBeLessThanOrEqual(maxMismatchRatio);
  });
}
