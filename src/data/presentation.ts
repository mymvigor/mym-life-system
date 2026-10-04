import type { Entry, Line, Media, TemplateFieldValue } from '../types';

export interface EntryPresentation {
  displayTitle:string;
  previewText:string;
  date:string;
  time:string;
  thumbnail?:string;
  mediaKind?:Media['kind'];
  duration?:number;
  tags:string[];
  domain?:Line;
}

function meaningfulText(value:TemplateFieldValue|undefined) {
  if(Array.isArray(value))return value.join(' ');
  if(typeof value==='boolean')return value?'是':'';
  return value==null?'':String(value).trim();
}

function cleanTitle(text:string) {
  return text.replace(/^[-–—•*\d.、\s]+/,'').replace(/#[^\s#]+/g,'').replace(/\s+/g,' ').trim();
}

export function toEntryPresentation(entry:Entry,media:Media[]=[],lines:Line[]=[]):EntryPresentation {
  const coreField=entry.templateSnapshot?.fields.sort((a,b)=>(a.order??0)-(b.order??0)).map(field=>meaningfulText(entry.fieldValues?.[field.id])).find(Boolean);
  const firstBody=entry.content.split(/\r?\n/).map(cleanTitle).find(line=>line.length>1);
  const fallback=entry.type||entry.templateSnapshot?.title||'记录';
  const source=cleanTitle(entry.title||firstBody||coreField||fallback);
  const displayTitle=source.length>30?`${source.slice(0,30)}…`:source;
  const previewSource=cleanTitle(entry.content)||coreField||entry.templateSnapshot?.description||'';
  const previewText=previewSource.length>62?`${previewSource.slice(0,62)}…`:previewSource;
  const dateValue=new Date(entry.createdAt);
  const primary=selectPrimaryMedia(entry,media);
  return {
    displayTitle,previewText,
    date:new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric'}).format(dateValue),
    time:new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}).format(dateValue),
    thumbnail:primary?.thumbnailPath||(primary?.kind==='image'?primary.opfsPath:undefined),
    mediaKind:primary?.kind,duration:primary?.duration,tags:entry.tags,
    domain:lines.find(line=>entry.domainIds.includes(line.id))
  };
}

export function selectPrimaryMedia(entry:Entry,media:Media[]) {
  const linked=media.filter(item=>entry.media.includes(item.id));
  return linked.find(item=>item.kind==='image'&&Boolean(item.thumbnailPath))
    ||linked.find(item=>item.kind==='video'&&Boolean(item.thumbnailPath))
    ||linked.find(item=>item.kind==='image')
    ||linked.find(item=>item.kind==='video')
    ||linked[0];
}

export function formatDuration(value?:number) {
  if(!value||!Number.isFinite(value))return '';
  const minutes=Math.floor(value/60),seconds=Math.floor(value%60);
  return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
