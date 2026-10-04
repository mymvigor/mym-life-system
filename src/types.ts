export type GoalStatus = 'focus' | 'active' | 'paused' | 'done';
export type DomainPreset = 'fitness' | 'study' | 'general';
export type MediaKind = 'image' | 'video' | 'audio' | 'file';
export type TemplateFieldType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select' | 'rating' | 'media' | 'metric';

export interface Line {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  order: number;
  archived: boolean;
  preset?: DomainPreset;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  progress: number;
  order?: number;
  dueDate?: string;
  cover?: string;
  domainId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateField {
  id: string;
  label: string;
  type: TemplateFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  unit?: string;
  order?: number;
}

export interface TemplateSnapshot {
  title: string;
  description: string;
  fields: TemplateField[];
  sections: string[];
  defaultTags: string[];
}

export type TemplateFieldValue = string | number | boolean | string[] | null;

export interface Entry {
  id: string;
  title?: string;
  content: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
  domainIds: string[];
  goalIds: string[];
  tags: string[];
  templateId?: string;
  templateSnapshot?: TemplateSnapshot;
  fieldValues?: Record<string, TemplateFieldValue>;
  emotion?: string;
  media: string[];
  metrics: string[];
}

export interface Metric { id:string; entryId?:string; domainId?:string; name:string; value:number; unit:string; recordedAt:string; }
export interface Tag { id:string; name:string; count:number; lastUsedAt:string; }
export interface Template { id:string; title:string; description:string; icon:string; fields:TemplateField[]; sections:string[]; defaultTags:string[]; order:number; }
export interface Media { id:string; kind:MediaKind; opfsPath:string; thumbnailPath?:string; mime:string; size:number; duration?:number; width?:number; height?:number; createdAt:string; title?:string; }
export interface KnowledgeNode { id:string; title:string; category:string; mediaId?:string; entryId?:string; x:number; y:number; count:number; }
export interface KnowledgeLink { id:string; source:string; target:string; }
export interface Emotion { id:string; label:string; value:number; }
export interface TimelineEvent { id:string; entryId:string; date:string; category:string; }
export interface Setting { key:string; value:unknown; }

export interface StorageStatus { persisted:boolean; usage:number; quota:number; }
