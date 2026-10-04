import Dexie, { type EntityTable } from 'dexie';
import type { Emotion, Entry, Goal, KnowledgeLink, KnowledgeNode, Line, Media, Metric, Setting, Tag, Template, TimelineEvent } from '../types';

export const DATABASE_VERSION = 2;

export class MYMDatabase extends Dexie {
  lines!: EntityTable<Line,'id'>;
  goals!: EntityTable<Goal,'id'>;
  entries!: EntityTable<Entry,'id'>;
  metrics!: EntityTable<Metric,'id'>;
  tags!: EntityTable<Tag,'id'>;
  templates!: EntityTable<Template,'id'>;
  media!: EntityTable<Media,'id'>;
  knowledgeNodes!: EntityTable<KnowledgeNode,'id'>;
  knowledgeLinks!: EntityTable<KnowledgeLink,'id'>;
  emotions!: EntityTable<Emotion,'id'>;
  timelineEvents!: EntityTable<TimelineEvent,'id'>;
  settings!: EntityTable<Setting,'key'>;

  constructor() {
    super('MYMDatabase');
    this.version(1).stores({
      lines:'id, order, archived', goals:'id, status, domainId, updatedAt', entries:'id, createdAt, updatedAt, *domainIds, *goalIds, *tags',
      metrics:'id, entryId, domainId, recordedAt', tags:'id, &name, count, lastUsedAt', templates:'id, order, title', media:'id, kind, createdAt',
      knowledgeNodes:'id, category', knowledgeLinks:'id, source, target', emotions:'id, label', timelineEvents:'id, date, category', settings:'key'
    });
    this.version(DATABASE_VERSION).stores({
      lines:'id, order, archived, preset', goals:'id, status, domainId, order, updatedAt', entries:'id, createdAt, updatedAt, type, templateId, *domainIds, *goalIds, *tags',
      metrics:'id, entryId, domainId, recordedAt', tags:'id, &name, count, lastUsedAt', templates:'id, order, title', media:'id, kind, createdAt',
      knowledgeNodes:'id, category, entryId', knowledgeLinks:'id, source, target', emotions:'id, label', timelineEvents:'id, entryId, date, category', settings:'key'
    }).upgrade(async tx => {
      await tx.table<Line>('lines').toCollection().modify(line => { line.preset ??= line.id === 'fitness' ? 'fitness' : line.id === 'cpa' ? 'study' : 'general'; });
      await tx.table<Goal>('goals').toCollection().modify(goal => { if (goal.order == null) goal.order = 0; });
      await tx.table<Entry>('entries').toCollection().modify(entry => {
        entry.type ??= '日记';
        entry.fieldValues ??= {};
        entry.domainIds ??= [];
        entry.goalIds ??= [];
        entry.tags ??= [];
        entry.media ??= [];
        entry.metrics ??= [];
      });
    });
  }
}

export const db = new MYMDatabase();

