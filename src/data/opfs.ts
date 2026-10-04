const ROOT='MYM';
async function root() { const origin=await navigator.storage.getDirectory(); return origin.getDirectoryHandle(ROOT,{create:true}); }
export async function saveMedia(file:File, kind:'images'|'videos'|'audio'|'attachments') {
  const dir=await (await root()).getDirectoryHandle(kind,{create:true});
  const name=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const handle=await dir.getFileHandle(name,{create:true}); const writable=await handle.createWritable(); await writable.write(file); await writable.close();
  return `/${ROOT}/${kind}/${name}`;
}
export async function saveThumbnail(blob:Blob) {
  const dir=await (await root()).getDirectoryHandle('thumbnails',{create:true}); const name=`${crypto.randomUUID()}.webp`;
  const handle=await dir.getFileHandle(name,{create:true}); const writable=await handle.createWritable(); await writable.write(blob); await writable.close(); return `/${ROOT}/thumbnails/${name}`;
}
export async function videoThumbnail(file:File):Promise<Blob> {
  const url=URL.createObjectURL(file); const video=document.createElement('video'); video.preload='metadata'; video.muted=true; video.src=url;
  await new Promise<void>((resolve,reject)=>{video.onloadedmetadata=()=>{video.currentTime=Math.min(1,Math.max(0,video.duration/4));};video.onseeked=()=>resolve();video.onerror=()=>reject(video.error);});
  const canvas=document.createElement('canvas'); canvas.width=480; canvas.height=Math.round(480*(video.videoHeight/video.videoWidth||.5625));
  canvas.getContext('2d')!.drawImage(video,0,0,canvas.width,canvas.height); URL.revokeObjectURL(url);
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('thumbnail failed')),'image/webp',.82));
}
