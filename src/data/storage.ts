import type { StorageStatus } from '../types';

export async function requestPersistentStorage():Promise<StorageStatus> {
  let persisted=false;
  try {persisted=await navigator.storage.persisted();if(!persisted)persisted=await navigator.storage.persist();} catch {persisted=false;}
  const estimate=await navigator.storage.estimate();
  return {persisted,usage:estimate.usage??0,quota:estimate.quota??0};
}

export function formatBytes(value:number) {
  if(!value)return '0 MB';
  const units=['B','KB','MB','GB','TB'];let size=value,index=0;
  while(size>=1024&&index<units.length-1){size/=1024;index+=1;}
  return `${size.toFixed(index>=3?2:index===2?1:0)} ${units[index]}`;
}