const seedTemplates: Template[] = [
  {id:'tp0',title:'空白笔记',description:'自由记录，随心书写',icon:'FileText',fields:[],sections:['补充内容'],defaultTags:[],order:0},
  {id:'tp1',title:'学习笔记',description:'目标、重点、理解、复习',icon:'Notebook',fields:[
    {id:'goal',label:'本次目标',type:'textarea',order:0},{id:'points',label:'重点内容',type:'textarea',order:1},{id:'understanding',label:'我的理解',type:'textarea',order:2}
  ],sections:['补充内容'],defaultTags:['学习'],order:1},
  {id:'tp2',title:'读书笔记',description:'金句、观点、思考',icon:'BookOpen',fields:[
    {id:'book',label:'书名',type:'text',required:true,order:0},{id:'quote',label:'摘录',type:'textarea',order:1},{id:'thought',label:'我的思考',type:'textarea',order:2},{id:'rating',label:'评分',type:'rating',order:3}
  ],sections:['补充内容'],defaultTags:['阅读'],order:2},
  {id:'tp3',title:'课程笔记',description:'课程、要点、行动',icon:'Play',fields:[
    {id:'course',label:'课程',type:'text',order:0},{id:'notes',label:'课程要点',type:'textarea',order:1},{id:'action',label:'下一步',type:'textarea',order:2}
  ],sections:['补充内容'],defaultTags:['学习'],order:3},
  {id:'tp4',title:'会议记录',description:'议题、决策、待办',icon:'Users',fields:[
    {id:'topic',label:'议题',type:'text',order:0},{id:'decision',label:'决策',type:'textarea',order:1},{id:'todos',label:'待办',type:'textarea',order:2}
  ],sections:['补充内容'],defaultTags:['工作'],order:4},
  {id:'tp5',title:'项目记录',description:'目标、进展、问题',icon:'Briefcase',fields:[
    {id:'project',label:'项目',type:'text',order:0},{id:'progress',label:'进展',type:'textarea',order:1},{id:'blocker',label:'问题',type:'textarea',order:2}
  ],sections:['补充内容'],defaultTags:['工作'],order:5},
  {id:'tp6',title:'健身记录',description:'训练内容、感受、数据',icon:'CircleDot',fields:[
    {id:'part',label:'训练部位',type:'select',options:['胸','背','腿','肩','手臂','全身'],order:0},{id:'exercise',label:'动作',type:'textarea',order:1},{id:'weight',label:'重量',type:'number',unit:'kg',order:2},{id:'rpe',label:'RPE',type:'rating',order:3},{id:'state',label:'状态',type:'textarea',order:4}
  ],sections:['补充内容'],defaultTags:['健身','训练'],order:6},
  {id:'tp7',title:'复盘模板',description:'回顾、总结、改进',icon:'RefreshCw',fields:[
    {id:'wins',label:'做得好的',type:'textarea',order:0},{id:'lessons',label:'学到什么',type:'textarea',order:1},{id:'next',label:'下一步',type:'textarea',order:2}
  ],sections:['补充内容'],defaultTags:['复盘'],order:7}
];

export async function ensureSeedData() {
  const [lines, goals, entries, tags, templates] = await Promise.all([
    db.lines.count(), db.goals.count(), db.entries.count(), db.tags.count(), db.templates.count()
  ]);
  if (lines + goals + entries + tags + templates > 0) return;
  const now = new Date().toISOString();
  await db.transaction('rw', [db.lines, db.goals, db.tags, db.templates, db.settings], async () => {
    await db.lines.bulkAdd([
      {id:'fitness',title:'健身',description:'保持训练节奏',order:1,archived:false,preset:'fitness'},
      {id:'cpa',title:'CPA 考试',description:'一次通过，给未来更多可能',order:2,archived:false,preset:'study'},
      {id:'english',title:'英语',description:'每天进步一点',order:3,archived:false,preset:'general'}
    ]);
    await db.goals.bulkAdd([
      {id:'g1',title:'健身',description:'更强壮，更有能量的自己',status:'focus',progress:68,order:1,domainId:'fitness',dueDate:'2027-12-31',createdAt:now,updatedAt:now},
      {id:'g2',title:'CPA 考试',description:'一次通过，给未来更多可能',status:'focus',progress:42,order:2,domainId:'cpa',dueDate:'2027-02-17',createdAt:now,updatedAt:now},
      {id:'g3',title:'英语',description:'可以流畅表达和阅读',status:'active',progress:72,order:3,domainId:'english',createdAt:now,updatedAt:now}
    ]);
    await db.tags.bulkAdd(['健身','CPA','工作','生活','表达','阅读','训练','复盘','学习'].map((name,i)=>({id:`t${i}`,name,count:0,lastUsedAt:now})));
    await db.templates.bulkAdd(seedTemplates);
    await db.settings.put({key:'seedVersion',value:1});
  });
}

export async function clearExampleData() {
  const demoLineIds = ['fitness','cpa','english'];
  const demoGoalIds = ['g1','g2','g3'];
  await db.transaction('rw', [db.lines,db.goals,db.settings], async () => {
    await db.lines.bulkDelete(demoLineIds);
    await db.goals.bulkDelete(demoGoalIds);
    await db.settings.put({key:'exampleDataCleared',value:true});
  });
}

