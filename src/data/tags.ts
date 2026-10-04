import { db } from './db';

export function normalizeTag(value:string){return value.trim().replace(/^#+/,'').replace(/\s+/g,' ');}

export async function recalculateTagCounts() {
  await db.transaction('rw',[db.entries,db.tags],async()=>{
    const [entries,tags]=await Promise.all([db.entries.toArray(),db.tags.toArray()]);
    const stats=new Map<string,{count:number;lastUsedAt:string}>();
    for(const entry of entries){
      for(const name of new Set(entry.tags.map(normalizeTag).filter(Boolean))){
        const current=stats.get(name)??{count:0,lastUsedAt:''};
        current.count+=1;if(entry.createdAt>current.lastUsedAt)current.lastUsedAt=entry.createdAt;stats.set(name,current);
      }
    }
    const existing=new Map(tags.map(tag=>[tag.name,tag]));
    for(const [name,stat] of stats){
      const tag=existing.get(name);
      if(tag)await db.tags.update(tag.id,stat);else await db.tags.add({id:crypto.randomUUID(),name,...stat});
    }
    for(const tag of tags)if(!stats.has(tag.name))await db.tags.update(tag.id,{count:0,lastUsedAt:''});
  });
}

export async function ensureTags(names:string[]) {
  const clean=Array.from(new Set(names.map(normalizeTag).filter(Boolean)));
  await db.transaction('rw',db.tags,async()=>{
    for(const name of clean)if(!await db.tags.where('name').equals(name).first())await db.tags.add({id:crypto.randomUUID(),name,count:0,lastUsedAt:''});
  });
  return clean;
}

export async function renameTag(tagId:string,nextValue:string) {
  const next=normalizeTag(nextValue);if(!next)throw new Error('标签名称不能为空');
  const [sourceBefore,existingBefore]=await Promise.all([db.tags.get(tagId),db.tags.where('name').equals(next).first()]);
  if(!sourceBefore)throw new Error('标签不存在');
  if(existingBefore&&existingBefore.id!==tagId){await mergeTags([tagId],existingBefore.id);return;}
  await db.transaction('rw',[db.tags,db.entries,db.templates],async()=>{
    const source=await db.tags.get(tagId);if(!source)throw new Error('标签不存在');
    const entries=await db.entries.where('tags').equals(source.name).toArray();
    for(const entry of entries)await db.entries.update(entry.id,{tags:Array.from(new Set(entry.tags.map(name=>name===source.name?next:name)))});
    const templates=await db.templates.toArray();
    for(const template of templates)if(template.defaultTags.includes(source.name))await db.templates.update(template.id,{defaultTags:Array.from(new Set(template.defaultTags.map(name=>name===source.name?next:name)))});
    await db.tags.update(tagId,{name:next});
  });
  await recalculateTagCounts();
}

export async function mergeTags(sourceIds:string[],targetIdOrName:string) {
  await db.transaction('rw',[db.tags,db.entries,db.templates],async()=>{
    const all=await db.tags.toArray();
    let target=all.find(tag=>tag.id===targetIdOrName||tag.name===normalizeTag(targetIdOrName));
    if(!target){target={id:crypto.randomUUID(),name:normalizeTag(targetIdOrName),count:0,lastUsedAt:''};if(!target.name)throw new Error('目标标签不能为空');await db.tags.add(target);}
    const sources=all.filter(tag=>sourceIds.includes(tag.id)&&tag.id!==target!.id);
    const sourceNames=new Set(sources.map(tag=>tag.name));
    const entries=await db.entries.toArray();
    for(const entry of entries)if(entry.tags.some(name=>sourceNames.has(name)))await db.entries.update(entry.id,{tags:Array.from(new Set(entry.tags.map(name=>sourceNames.has(name)?target!.name:name)))});
    const templates=await db.templates.toArray();
    for(const template of templates)if(template.defaultTags.some(name=>sourceNames.has(name)))await db.templates.update(template.id,{defaultTags:Array.from(new Set(template.defaultTags.map(name=>sourceNames.has(name)?target!.name:name)))});
    await db.tags.bulkDelete(sources.map(tag=>tag.id));
  });
  await recalculateTagCounts();
}

export async function deleteTag(tagId:string) {
  await db.transaction('rw',[db.tags,db.entries,db.templates],async()=>{
    const source=await db.tags.get(tagId);if(!source)return;
    const entries=await db.entries.where('tags').equals(source.name).toArray();
    for(const entry of entries)await db.entries.update(entry.id,{tags:entry.tags.filter(name=>name!==source.name)});
    const templates=await db.templates.toArray();
    for(const template of templates)if(template.defaultTags.includes(source.name))await db.templates.update(template.id,{defaultTags:template.defaultTags.filter(name=>name!==source.name)});
    await db.tags.delete(tagId);
  });
}
