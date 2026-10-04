const ROOT = 'MYM';
export const MEDIA_DIRECTORIES = ['images','videos','audio','attachments','thumbnails'] as const;
export type MediaDirectory = typeof MEDIA_DIRECTORIES[number];

function assertOPFS() {
  if (!navigator.storage?.getDirectory) throw new Error('此浏览器不支持本地媒体存储（OPFS）');
}

function cleanParts(path:string) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== ROOT || parts.some(p => p === '.' || p === '..')) throw new Error('无效的本地媒体路径');
  return parts;
}

async function originRoot() {
  assertOPFS();
  return navigator.storage.getDirectory();
}

async function mymRoot(create = true) {
  return (await originRoot()).getDirectoryHandle(ROOT,{create});
}

async function directoryFor(path:string, create=false) {
  const parts=cleanParts(path);
  let dir:FileSystemDirectoryHandle = await mymRoot(create);
  for (const part of parts.slice(1,-1)) dir = await dir.getDirectoryHandle(part,{create});
  return {dir,name:parts.at(-1)!};
}

export async function writeOPFSFile(path:string, data:Blob | ArrayBuffer | Uint8Array) {
  const {dir,name}=await directoryFor(path,true);
  const handle=await dir.getFileHandle(name,{create:true});
  const writable=await handle.createWritable();
  try { await writable.write(data); await writable.close(); }
  catch (error) { await writable.abort().catch(()=>undefined); throw humanStorageError(error); }
  return path;
}

export async function readOPFSFile(path:string):Promise<File> {
  try {
    const {dir,name}=await directoryFor(path,false);
    return await (await dir.getFileHandle(name)).getFile();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') throw new Error('本地媒体文件不存在，可能已被浏览器清理');
    throw humanStorageError(error);
  }
}

export async function getOPFSBlob(path:string):Promise<Blob> { return readOPFSFile(path); }
export async function getOPFSObjectURL(path:string):Promise<string> { return URL.createObjectURL(await getOPFSBlob(path)); }

export async function fileExists(path:string) {
  try { await readOPFSFile(path); return true; }
  catch { return false; }
}

export async function deleteOPFSFile(path:string) {
  const {dir,name}=await directoryFor(path,false);
  try { await dir.removeEntry(name); }
  catch (error) { if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw humanStorageError(error); }
}

export async function saveMedia(file:File, kind:Exclude<MediaDirectory,'thumbnails'>) {
  const extension=file.name.includes('.') ? `.${file.name.split('.').pop()!.replace(/[^a-zA-Z0-9]/g,'').slice(0,8)}` : '';
  const path=`/${ROOT}/${kind}/${crypto.randomUUID()}${extension}`;
  await writeOPFSFile(path,file);
  return path;
}

export async function saveThumbnail(blob:Blob) {
  const path=`/${ROOT}/thumbnails/${crypto.randomUUID()}.webp`;
  await writeOPFSFile(path,blob);
  return path;
}

async function canvasBlob(canvas:HTMLCanvasElement, type='image/webp', quality=.82) {
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('无法生成缩略图')),type,quality));
}

export async function imageThumbnail(file:Blob,maxSize=640):Promise<{blob:Blob;width:number;height:number}> {
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();
    image.decoding='async';
    image.src=url;
    await image.decode();
    const ratio=Math.min(1,maxSize/Math.max(image.naturalWidth,image.naturalHeight));
    const width=Math.max(1,Math.round(image.naturalWidth*ratio));
    const height=Math.max(1,Math.round(image.naturalHeight*ratio));
    const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
    canvas.getContext('2d',{alpha:false})?.drawImage(image,0,0,width,height);
    return {blob:await canvasBlob(canvas),width:image.naturalWidth,height:image.naturalHeight};
  } finally { URL.revokeObjectURL(url); }
}

export async function videoThumbnail(file:Blob):Promise<{blob:Blob;duration:number;width:number;height:number}> {
  const url=URL.createObjectURL(file);
  const video=document.createElement('video'); video.preload='metadata'; video.muted=true; video.playsInline=true; video.src=url;
  try {
    await new Promise<void>((resolve,reject)=>{
      const timeout=window.setTimeout(()=>reject(new Error('视频缩略图生成超时')),15000);
      video.onloadedmetadata=()=>{ video.currentTime=Math.min(1,Math.max(.05,Number.isFinite(video.duration)?video.duration/4:.1)); };
      video.onseeked=()=>{window.clearTimeout(timeout);resolve();};
      video.onerror=()=>{window.clearTimeout(timeout);reject(new Error('此视频格式无法生成缩略图'));};
    });
    const sourceWidth=video.videoWidth||640,sourceHeight=video.videoHeight||360;
    const width=480,height=Math.max(1,Math.round(width*sourceHeight/sourceWidth));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d',{alpha:false})?.drawImage(video,0,0,width,height);
    return {blob:await canvasBlob(canvas),duration:Number.isFinite(video.duration)?video.duration:0,width:sourceWidth,height:sourceHeight};
  } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}

export async function audioDuration(file:Blob):Promise<number|undefined> {
  const url=URL.createObjectURL(file),audio=document.createElement('audio');audio.preload='metadata';audio.src=url;
  try { return await new Promise<number|undefined>(resolve=>{audio.onloadedmetadata=()=>resolve(Number.isFinite(audio.duration)?audio.duration:undefined);audio.onerror=()=>resolve(undefined);}); }
  finally { audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url); }
}

export async function listOPFSFiles():Promise<string[]> {
  const result:string[]=[];
  let base:FileSystemDirectoryHandle;
  try { base=await mymRoot(false); } catch { return result; }
  async function walk(dir:FileSystemDirectoryHandle,prefix:string) {
    const entries=(dir as FileSystemDirectoryHandle&{entries():AsyncIterableIterator<[string,FileSystemHandle]>}).entries();
    for await (const [name,handle] of entries) {
      const path=`${prefix}/${name}`;
      if(handle.kind==='file') result.push(path); else await walk(handle as FileSystemDirectoryHandle,path);
    }
  }
  await walk(base,`/${ROOT}`);
  return result;
}

export function humanStorageError(error:unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') return new Error('iPhone 本地存储空间不足，请先备份或清理未使用媒体');
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return new Error('Safari 未允许本地存储，请在系统设置中检查网站数据权限');
  }
  return error instanceof Error ? error : new Error('本地媒体存储失败');
}