export async function ensureVisualFixtures() {
  await ensureSeedData();
  if(await db.entries.get('fixture-note'))return;
  const dates=['2026-10-04T20:00:00.000Z','2026-10-03T19:20:00.000Z','2026-10-02T07:30:00.000Z'];
  await db.transaction('rw',[db.entries,db.metrics,db.goals,db.knowledgeNodes,db.knowledgeLinks],async()=>{
    await db.goals.update('g3',{status:'focus'});
    await db.entries.bulkPut([
      {id:'fixture-note',title:'审计 · 第三章重点讲解',content:'理解审计风险评估流程\n掌握重要概念和例题\n这一章真正重要的是理解风险从哪里来。',type:'日记',createdAt:dates[0],updatedAt:dates[0],domainIds:['cpa'],goalIds:['g2'],tags:['审计','第三章','重点'],templateId:'tp1',templateSnapshot:{title:'学习笔记',description:'目标、重点、理解、复习',fields:[{id:'goal',label:'本次目标',type:'textarea',order:0},{id:'points',label:'重点内容',type:'textarea',order:1}],sections:['补充内容'],defaultTags:['学习']},fieldValues:{goal:'理解风险评估流程',points:'重要性水平与重大错报风险'},media:[],metrics:[]},
      {id:'fixture-fitness',title:'背部训练',content:'状态很好，重量提升了。',type:'日记',createdAt:dates[1],updatedAt:dates[1],domainIds:['fitness'],goalIds:['g1'],tags:['健身','训练'],media:[],metrics:[]},
      {id:'fixture-run',title:'晨跑 5 km',content:'早上的空气真好，感觉充满能量。',type:'日记',createdAt:dates[2],updatedAt:dates[2],domainIds:['fitness'],goalIds:['g1'],tags:['健身'],media:[],metrics:[]},
      {id:'fixture-cpa2',title:'会计分录练习',content:'完成合并报表分录练习。',type:'日记',createdAt:'2026-10-01T19:20:00.000Z',updatedAt:'2026-10-01T19:20:00.000Z',domainIds:['cpa'],goalIds:['g2'],tags:['会计','真题'],media:[],metrics:[]},
      {id:'fixture-cpa3',title:'税法知识点整理',content:'整理增值税重点内容。',type:'日记',createdAt:'2026-09-30T18:30:00.000Z',updatedAt:'2026-09-30T18:30:00.000Z',domainIds:['cpa'],goalIds:['g2'],tags:['税法'],media:[],metrics:[]}
    ]);
    await db.metrics.bulkPut([
      {id:'fm1',domainId:'fitness',name:'体重',value:72.4,unit:'kg',recordedAt:dates[0]},
      {id:'fm2',domainId:'fitness',name:'体脂率',value:18.3,unit:'%',recordedAt:dates[0]},
      {id:'fm3',domainId:'fitness',name:'力量',value:12,unit:'%',recordedAt:dates[0]},
      {id:'cm1',domainId:'cpa',name:'会计',value:60,unit:'%',recordedAt:dates[0]},
      {id:'cm2',domainId:'cpa',name:'审计',value:35,unit:'%',recordedAt:dates[0]},
      {id:'cm3',domainId:'cpa',name:'财管',value:28,unit:'%',recordedAt:dates[0]},
      {id:'cm4',domainId:'cpa',name:'税法',value:45,unit:'%',recordedAt:dates[0]}
    ]);
    await db.knowledgeNodes.bulkPut([
      {id:'kn1',title:'CPA 考试',category:'CPA',entryId:'fixture-note',x:196,y:175,count:3},
      {id:'kn2',title:'审计',category:'CPA',entryId:'fixture-note',x:82,y:63,count:1},
      {id:'kn3',title:'会计',category:'CPA',entryId:'fixture-cpa2',x:292,y:58,count:1},
      {id:'kn4',title:'财管',category:'CPA',entryId:'fixture-note',x:335,y:137,count:1},
      {id:'kn5',title:'税法',category:'CPA',entryId:'fixture-cpa3',x:312,y:252,count:1},
      {id:'kn6',title:'真题',category:'CPA',entryId:'fixture-note',x:86,y:273,count:1},
      {id:'kn7',title:'资料',category:'CPA',entryId:'fixture-note',x:198,y:309,count:1}
    ]);
    await db.knowledgeLinks.bulkPut(['kn2','kn3','kn4','kn5','kn6','kn7'].map((target,index)=>({id:`kl${index+1}`,source:'kn1',target})));
  });
}
