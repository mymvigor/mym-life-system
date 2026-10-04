import Dexie, { type EntityTable } from 'dexie';
import type { Emotion, Entry, Goal, KnowledgeLink, KnowledgeNode, Line, Media, Metric, Setting, Tag, Template, TimelineEvent } from '../types';

export class MYMDatabase extends Dexie {
  lines!: EntityTable<Line,'id'>; goals!: EntityTable<Goal,'id'>; entries!: EntityTable<Entry,'id'>;
  metrics!: EntityTable<Metric,'id'>; tags!: EntityTable<Tag,'id'>; templates!: EntityTable<Template,'id'>;
  media!: EntityTable<Media,'id'>; knowledgeNodes!: EntityTable<KnowledgeNode,'id'>;
  knowledgeLinks!: EntityTable<KnowledgeLink,'id'>; emotions!: EntityTable<Emotion,'id'>;
  timelineEvents!: EntityTable<TimelineEvent,'id'>; settings!: EntityTable<Setting,'key'>;
  constructor() {
    super('MYMDatabase');
    this.version(1).stores({
      lines:'id, order, archived', goals:'id, status, domainId, updatedAt', entries:'id, createdAt, updatedAt, *domainIds, *goalIds, *tags',
      metrics:'id, entryId, domainId, recordedAt', tags:'id, &name, count, lastUsedAt', templates:'id, order, title', media:'id, kind, createdAt',
      knowledgeNodes:'id, category', knowledgeLinks:'id, source, target', emotions:'id, label', timelineEvents:'id, date, category', settings:'key'
    });
  }
}
export const db = new MYMDatabase();

export async function ensureSeedData() {
  if (await db.goals.count()) return;
  const now = new Date().toISOString();
  await db.transaction('rw', [db.lines,db.goals,db.tags,db.templates], async () => {
    await db.lines.bulkAdd([
      {id:'fitness',title:'健身',description:'保持训练节奏',cover:'/design-reference/02_fitness.png',order:1,archived:false},
      {id:'cpa',title:'CPA 考试',description:'一次通过，给未来更多可能',cover:'/design-reference/03_cpa.png',order:2,archived:false},
      {id:'english',title:'英语',description:'每天进步一点',cover:'/design-reference/01_home.png',order:3,archived:false}
    ]);
    await db.goals.bulkAdd([
      {id:'g1',title:'健身',description:'更强壮，更有能量的自己',status:'focus',progress:68,domainId:'fitness',cover:'/design-reference/02_fitness.png',createdAt:now,updatedAt:now},
      {id:'g2',title:'CPA 考试',description:'一次通过，给未来更多可能',status:'focus',progress:42,domainId:'cpa',cover:'/design-reference/03_cpa.png',createdAt:now,updatedAt:now},
      {id:'g3',title:'英语',description:'可以流畅表达和阅读',status:'active',progress:72,domainId:'english',cover:'/design-reference/01_home.png',createdAt:now,updatedAt:now},
      {id:'g4',title:'阅读',description:'每年 30 本书',status:'active',progress:30,createdAt:now,updatedAt:now},
      {id:'g5',title:'旅行',description:'去更多想去的地方',status:'active',progress:20,createdAt:now,updatedAt:now}
    ]);
    await db.tags.bulkAdd(['健身','CPA','工作','生活','表达','阅读','训练','复盘','航运'].map((name,i)=>({id:`t${i}`,name,count:[18,34,27,16,12,9,21,14,31][i],lastUsedAt:now})));
    const titles=[['空白笔记','自由记录，随心书写','FileText'],['学习笔记','目标、重点、理解、复习','Notebook'],['读书笔记','金句、观点、思考','BookOpen'],['课程笔记','视频课程、要点整理','Play'],['会议记录','议题、决策、待办','Users'],['项目记录','目标、进展、问题','Briefcase'],['健身记录','训练内容、感受、数据','CircleDot'],['复盘模板','回顾、总结、改进','RefreshCw']];
    await db.templates.bulkAdd(titles.map(([title,description,icon],i)=>({id:`tp${i}`,title,description,icon,fields:[],sections:[],defaultTags:[],order:i})));
  });
}
