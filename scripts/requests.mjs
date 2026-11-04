#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

export const flags={
 help:[],requests:[],request:['request'],'deadline-desk':[],overdue:[], 'search-queue':[],'review-queue':[],stale:[],
 'department-load':[],'time-summary':[],compliance:[],activity:[],
 'add-request':['number','summary','received','due','basis','jurisdiction','department','owner','actor'],
 'set-deadline':['request','due','basis','jurisdiction','actor'],
 'assign-search':['request','department','owner','scope','due','actor'],
 'complete-search':['search','date','result','evidence','actor'],
 'add-record':['request','reference','description','pages','source','checksum','actor'],
 'review-record':['record','disposition','authority','reason','copy','actor'],
 extend:['request','due','reason','authority','notified','evidence','actor'],
 'record-response':['request','outcome','reason','authority','complaint-notice','date','evidence','actor'],
 'log-time':['request','date','minutes','task','actor'],
 'log-note':['request','note','actor'],
 import:['file','map','date-format','dry-run','actor'],export:['out'],
 'weekly-review':[],'draft-ack':['request'],'draft-search':['search'],'draft-response':['request']
};
export const commands=Object.keys(flags);
export function parse(args){
 const [cmd='help',...rest]=args; if(!flags[cmd])throw Error(`Unknown command ${cmd}. Use help.`);
 const f={};
 if(cmd==='import'){if(rest.shift()!=='nextrequest')throw Error('Use import nextrequest --file=export.csv');}
 for(const a of rest){const m=a.match(/^--([a-z-]+)(?:=(.*))?$/s);if(!m)throw Error('Use --name=value flags; unexpected '+a);
  const [,k,v]=m;if(!['json',...flags[cmd]].includes(k))throw Error('Unknown flag --'+k);if(k in f)throw Error('Duplicate flag --'+k);
  if(['json','dry-run'].includes(k)){if(v!==undefined)throw Error('--'+k+' takes no value');f[k]=true;}
  else{if(v===undefined||!v.trim())throw Error('--'+k+' requires a value');f[k]=v;}
 }return {cmd,f};
}
const required=(f,k)=>{const v=String(f[k]??'').trim();if(!v)throw Error('Required --'+k);return v;};
export function date(v,format='iso'){
 let s=String(v||'').trim();if(format!=='iso'&&/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){const [a,b,y]=s.split('/');s=`${y}-${(format==='mdy'?a:b).padStart(2,'0')}-${(format==='mdy'?b:a).padStart(2,'0')}`;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Use a valid ISO date YYYY-MM-DD; slash dates require --date-format=mdy or dmy');return s;
}
const today=()=>new Date().toISOString().slice(0,10);
const past=(v)=>{const d=date(v);if(d>today())throw Error('Evidence date cannot be in the future');return d;};
const integer=(v,min=1,max=2147483647)=>{if(!/^\d+$/.test(String(v)))throw Error('Expected a whole number');const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`Number must be between ${min} and ${max}`);return n;};
const allowed=(v,values)=>{if(!values.includes(v))throw Error('Choose '+values.join(', '));return v;};
async function transaction(db,fn,rollback=false){await db.exec('BEGIN');try{const result=await fn();await db.exec(rollback?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function resolve(db,kind,value,lock=false){
 const specs={request:['requests','number','summary'],search:['search_tasks','id::text','scope'],record:['records','reference','description']};
 const [tab,key,label]=specs[kind];
 let rows=await db.query(`SELECT * FROM ${tab} WHERE lower(${key})=lower($1) OR id::text=$1 ORDER BY id${lock?' FOR UPDATE':''}`,[value]);
 if(!rows.length)rows=await db.query(`SELECT * FROM ${tab} WHERE starts_with(id::text,lower($1)) OR position(lower($1) in lower(${label}))>0 ORDER BY id${lock?' FOR UPDATE':''}`,[value]);
 if(rows.length!==1)throw Error(rows.length?'Ambiguous '+kind+':\n'+rows.map(r=>`${r.id} ${r.number||r.reference||''} ${r.summary||r.scope||r.description}`).join('\n'):'No match for '+kind+': '+value);
 return rows[0];
}
async function openRequest(db,value){const r=await resolve(db,'request',value,true);if(r.state!=='open')throw Error('Request is closed');return r;}
async function audit(db,r,action,actor,detail){await db.query('INSERT INTO activity(request_id,action,actor,detail) VALUES($1,$2,$3,$4)',[r||null,action,actor,JSON.stringify(detail)]);}
const select={
 requests:'SELECT id,number,summary,department,owner,state,received_on,due_on FROM requests ORDER BY number',
 'deadline-desk':'SELECT number,summary,owner,due_on,days_left,searches_open,reviews_open FROM deadline_desk ORDER BY due_on NULLS FIRST,number',
 overdue:'SELECT number,owner,due_on,days_left,searches_open,reviews_open FROM deadline_desk WHERE due_on<current_date ORDER BY due_on,number',
 'search-queue':'SELECT * FROM search_queue ORDER BY due_on,number',
 'review-queue':'SELECT * FROM review_queue ORDER BY number,reference',
 stale:`SELECT r.number,r.owner,r.received_on,coalesce(max(a.created_at)::date,r.received_on) AS last_work FROM requests r LEFT JOIN activity a ON a.request_id=r.id WHERE r.state='open' GROUP BY r.id HAVING coalesce(max(a.created_at)::date,r.received_on)<current_date-14 ORDER BY last_work,r.number`,
 'department-load':`SELECT department,count(*)::integer AS open_requests,count(*) FILTER(WHERE due_on<current_date)::integer AS overdue,count(*) FILTER(WHERE due_on IS NULL)::integer AS unconfirmed_deadlines FROM requests WHERE state='open' GROUP BY department ORDER BY department`,
 'time-summary':`SELECT r.number,r.department,coalesce(sum(t.minutes),0)::integer AS recorded_minutes,count(t.id)::integer AS entries FROM requests r LEFT JOIN time_entries t ON t.request_id=r.id GROUP BY r.id ORDER BY recorded_minutes DESC,r.number`,
 compliance:'SELECT number,rule,finding FROM compliance_findings ORDER BY number,rule',
 activity:'SELECT a.id,r.number,a.action,a.actor,a.detail,a.created_at FROM activity a LEFT JOIN requests r ON r.id=a.request_id ORDER BY a.created_at,a.id'
};
async function dossier(db,value){
 const r=await resolve(db,'request',value);const out={request:r};
 for(const t of ['search_tasks','records','extensions','responses','time_entries','activity'])out[t]=await db.query(`SELECT * FROM ${t} WHERE request_id=$1 ORDER BY created_at,id`,[r.id]);
 out.reviews=await db.query('SELECT v.* FROM reviews v JOIN records d ON d.id=v.record_id WHERE d.request_id=$1 ORDER BY v.created_at,v.id',[r.id]);return out;
}
function saveDraft(label,body){const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true,mode:0o700});const file=path.join(dir,label+'-'+randomUUID()+'.md');fs.writeFileSync(file,body,{flag:'wx',mode:0o600});return {file,draft:true};}
function asText(value){if(Array.isArray(value)){if(!value.length)return '(none)';return table(value,Object.keys(value[0]).map(k=>({key:k,label:k,width:70,format:v=>v&&typeof v==='object'?JSON.stringify(v):v})));}return JSON.stringify(value,null,2);}
async function importRequests(db,f){
 const actor=required(f,'actor'),original=fs.readFileSync(required(f,'file'),'utf8');
 const map=f.map?JSON.parse(fs.readFileSync(f.map,'utf8')):{};const fields=map.fields||{};
 if(typeof fields!=='object'||Array.isArray(fields))throw Error('map.fields must be an object');
 const permitted=['number','summary','received','due','department','owner','status'];for(const k of Object.keys(fields))if(!permitted.includes(k)||typeof fields[k]!=='string')throw Error('Unknown mapping field '+k);
 const format=allowed(f['date-format']||'iso',['iso','mdy','dmy']);const rows=parseCsv(original);if(!rows.length)throw Error('No CSV data rows');
 const digest=createHash('sha256').update(JSON.stringify({original,map,format})).digest('hex');
 return transaction(db,async()=>{
  if((await db.query('SELECT id FROM imports WHERE digest=$1',[digest])).length)return {imported:0,already_imported:true};
  const imp=(await db.query('INSERT INTO imports(digest,original_csv,mapping,actor) VALUES($1,$2,$3,$4) RETURNING id',[digest,original,JSON.stringify({map,format}),actor]))[0];
  const seen=new Set();let imported=0;
  for(const row of rows){
   const get=(key,...aliases)=>fields[key]?pick(row,fields[key]):pick(row,...aliases);
   const number=get('number','Request Number','Request ID','Number').trim();const summary=get('summary','Request Text','Request Description','Description').trim();
   if(!number||!summary)throw Error('Request number and description columns required; supply --map if headings differ');
   if(seen.has(number.toLowerCase()))throw Error('Duplicate request number '+number);seen.add(number.toLowerCase());
   const source=get('status','Status').trim();const state=(map.statuses||{})[source]||({open:'open',closed:'closed'})[source.toLowerCase()];
   if(!['open','closed'].includes(state))throw Error('Unmapped source status '+source+'; add map.statuses');
   const received=date(get('received','Date Received','Received At','Created At','Submitted At'),format);
   const dueText=get('due','Due Date','Due At');const due=dueText?date(dueText,format):null;
   if(received>today())throw Error('Received date cannot be in the future');
   const old=await db.query('SELECT id,source_row FROM requests WHERE lower(number)=lower($1)',[number]);
   if(old.length){if(!isDeepStrictEqual(old[0].source_row,row))throw Error('Existing request would be overwritten: '+number);continue;}
   const r=(await db.query(`INSERT INTO requests(number,summary,received_on,original_due,due_on,department,owner,state,imported_closed,source_status,source_row,import_id)
    VALUES($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,[number,summary,received,due,get('department','Department')||'Unassigned',get('owner','Staff','Assigned To','Owner')||'Unassigned',state,state==='closed',source,JSON.stringify(row),imp.id]))[0];
   await audit(db,r.id,'import',actor,{source:'NextRequest',import_id:imp.id});imported++;
  }
  return {imported,dry_run:!!f['dry-run'],deadline_review:'Imported deadlines and closed statuses require evidence review'};
 },!!f['dry-run']);
}
export async function run(db,cmd,f={}){
 if(select[cmd])return db.query(select[cmd]);
 if(cmd==='help')return commands.map(command=>({command,flags:flags[command].map(x=>'--'+x).join(' ')}));
 if(cmd==='request')return dossier(db,required(f,'request'));
 if(cmd==='import')return importRequests(db,f);
 if(cmd==='export')return transaction(db,async()=>{const records={};for(const t of ['schema_migrations','requests','search_tasks','records','reviews','extensions','responses','time_entries','activity','imports'])records[t]=await db.query(`SELECT * FROM ${t}`);const file=path.resolve(required(f,'out'));fs.writeFileSync(file,JSON.stringify({format:'records-requests-v1',exported_at:new Date().toISOString(),records},null,2)+'\n',{flag:'wx',mode:0o600});return {file,collections:Object.keys(records).length};});
 if(cmd==='weekly-review'){const chunks=[];for(const c of ['deadline-desk','search-queue','review-queue'])chunks.push('## '+c+'\n\n'+asText(await run(db,c)));return saveDraft('weekly-review','# Weekly records review\n\nInternal working draft. Check source evidence before any response.\n\n'+chunks.join('\n\n')+'\n');}
 if(cmd==='draft-ack'){const {request:r}=await dossier(db,required(f,'request'));return saveDraft('acknowledgement',`# Acknowledgement draft: ${r.number}\n\nDRAFT. Internal review only.\n\nWe recorded your request on ${r.received_on}: ${r.summary}.\n\nRecorded response deadline: ${r.due_on||'not yet reviewed'}. Basis: ${r.deadline_basis||'not yet reviewed'}.\n\nVerify the recipient, scope and deadline before sending outside this tool.\n`);}
 if(cmd==='draft-search'){const t=await resolve(db,'search',required(f,'search'));const r=await resolve(db,'request',t.request_id);return saveDraft('search-instruction',`# Search instruction draft: ${r.number}\n\nInternal working draft for ${t.owner}, ${t.department}.\n\nScope: ${t.scope}\nDue: ${t.due_on}\n\nRecord sources searched, date range, results (including no records), and an evidence reference. Return responsive records for review. Do not disclose them from this draft.\n`);}
 if(cmd==='draft-response'){const d=await dossier(db,required(f,'request'));return saveDraft('response',`# Response working draft: ${d.request.number}\n\nINTERNAL ONLY. Contains review references and must not be sent as a release pack.\n\nScope: ${d.request.summary}\nRecorded due: ${d.request.due_on||'unreviewed'}\n\n## Document review schedule\n\n${asText(d.reviews)}\n\n## Recorded response evidence\n\n${asText(d.responses)}\n\nThe authorised officer must write and verify the decision, legal grounds, complaint rights, recipient and reviewed attachments. No legal decision or disclosure is generated by this draft.\n`);}
 if(!flags[cmd])throw Error('Unknown command '+cmd);
 const actor=required(f,'actor');
 return transaction(db,async()=>{
  let result,r;
  if(cmd==='add-request'){
   const received=past(required(f,'received'));const due=f.due?date(f.due):null;
   const basis=due?required(f,'basis'):'';const jurisdiction=due?required(f,'jurisdiction'):'UNREVIEWED';
   const number=required(f,'number');if((await db.query('SELECT id FROM requests WHERE lower(number)=lower($1)',[number])).length)throw Error('Duplicate request number');
   result=(await db.query(`INSERT INTO requests(number,summary,received_on,original_due,due_on,deadline_basis,jurisdiction,department,owner) VALUES($1,$2,$3,$4,$4,$5,$6,$7,$8) RETURNING *`,[number,required(f,'summary'),received,due,basis,jurisdiction,required(f,'department'),required(f,'owner')]))[0];r=result;
  }else if(cmd==='complete-search'){
   const t=await resolve(db,'search',required(f,'search'),true);r=await openRequest(db,t.request_id);if(t.completed_on)throw Error('Search already complete');const done=past(required(f,'date'));if(done<r.received_on)throw Error('Search date precedes request');
   result=(await db.query('UPDATE search_tasks SET completed_on=$1,result=$2,evidence=$3 WHERE id=$4 RETURNING *',[done,required(f,'result'),required(f,'evidence'),t.id]))[0];
  }else if(cmd==='review-record'){
   const d=await resolve(db,'record',required(f,'record'));r=await openRequest(db,d.request_id);
   const disposition=allowed(required(f,'disposition'),['release','redact','withhold']);const copy=disposition==='redact'?required(f,'copy'):(f.copy||'');
   result=(await db.query('INSERT INTO reviews(record_id,disposition,authority,reason,reviewed_copy,actor) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[d.id,disposition,required(f,'authority'),required(f,'reason'),copy,actor]))[0];
  }else{
   r=await openRequest(db,required(f,'request'));
   if(cmd==='set-deadline'){
    const due=date(required(f,'due'));if(r.due_on&&r.due_on!==due)throw Error('Existing deadline cannot be overwritten. Record an evidenced extension; corrections require a reviewed migration.');
    result=(await db.query('UPDATE requests SET due_on=$1,original_due=coalesce(original_due,$1),deadline_basis=$2,jurisdiction=$3 WHERE id=$4 RETURNING *',[due,required(f,'basis'),required(f,'jurisdiction'),r.id]))[0];
   }else if(cmd==='assign-search'){
    const due=date(required(f,'due'));if(due<r.received_on)throw Error('Search deadline precedes request');
    result=(await db.query('INSERT INTO search_tasks(request_id,department,owner,scope,due_on) VALUES($1,$2,$3,$4,$5) RETURNING *',[r.id,required(f,'department'),required(f,'owner'),required(f,'scope'),due]))[0];
   }else if(cmd==='add-record'){
    const checksum=required(f,'checksum').toLowerCase();if(!/^[0-9a-f]{64}$/.test(checksum))throw Error('Checksum must be a SHA-256 hex digest');
    result=(await db.query('INSERT INTO records(request_id,reference,description,pages,source_ref,checksum) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[r.id,required(f,'reference'),required(f,'description'),integer(required(f,'pages')),required(f,'source'),checksum]))[0];
   }else if(cmd==='extend'){
    if(!r.due_on||!r.deadline_basis||r.jurisdiction==='UNREVIEWED')throw Error('Review original deadline before extension');
    const due=date(required(f,'due')),notified=past(required(f,'notified'));if(notified<r.received_on)throw Error('Notice precedes request');
    result=(await db.query('INSERT INTO extensions(request_id,old_due,new_due,reason,authority,notified_on,notice_ref,actor) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[r.id,r.due_on,due,required(f,'reason'),required(f,'authority'),notified,required(f,'evidence'),actor]))[0];
    await db.query('UPDATE requests SET due_on=$1 WHERE id=$2',[due,r.id]);
   }else if(cmd==='record-response'){
    const outcome=allowed(required(f,'outcome'),['full','partial','refused','withdrawn','transferred']);
    if((await db.query('SELECT id FROM search_tasks WHERE request_id=$1 AND completed_on IS NULL',[r.id])).length)throw Error('Complete outstanding searches with evidence first');
    if((await db.query('SELECT d.id FROM records d LEFT JOIN reviews v ON v.record_id=d.id WHERE d.request_id=$1 AND v.id IS NULL',[r.id])).length)throw Error('Review every record first');
    const reviews=await db.query('SELECT v.disposition FROM reviews v JOIN records d ON d.id=v.record_id WHERE d.request_id=$1',[r.id]);
    if(outcome==='full'&&reviews.some(v=>v.disposition!=='release'))throw Error('Full release conflicts with document review');
    if(outcome==='refused'&&reviews.some(v=>v.disposition!=='withhold'))throw Error('Refusal conflicts with document review');
    if(!r.deadline_basis||r.jurisdiction==='UNREVIEWED')throw Error('Review the deadline and jurisdiction first');
    const sent=past(required(f,'date'));if(sent<r.received_on)throw Error('Response precedes request');
    result=(await db.query('INSERT INTO responses(request_id,outcome,reason,authority,complaint_notice,sent_on,evidence,actor) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[r.id,outcome,required(f,'reason'),required(f,'authority'),required(f,'complaint-notice'),sent,required(f,'evidence'),actor]))[0];
    await db.query("UPDATE requests SET state='closed' WHERE id=$1",[r.id]);
   }else if(cmd==='log-time'){
    const worked=past(required(f,'date'));if(worked<r.received_on)throw Error('Work date precedes request');
    result=(await db.query('INSERT INTO time_entries(request_id,worked_on,minutes,task,actor) VALUES($1,$2,$3,$4,$5) RETURNING *',[r.id,worked,integer(required(f,'minutes'),1,1440),required(f,'task'),actor]))[0];
   }else if(cmd==='log-note'){result={note:required(f,'note')};}
   else throw Error('Unsupported command '+cmd);
  }
  await audit(db,r.id,cmd,actor,result);return result;
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{const {cmd,f}=parse(process.argv.slice(2));db=await getDb();const result=await run(db,cmd,f);console.log(f.json?JSON.stringify(result):asText(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
