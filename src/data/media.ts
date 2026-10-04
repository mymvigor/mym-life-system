import { db } from './db';
import { audioDuration, deleteOPFSFile, imageThumbnail, listOPFSFiles, saveMedia, saveThumbnail, videoThumbnail } from './opfs';
import type { Media } from '../types';

export async function importMediaFile(file:File):Promise<{record:Media;thumbnailError?:string}> {
  const folder=file.type.startsWith('video/')?'videos':file.type.startsWith('audio/')?'audio':file.type.startsWith('image/')?'images':'attachments';
  const kind:Media['kind']=folder==='videos'?'video':folder==='audio'?'audio':folder==='images'?'image':'file';
  const opfsPath=await saveMedia(file,folder);
  const record:Media={id:crypto.randomUUID(),kind,opfsPath,mime:file.type||'application/octet-stream',size:file.size,createdAt:new Date().toISOString()};
  let thumbnailError:string|undefined;
  try {
    if(kind==='image'){
      const info=await imageThumbnail(file,640);record.thumbnailPath=await saveThumbnail(info.blob);record.width=info.width;record.height=info.height;
    } else if(kind==='video'){
      try {const info=await videoThumbnail(file);record.thumbnailPath=await saveThumbnail(info.blob);record.duration=info.duration;record.width=info.width;record.height=info.height;}
      catch(error){thumbnailError=error instanceof Error?error.message:'视频缩略图生成失败';}
    } else if(kind==='audio') record.duration=await audioDuration(file);
    await db.media.add(record);
    return {record,thumbnailError};
  } catch(error) {
    await deleteOPFSFile(opfsPath).catch(()=>undefined);
    if(record.thumbnailPath) await deleteOPFSFile(record.thumbnailPath).catch(()=>undefined);
    throw error;
  }
}

export async function mediaReferenceCount(mediaId:string,excludeEntryId?:string) {
  const entries=await db.entries.toArray();
  const entryRefs=entries.filter(entry=>entry.id!==excludeEntryId&&entry.media.includes(mediaId)).length;
  const nodeRefs=await db.knowledgeNodes.where('mediaId').equals(mediaId).count();
  return entryRefs+nodeRefs;
}

export async function deleteMediaRecordIfUnreferenced(mediaId:string,excludeEntryId?:string) {
  if(await mediaReferenceCount(mediaId,excludeEntryId)>0) return false;
  const record=await db.media.get(mediaId);if(!record)return false;
  await deleteOPFSFile(record.opfsPath).catch(()=>undefined);
  if(record.thumbnailPath)await deleteOPFSFile(record.thumbnailPath).catch(()=>undefined);
  await db.media.delete(mediaId);
  return true;
}

export interface OrphanMediaResult { databaseOrphans:Media[]; filesystemOrphans:string[]; missingFiles:Media[]; }

export async function findOrphanMedia():Promise<OrphanMediaResult> {
  const [records,entries,nodes,files]=await Promise.all([db.media.toArray(),db.entries.toArray(),db.knowledgeNodes.toArray(),listOPFSFiles()]);
  const referencedIds=new Set(entries.flatMap(entry=>entry.media));
  for(const node of nodes)if(node.mediaId)referencedIds.add(node.mediaId);
  const databaseOrphans=records.filter(record=>!referencedIds.has(record.id));
  const knownPaths=new Set(records.flatMap(record=>[record.opfsPath,record.thumbnailPath].filter(Boolean) as string[]));
  const filesystemOrphans=files.filter(path=>!knownPaths.has(path));
  const fileSet=new Set(files);
  const missingFiles=records.filter(record=>!fileSet.has(record.opfsPath));
  return {databaseOrphans,filesystemOrphans,missingFiles};
}

export async function cleanOrphanMedia(result?:OrphanMediaResult) {
  const orphans=result??await findOrphanMedia();
  for(const record of orphans.databaseOrphans){
    await deleteOPFSFile(record.opfsPath).catch(()=>undefined);
    if(record.thumbnailPath)await deleteOPFSFile(record.thumbnailPath).catch(()=>undefined);
    await db.media.delete(record.id);
  }
  for(const path of orphans.filesystemOrphans)await deleteOPFSFile(path).catch(()=>undefined);
  return orphans.databaseOrphans.length+orphans.filesystemOrphans.length;
}
