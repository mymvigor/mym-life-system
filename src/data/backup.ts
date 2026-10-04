import JSZip from 'jszip';
import { DATABASE_VERSION, db } from './db';
import { deleteOPFSFile, fileExists, getOPFSBlob, writeOPFSFile } from './opfs';
import { recalculateTagCounts } from './tags';
import type { Emotion, Entry, Goal, KnowledgeLink, KnowledgeNode, Line, Media, Metric, Setting, Tag, Template, TimelineEvent } from '../types';

export interface BackupManifest { format:'MYM Backup'; version:1; createdAt:string; appVersion:string; mediaCount:number; databaseVersion:number; }
export interface BackupData {
  lines:Line[];goals:Goal[];entries:Entry[];metrics:Metric[];tags:Tag[];templates:Template[];media:Media[];
  knowledgeNodes:KnowledgeNode[];knowledgeLinks:KnowledgeLink[];emotions:Emotion[];timelineEvents:TimelineEvent[];settings:Setting[];
}
export interface BackupSummary { entries:number;goals:number;tags:number;images:number;videos:number;audio:number;knowledge:number;media:number;createdAt:string; }

export async function collectAllData():Promise<BackupData> {
  const [lines,goals,entries,metrics,tags,templates,media,knowledgeNodes,knowledgeLinks,emotions,timelineEvents,settings]=await Promise.all([
    db.lines.toArray(),db.goals.toArray(),db.entries.toArray(),db.metrics.toArray(),db.tags.toArray(),db.templates.toArray(),db.media.toArray(),
    db.knowledgeNodes.toArray(),db.knowledgeLinks.toArray(),db.emotions.toArray(),db.timelineEvents.toArray(),db.settings.toArray()
  ]);
  return {lines,goals,entries,metrics,tags,templates,media,knowledgeNodes,knowledgeLinks,emotions,timelineEvents,settings};
}

function zipPath(opfsPath:string){return opfsPath.replace(/^\/MYM\//,'media/');}
function assertMediaPath(path:string){if(!/^\/MYM\/(images|videos|audio|attachments|thumbnails)\/[A-Za-z0-9._-]+$/.test(path))throw new Error(`备份包含无效媒体路径：${path}`);}

export async function createBackupZip(onProgress?:(current:number,total:number)=>void) {
  const data=await collectAllData();
  const manifest:BackupManifest={format:'MYM Backup',version:1,createdAt:new Date().toISOString(),appVersion:'1.1.0',mediaCount:data.media.length,databaseVersion:DATABASE_VERSION};
  const zip=new JSZip();
  zip.file('manifest.json',JSON.stringify(manifest,null,2));
  zip.file('data.json',JSON.stringify(data));
  const paths=Array.from(new Set(data.media.flatMap(item=>[item.opfsPath,item.thumbnailPath].filter(Boolean) as string[])));
  let current=0;
  for(const path of paths){
    assertMediaPath(path);
    if(await fileExists(path))zip.file(zipPath(path),await getOPFSBlob(path),{binary:true});
    current+=1;onProgress?.(current,paths.length);
  }
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:3},streamFiles:true});
  return {blob,manifest,data};
}

async function parseBackup(file:Blob) {
  const zip=await JSZip.loadAsync(file);
  const manifestFile=zip.file('manifest.json'),dataFile=zip.file('data.json');
  if(!manifestFile||!dataFile)throw new Error('这不是完整的 MYM 备份：缺少 manifest.json 或 data.json');
  const manifest=JSON.parse(await manifestFile.async('string')) as BackupManifest;
  if(manifest.format!=='MYM Backup'||manifest.version!==1)throw new Error('不支持的 MYM 备份格式或版本');
  const data=JSON.parse(await dataFile.async('string')) as BackupData;
  const keys:(keyof BackupData)[]=['lines','goals','entries','metrics','tags','templates','media','knowledgeNodes','knowledgeLinks','emotions','timelineEvents','settings'];
  for(const key of keys)if(!Array.isArray(data[key]))throw new Error(`备份数据不完整：${key}`);
  for(const record of data.media){
    assertMediaPath(record.opfsPath);
    if(!zip.file(zipPath(record.opfsPath)))throw new Error(`备份缺少媒体文件：${record.id}`);
    if(record.thumbnailPath){assertMediaPath(record.thumbnailPath);if(!zip.file(zipPath(record.thumbnailPath)))throw new Error(`备份缺少缩略图：${record.id}`);}
  }
  return {zip,manifest,data};
}

