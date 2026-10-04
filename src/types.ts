export type GoalStatus = 'focus' | 'active' | 'paused' | 'done';
export interface Line { id:string; title:string; description?:string; cover?:string; order:number; archived:boolean; }
export interface Goal { id:string; title:string; description:string; status:GoalStatus; progress:number; dueDate?:string; cover?:string; domainId?:string; createdAt:string; updatedAt:string; }
export interface Entry { id:string; title?:string; content:string; createdAt:string; updatedAt:string; domainIds:string[]; goalIds:string[]; tags:string[]; templateId?:string; emotion?:string; media:string[]; metrics:string[]; }
export interface Metric { id:string; entryId?:string; domainId?:string; name:string; value:number; unit:string; recordedAt:string; }
export interface Tag { id:string; name:string; count:number; lastUsedAt:string; }
export interface TemplateField { id:string; label:string; type:'text'|'textarea'|'number'|'date'|'checkbox'|'select'|'rating'|'media'|'metric'; }
export interface Template { id:string; title:string; description:string; icon:string; fields:TemplateField[]; sections:string[]; defaultTags:string[]; order:number; }
export interface Media { id:string; kind:'image'|'video'|'audio'|'file'; opfsPath:string; thumbnailPath?:string; mime:string; size:number; duration?:number; width?:number; height?:number; createdAt:string; title?:string; }
export interface KnowledgeNode { id:string; title:string; category:string; mediaId?:string; x:number; y:number; count:number; }
export interface KnowledgeLink { id:string; source:string; target:string; }
export interface Emotion { id:string; label:string; value:number; }
export interface TimelineEvent { id:string; entryId:string; date:string; category:string; }
export interface Setting { key:string; value:unknown; }