export async function inspectBackupZip(file:Blob):Promise<BackupSummary> {
  const {manifest,data}=await parseBackup(file);
  return {entries:data.entries.length,goals:data.goals.length,tags:data.tags.length,images:data.media.filter(x=>x.kind==='image').length,videos:data.media.filter(x=>x.kind==='video').length,audio:data.media.filter(x=>x.kind==='audio').length,knowledge:data.knowledgeNodes.length,media:data.media.length,createdAt:manifest.createdAt};
}

export async function restoreBackupZip(file:Blob,onProgress?:(current:number,total:number)=>void) {
  const {zip,data}=await parseBackup(file);
  const paths=Array.from(new Set(data.media.flatMap(item=>[item.opfsPath,item.thumbnailPath].filter(Boolean) as string[])));
  const incoming:string[]=[],staged:string[]=[],rollback:Array<{path:string;backupPath?:string}>=[];
  try {
    for(let index=0;index<paths.length;index++){
      const original=paths[index],entry=zip.file(zipPath(original));if(!entry)throw new Error(`无法读取媒体：${original}`);
      const stagedPath=`/MYM/restore-staging/${crypto.randomUUID()}/${original.split('/').at(-1)}`;
      await writeOPFSFile(stagedPath,await entry.async('blob'));incoming.push(stagedPath);staged.push(stagedPath);onProgress?.(index+1,paths.length*2);
    }
    for(let index=0;index<paths.length;index++){
      let backupPath:string|undefined;
      if(await fileExists(paths[index])){backupPath=`/MYM/restore-staging/${crypto.randomUUID()}/previous-${paths[index].split('/').at(-1)}`;await writeOPFSFile(backupPath,await getOPFSBlob(paths[index]));staged.push(backupPath);}
      rollback.push({path:paths[index],backupPath});
      await writeOPFSFile(paths[index],await getOPFSBlob(incoming[index]));onProgress?.(paths.length+index+1,paths.length*2);
    }
    await db.transaction('rw',[db.lines,db.goals,db.entries,db.metrics,db.tags,db.templates,db.media,db.knowledgeNodes,db.knowledgeLinks,db.emotions,db.timelineEvents,db.settings],async()=>{
      await Promise.all([db.lines.clear(),db.goals.clear(),db.entries.clear(),db.metrics.clear(),db.tags.clear(),db.templates.clear(),db.media.clear(),db.knowledgeNodes.clear(),db.knowledgeLinks.clear(),db.emotions.clear(),db.timelineEvents.clear(),db.settings.clear()]);
      await db.lines.bulkAdd(data.lines);await db.goals.bulkAdd(data.goals);await db.entries.bulkAdd(data.entries);await db.metrics.bulkAdd(data.metrics);
      await db.tags.bulkAdd(data.tags);await db.templates.bulkAdd(data.templates);await db.media.bulkAdd(data.media);await db.knowledgeNodes.bulkAdd(data.knowledgeNodes);
      await db.knowledgeLinks.bulkAdd(data.knowledgeLinks);await db.emotions.bulkAdd(data.emotions);await db.timelineEvents.bulkAdd(data.timelineEvents);await db.settings.bulkAdd(data.settings);
    });
    await recalculateTagCounts();
  } catch(error) {
    for(const item of [...rollback].reverse()){if(item.backupPath)await writeOPFSFile(item.path,await getOPFSBlob(item.backupPath)).catch(()=>undefined);else await deleteOPFSFile(item.path).catch(()=>undefined);}
    throw error instanceof Error?error:new Error('恢复失败，原有数据库和媒体已保留');
  }
  finally {for(const path of staged)await deleteOPFSFile(path).catch(()=>undefined);}
}

export function downloadBlob(blob:Blob,name:string) {
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
