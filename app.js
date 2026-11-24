/* The Hawthorne Legacy · offline legacy challenge tracker */
(()=>{'use strict';
const STORE='hawthorne-dynasty-studio-v4';
const clone=x=>JSON.parse(JSON.stringify(x));
const seed=clone(window.INITIAL_HAWTHORNE);
const baseSkills=clone(window.SKILL_CATALOG);
const allIcons=window.GAME_ICONS||[];
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=esc;
const safeColor=c=>/^#[0-9a-f]{6}$/i.test(c||'')?c:'#7f9a7b';
const uid=()=>('id'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
const notempty=s=>String(s||'').trim();
const total=a=>a.reduce((v,x)=>v+Number(x||0),0);
const artPath=name=>window.HAWTHORNE_ICON_DATA?.[name]||`assets/icons/${encodeURIComponent(name)}.png`;
const iconCache=new Set(allIcons);
const pad=n=>String(n).padStart(2,'0');

const TRIGGERS=[
 ['uninvited','Someone walked in uninvited'],
 ['romance','New romance or WooHoo'],
 ['pregnancy','Pregnancy'],
 ['breakup','Breakup or divorce'],
 ['death','Someone died'],
 ['violence','Fight, enemy or someone got hurt'],
 ['birthday','Heir had a birthday'],
 ['season','New season started'],
 ['money','Big money change'],
 ['disaster','Fire, burglary or something broke']
];
const triggerName=k=>(TRIGGERS.find(t=>t[0]===k)||[k,k])[1];

let page='home', modal=null, iconSearch='', skillSearch='', groupFilter='All', packFilter='All', editingGeneration=false;
let state=readStore();
const skillById=id=>{const original=[...baseSkills,...state.customSkills].find(x=>x.id===id);return original?{...original,...(state?.skillOverrides?.[id]||{})}:undefined};

/* ---------- Storage and migrations ---------- */
function readStore(){let doc=null;try{doc=JSON.parse(localStorage.getItem(STORE)||'null')}catch(e){}if(!doc){doc=clone(seed);try{const legacy=JSON.parse(localStorage.getItem('hawthorne-legacy-v1')||'null');if(legacy)migrateOld(legacy,doc)}catch(e){}}const updated=fixShape(doc);try{localStorage.setItem(STORE,JSON.stringify(updated))}catch(e){}return updated}
function fixShape(s){const c=clone(seed);
 for(const key of Object.keys(c))if(s[key]===undefined)s[key]=c[key];
 if(!Array.isArray(s.generations)||s.generations.length<10)s.generations=c.generations;
 s.settings=s.settings||{};
 if(!s.settings.customRules)s.settings.customRules=c.settings.customRules;
 if(!s.icons)s.icons={};if(!s.iconPicks)s.iconPicks={};if(!s.skillOverrides)s.skillOverrides={};
 for(let i=0;i<10;i++){const g=s.generations[i],d=c.generations[i];if(!g||!d)continue;if(g.girlName===undefined)g.girlName=d.girlName;if(g.boyName===undefined)g.boyName=d.boyName;
  if(i===8&&String(g.color).toUpperCase()==='#8DA66B')g.color=d.color;
  if(i===9&&String(g.color).toUpperCase()==='#B5A0D9')g.color=d.color;}
 if(Number(s.version||0)<6)migrateTo6(s,c);
 if(Number(s.version||0)<7)migrateTo7(s,c);
 if(!s.settings.lifeStages)s.settings.lifeStages=clone(c.settings.lifeStages);
 if(!s.settings.childControlMode)s.settings.childControlMode=c.settings.childControlMode;
 for(const type of ['relationships','wealthEvents','trips','storyHooks','chaosLog','contracts'])if(!Array.isArray(s[type]))s[type]=clone(c[type]||[]);
 if(!s.fateTables.events)s.fateTables.events=clone(c.fateTables.events);
 for(const [k] of TRIGGERS)if(!Array.isArray(s.fateTables.events[k]))s.fateTables.events[k]=clone(c.fateTables.events[k]||[]);
 if(!['light','dark'].includes(s.settings.theme))s.settings.theme=s.settings.theme==='night'?'dark':'light';
 s.generations.forEach((g,i)=>{if(!g.vibe)g.vibe=clone(c.generations[i].vibe);if(!Array.isArray(g.lot))g.lot=[];if(!Array.isArray(g.goals))g.goals=[];if(!Array.isArray(g.skills))g.skills=[]});
 s.version=7;return s}
function migrateTo6(s,c){
 s.relationships=Array.isArray(s.relationships)?s.relationships:clone(c.relationships);
 s.wealthEvents=Array.isArray(s.wealthEvents)?s.wealthEvents:clone(c.wealthEvents);
 s.trips=Array.isArray(s.trips)?s.trips:clone(c.trips);
 s.storyHooks=Array.isArray(s.storyHooks)?s.storyHooks:clone(c.storyHooks);
 const already=new Set((s.journal||[]).map(j=>j.id));
 for(const event of c.journal)if(!already.has(event.id)&&!s.journal.some(j=>j.title===event.title))s.journal.push(clone(event));
 if(s.settings?.strictOneSim===true)s.settings.strictOneSim=false;
}
// Replace only text you never edited; everything you changed stays yours.
function migrateTo7(s,c){const data=window.HAWTHORNE_V6_CHANGES||{changes:[],rules:[]};
 const resolve=(root,path,create)=>{let node=root;for(let i=0;i<path.length-1;i++){const k=path[i];if(k.startsWith('#')){if(!Array.isArray(node))return null;node=node.find(x=>String(x?.id)===k.slice(1))}else node=node?.[k];if(!node)return null}return node};
 for(const [path,oldText,newText] of data.changes){const parent=resolve(s,path);const key=path.at(-1);if(parent&&parent[key]===oldText)parent[key]=newText}
 if(Array.isArray(s.settings.customRules)){s.settings.customRules=s.settings.customRules.map(r=>{const hit=data.rules.find(([o])=>o===r);return hit&&hit[1]?hit[1]:r});for(const r of c.settings.customRules.slice(data.rules.length))if(!s.settings.customRules.includes(r))s.settings.customRules.push(r)}
 // core goals and vibe tests
 s.generations.forEach((g,i)=>{const d=c.generations[i];if(!d)return;for(const goal of g.goals||[]){const def=d.goals.find(x=>x.id===goal.id);if(def&&goal.core===undefined&&def.core)goal.core=true}if(!g.vibe)g.vibe=clone(d.vibe);
  for(const l of g.lot||[]){const old=(l.name||'');if(/^Optional: /.test(old)){const def=d.lot.find(x=>x.id===l.id);if(def)l.name=def.name}}});
 // drop the occult quest unless it was ticked; move Grim to side challenges
 const used=id=>Object.keys(s.questDone||{}).some(k=>k.endsWith(':'+id)&&s.questDone[k]);
 if(!used('occult'))s.quests=(s.quests||[]).filter(q=>q.id!=='occult');
 if(!used('grim')){s.quests=(s.quests||[]).filter(q=>q.id!=='grim');}
 if(!Array.isArray(s.contracts))s.contracts=clone(c.contracts);
 if(!Array.isArray(s.chaosLog))s.chaosLog=[];
 for(const h of s.heirlooms||[])if(h.status==='Held')h.status='In the box';
 if(!s.fateTables.events)s.fateTables.events=clone(c.fateTables.events);
}
function migrateOld(old,t){t.legacyImport=true;t.generations[0].goals.forEach((goal,i)=>{if(old.checks&&(old.checks[i]||old.checks[String(i)]))goal.done=true});if(old.skills&&typeof old.skills==='object'){for(const [name,lvl] of Object.entries(old.skills)){const sk=baseSkills.find(x=>x.name===name);const target=t.generations[0].skills.find(s=>s.id===sk?.id);if(target)target.level=Number(lvl)||0}}if(old.pregnancy&&typeof old.pregnancy==='object'){if(old.pregnancy.name){t.fateHistory[0].name=old.pregnancy.name;t.fateHistory[0].details=old.pregnancy.desc||t.fateHistory[0].details}}if(Array.isArray(old.family)){for(const p of old.family){if(!p||!p.name||t.people.some(x=>x.name.toLowerCase()===String(p.name).toLowerCase()))continue;t.people.push({id:uid(),name:String(p.name),generation:1,role:'Relative',parents:'',relationship:'',traits:'',notes:String(p.notes||''),photo:''})}}if(Array.isArray(old.heirlooms)){for(const h of old.heirlooms){if(h&&h.name)t.heirlooms.push({id:uid(),name:String(h.name),generation:1,keeper:'',location:'Family box',status:'In the box',notes:String(h.notes||'')})}}}
function save(silent=true){try{localStorage.setItem(STORE,JSON.stringify(state));$('#autosave').textContent='Saved';$('#autosave').classList.remove('warn');if(!silent)toast('Saved')}catch(e){$('#autosave').textContent='Storage full, export a backup';$('#autosave').classList.add('warn');toast('Storage is full. Export a backup now.')}}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600)}

/* ---------- Helpers ---------- */
function selected(){return state.generations[(state.selectedGeneration||1)-1]}
function active(){return state.generations[(state.activeGeneration||1)-1]}
function skills(){return [...baseSkills,...state.customSkills].map(x=>({...x,...(state.skillOverrides[x.id]||{})}))}
function byKey(id){return skillById(id)||{id,name:id.replaceAll('-',' '),max:10,pack:'Custom',group:'Adult'}}
function isTracked(g,id){return g.skills.some(x=>x.id===id)}
function iconInfo(s){const custom=state.icons[s.id];if(custom)return {src:custom,kind:'Uploaded image'};
 const chosen=state.iconPicks[s.id];if(chosen&&iconCache.has(chosen))return {src:artPath(chosen),kind:'Chosen Sims icon'};
 if(s.art&&iconCache.has(s.art))return {src:artPath(s.art),kind:'Matching Sims icon'};return null}
function skillIcon(s,size=''){const info=iconInfo(s);return `<span class="skill-pic ${size}" title="${attr(s.name)}">${info?`<img src="${attr(info.src)}" alt="" loading="lazy">`:`<span>${esc(s.name.slice(0,1))}</span>`}</span>`}
function lum(hex){const c=safeColor(hex).slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]}
// a version of the generation colour that stays visible on light and dark backgrounds
function strong(hex){hex=safeColor(hex);const l=lum(hex);if(l>.6)return '#8b8778';return hex}
function head(title,desc,actions=''){return `<header class="page-head"><div><h1>${title}</h1>${desc?`<p>${desc}</p>`:''}</div>${actions?`<div class="actions">${actions}</div>`:''}</header>`}
function section(title,extra=''){return `<div class="section-head"><h2>${title}</h2>${extra?`<div class="actions">${extra}</div>`:''}</div>`}
function badge(text,kind=''){return `<span class="badge ${kind}">${esc(text)}</span>`}
function status(g){return g.completed?'Finished':g.status==='playing'?'Playing':'Planned'}
function statusKind(g){return g.completed?'good':g.status==='playing'?'accent':''}
function completedCount(g){return g.goals.filter(x=>x.done).length}
function progress(g){return g.goals.length?Math.round(completedCount(g)/g.goals.length*100):0}
function vibePoints(g){const v=g.vibe;if(!v)return 0;return v.status==='passed'?+v.points||0:v.status==='failed'?-(+v.points||0):0}
function successionPoints(g){return g.succession==='skipped'?-50:0}
function score(g){return total(g.goals.filter(x=>x.done).map(x=>x.points))+vibePoints(g)+successionPoints(g)+chaosPoints(g.id)}
function maxScore(g){return total(g.goals.map(x=>x.points))+(+g.vibe?.points||0)}
function chaosPoints(gen){return total(state.chaosLog.filter(x=>gen===undefined||+x.generation===+gen).map(x=>x.status==='done'?+x.points||0:x.status==='failed'?-(+x.points||0):0))}
function contractPoints(){return total(state.contracts.map(x=>x.status==='Done'?+x.points||0:x.status==='Broken'?-(+x.points||0):0))}
function dynastyScore(){const main=total(state.generations.map(score));const quests=total(state.quests.flatMap(q=>state.generations.filter(g=>state.questDone[g.id+':'+q.id]).map(()=>Number(q.points)||0)));const setbacks=total(state.fateHistory.filter(x=>x.type==='misfortune'&&x.completed).map(x=>Number(x.points)||0));return main+quests+setbacks+contractPoints()}
function openChaos(gen){return state.chaosLog.filter(x=>x.status==='active'&&(gen===undefined||+x.generation===+gen))}
function genTabs(compact=false){return `<div class="tabs" role="tablist">${state.generations.map(g=>`<button role="tab" class="${g.id===state.selectedGeneration?'selected':''}" data-open-gen="${g.id}" data-stay="${compact?1:''}" style="--c:${strong(g.color)}"><span class="swatch" style="background:${safeColor(g.color)}"></span>${compact?g.id:`${g.id}. ${esc(g.name||g.title)}`}</button>`).join('')}</div>`}

/* ---------- Pages ---------- */
function overview(){const a=active();const open=openChaos();const vibe=a.vibe||{};
 return `${head(esc(state.settings.title||'The Hawthorne Legacy'),esc(state.settings.subtitle||''))}
 <section class="card heir-card" style="--c:${strong(a.color)}">
  <div class="heir-main">
   <div class="label">Generation ${a.id} · ${esc(a.title)} · ${esc(a.world)}</div>
   <h2 class="name">${esc(a.name||'Heir not born yet')}</h2>
   <p class="muted">${esc(a.story)}</p>
   <div class="actions" style="margin-top:16px"><button class="btn btn-primary" data-open-gen="${a.id}">Open chapter</button><button class="btn" data-nav="fate">Something happened</button></div>
  </div>
  <div class="heir-side">
   <div class="kv"><span>Goals</span><strong>${completedCount(a)} / ${a.goals.length}</strong></div>
   <div class="progress"><span style="width:${progress(a)}%"></span></div>
   <div class="kv"><span>Core goals left</span><strong>${a.goals.filter(x=>x.core&&!x.done).length}</strong></div>
   <div class="kv"><span>Vibe test</span>${vibeBadge(vibe)}</div>
   <div class="kv"><span>Open chaos rolls</span><strong>${openChaos(a.id).length}</strong></div>
  </div>
 </section>
 <div class="grid-4 stats">
  <div class="stat"><span>Legacy score</span><strong>${dynastyScore()}</strong></div>
  <div class="stat"><span>Generation</span><strong>${a.id} / 10</strong></div>
  <div class="stat"><span>Family members</span><strong>${state.people.length}</strong></div>
  <div class="stat"><span>Objects in the box</span><strong>${state.heirlooms.length}</strong></div>
 </div>
 ${section('Open chaos rolls',`<button class="btn btn-sm" data-nav="fate">Roll something</button>`)}
 ${open.length?`<div class="card list">${open.map(chaosRow).join('')}</div>`:`<div class="empty">Nothing open. When something happens on its own in your game, log it on the Fate &amp; chaos page.</div>`}
 ${section('Latest in the chronicle',`<button class="btn btn-sm" data-nav="people">Open chronicle</button>`)}
 <div class="grid-3">${state.journal.slice(-3).reverse().map(e=>`<article class="card small-card"><div class="label">Gen ${esc(e.generation)}${e.day?' · Day '+esc(e.day):''}</div><h3>${esc(e.title)}</h3><p class="muted">${esc(e.body).slice(0,200)}${String(e.body).length>200?'…':''}</p></article>`).join('')||'<div class="empty">Nothing written yet.</div>'}</div>
 ${section('Generations')}
 <div class="card list">${state.generations.map(genRow).join('')}</div>
 ${state.legacyImport?`<p class="note">Progress from the old tracker was imported. Double-check it against your save.</p>`:''}`}
function genRow(g){return `<button class="gen-row" data-open-gen="${g.id}" style="--c:${strong(g.color)}"><span class="swatch lg" style="background:${safeColor(g.color)}"></span><span class="gen-num">${g.id}</span><span class="gen-text"><strong>${esc(g.name||g.title)}</strong><small>${esc(g.title)} · ${esc(g.world)}</small></span><span class="gen-meta">${badge(status(g),statusKind(g))}${g.succession==='skipped'?badge('Failed','bad'):''}<small>${completedCount(g)}/${g.goals.length}</small></span><span class="progress thin"><span style="width:${progress(g)}%"></span></span></button>`}
function vibeBadge(v){return v?.status==='passed'?badge('Passed','good'):v?.status==='failed'?badge('Failed','bad'):badge('Ongoing','')}

function chapters(){const g=selected();const fam=state.fateHistory.filter(x=>x.generation===g.id&&x.type==='family').slice(-1)[0];const c=strong(g.color);const coreLeft=g.goals.filter(x=>x.core&&!x.done);
 return `<div style="--c:${c}">${genTabs()}
 <section class="chapter-head">
  <div class="chapter-band" style="background:${safeColor(g.color)}"></div>
  <div class="chapter-head-body">
   <div class="label">Generation ${g.id} · ${esc(g.world)}</div>
   <h1>${esc(g.title)}</h1>
   <p class="muted">${esc(g.subtitle)} · ${esc(g.name||'Heir not born yet')}</p>
   <div class="actions"><button class="btn btn-sm" data-action="edit-generation">Edit chapter</button>${state.activeGeneration===g.id?badge('Current heir','accent'):`<button class="btn btn-sm" data-action="toggle-active">Make current heir</button>`}${g.completed?`<button class="btn btn-sm" data-action="reopen-chapter">Reopen chapter</button>`:`<button class="btn btn-sm btn-primary" data-action="finish-chapter">Finish chapter</button>`}${g.succession==='skipped'?badge('Failed: inheritance went to the secondborn','bad'):g.succession==='firstborn'?badge('Firstborn inherited','good'):''}</div>
  </div>
 </section>
 ${editingGeneration?generationEditor(g):''}
 <div class="grid-3 facts"><div class="fact"><span>Aspiration</span><strong>${esc(g.aspiration||'Not chosen')}</strong></div><div class="fact"><span>Traits</span><strong>${esc(g.traits||'Not chosen')}</strong></div><div class="fact"><span>Name ideas</span><strong>${esc(g.girlName||'–')} / ${esc(g.boyName||'–')}</strong></div></div>
 ${vibePanel(g)}
 <section class="card">
  <div class="card-head"><h2>Goals</h2><span class="muted small">${completedCount(g)} of ${g.goals.length} · ${score(g)} pts</span></div>
  <div class="progress" style="margin-bottom:14px"><span style="width:${progress(g)}%"></span></div>
  ${coreLeft.length?`<p class="note warn">Core goals left: ${coreLeft.length}. Miss any of them before the heir becomes an elder and the inheritance goes to the secondborn.</p>`:''}
  <div class="goal-list">${g.goals.map(o=>`<div class="goal-row ${o.done?'checked':''}"><label class="check"><input type="checkbox" data-goal="${attr(o.id)}" ${o.done?'checked':''}><span>${esc(o.text)}</span></label>${o.core?badge('Core','accent'):''}<span class="pts">${Number(o.points)||0}</span><span class="row-tools"><button class="icon-btn move" title="Move up" data-action="up-goal" data-id="${attr(o.id)}">↑</button><button class="icon-btn move" title="Move down" data-action="down-goal" data-id="${attr(o.id)}">↓</button><button class="icon-btn" title="Edit" data-action="edit-goal" data-id="${attr(o.id)}">Edit</button><button class="icon-btn danger" title="Delete" data-action="delete-goal" data-id="${attr(o.id)}">✕</button></span></div>`).join('')}</div>
  <div class="actions" style="margin-top:12px"><button class="btn btn-sm" data-action="add-goal">Add goal</button><button class="btn btn-sm btn-ghost" data-action="reset-gen-goals">Untick all</button></div>
 </section>
 <section class="card">
  <div class="card-head"><h2>Skills</h2><button class="btn btn-sm" data-action="open-skill-select">Add skill</button></div>
  <div class="skill-focus">${g.skills.map(skillFocus).join('')}</div>${g.skills.length?'':`<div class="empty">No skills picked for this generation.</div>`}
 </section>
 <div class="grid-2">
  <section class="card"><div class="card-head"><h2>Lot challenges</h2><button class="btn btn-sm" data-action="add-lot">Add</button></div>
   ${g.lot.map(x=>`<div class="row"><label class="check"><input type="checkbox" data-lot="${attr(x.id)}" ${x.done?'checked':''}><span>${esc(x.name)}</span></label><span class="row-tools"><button class="icon-btn" data-action="edit-lot" data-id="${attr(x.id)}">Edit</button><button class="icon-btn danger" data-action="delete-lot" data-id="${attr(x.id)}">✕</button></span></div>`).join('')||'<div class="empty">None.</div>'}
  </section>
  <section class="card"><div class="card-head"><h2>Fate &amp; family box</h2><button class="btn btn-sm" data-nav="fate">Fate &amp; chaos</button></div>
   <div class="kv"><span>Family fate</span><strong>${esc(fam?.name||'Not drawn yet')}</strong></div>
   ${fam?`<p class="muted small" style="margin:-4px 0 10px">${esc(fam.details)}</p>`:''}
   <div class="kv"><span>Open chaos rolls</span><strong>${openChaos(g.id).length}</strong></div>
   <div class="kv"><span>Chaos points</span><strong>${chaosPoints(g.id)}</strong></div>
   <div class="kv"><span>Box ideas</span><strong>${esc(g.heirloomIdea||'–')}</strong></div>
  </section>
 </div>
 <section class="card"><div class="card-head"><h2>Story</h2><button class="btn btn-sm" data-action="edit-generation">Edit</button></div><p class="prose">${esc(g.story||'Not written yet.')}</p>${g.notes?`<h3 style="margin-top:16px">Notes</h3><p class="prose muted">${esc(g.notes)}</p>`:''}</section>
 </div>`}
function vibePanel(g){const v=g.vibe;if(!v)return '';return `<section class="card vibe ${v.status||''}"><div class="card-head"><div><div class="label">Vibe test · ${Number(v.points)||0} pts, or minus that if it fails</div><h2>${esc(v.name)}</h2></div>${vibeBadge(v)}</div><p>${esc(v.test)}</p><p class="muted small" style="margin-top:6px">${esc(v.fail)}</p><div class="actions" style="margin-top:14px">${v.status==='pending'||!v.status?`<button class="btn btn-sm btn-good" data-action="vibe-pass">Passed</button><button class="btn btn-sm btn-bad" data-action="vibe-fail">Failed</button>`:`<button class="btn btn-sm" data-action="vibe-reset">Undo</button>`}<button class="btn btn-sm btn-ghost" data-action="vibe-edit">Edit</button></div></section>`}
function generationEditor(g){return `<form id="generationForm" class="card editor"><div class="card-head"><h2>Edit generation ${g.id}</h2><button type="button" class="btn btn-sm btn-ghost" data-action="edit-generation">Close</button></div><div class="form-grid">
 ${[['name','Heir name'],['title','Generation title'],['world','World'],['subtitle','Tagline'],['aspiration','Aspiration'],['career','Career'],['traits','Traits (at least one bad one)'],['home','House or lot'],['householdFunds','Current funds'],['simDay','Current Sim day'],['girlName','Girl name idea'],['boyName','Boy name idea']].map(([id,label])=>`<div class="field"><label for="ge-${id}">${label}</label><input id="ge-${id}" name="${id}" value="${attr(g[id]??'')}"></div>`).join('')}
 <div class="field"><label for="ge-color">Colour</label><input id="ge-color" name="color" type="color" class="color-field" value="${safeColor(g.color)}"></div><div class="field"><label>Status</label><select name="status"><option value="planned" ${g.status==='planned'?'selected':''}>Planned</option><option value="playing" ${g.status==='playing'?'selected':''}>Playing</option><option value="completed" ${g.status==='completed'?'selected':''}>Finished</option></select></div>
 <div class="field wide"><label>Story</label><textarea name="story" rows="5">${esc(g.story)}</textarea></div><div class="field wide"><label>Notes (mods, secrets, anything)</label><textarea name="notes" rows="4">${esc(g.notes)}</textarea></div><div class="field wide"><label>Family box ideas</label><input name="heirloomIdea" value="${attr(g.heirloomIdea)}"></div></div><div class="form-footer"><button class="btn" type="button" data-action="edit-generation">Cancel</button><button class="btn btn-primary" type="submit">Save</button></div></form>`}
function skillFocus(x){const sk=byKey(x.id),max=Number(sk.max)||10;const lvl=Math.min(max,Number(x.level)||0);return `<div class="skill-item" data-skill-focus="${attr(x.id)}">${skillIcon(sk)}<div class="skill-body"><div class="skill-top"><strong>${esc(sk.name)}</strong><button class="icon-btn danger" title="Remove" data-action="remove-skill" data-id="${attr(x.id)}">✕</button></div><div class="range-row"><input type="range" min="0" max="${max}" value="${lvl}" data-level="${attr(x.id)}" data-max="${max}" aria-label="${attr(sk.name)} level"><span class="level-value">${lvl}/${max}</span></div><div class="progress thin"><span class="level-bar" style="width:${lvl/max*100}%"></span></div><div class="range-row small muted">Target <input type="number" class="tiny-input" min="0" max="${max}" value="${Math.min(max,Number(x.target)||max)}" data-target="${attr(x.id)}"></div></div></div>`}

function skillAtlas(){const g=selected();const listing=skills().filter(s=>(groupFilter==='All'||s.group===groupFilter)&&(packFilter==='All'||s.pack===packFilter)&&(!skillSearch||(s.name+' '+s.pack).toLowerCase().includes(skillSearch.toLowerCase()))).sort((a,b)=>a.name.localeCompare(b.name));const packList=[...new Set(skills().map(x=>x.pack))].sort();
 return `${head('Skills',`All ${skills().length} skills. Add them to any generation and set your own icons.`,`<button class="btn btn-sm" data-action="custom-skill">Custom skill</button><button class="btn btn-sm" data-action="bulk-icons">Import icons</button>`)}
 <input type="file" id="bulkIconInput" accept="image/png,image/jpeg,image/webp" multiple hidden>
 <div class="filterbar"><input id="skillSearch" value="${attr(skillSearch)}" placeholder="Search skills or packs" aria-label="Search skills"><select id="skillGroup">${['All','Adult','Child','Toddler','Horse','Custom'].map(x=>`<option ${groupFilter===x?'selected':''}>${x}</option>`).join('')}</select><select id="skillPack"><option>All</option>${packList.map(x=>`<option ${packFilter===x?'selected':''}>${esc(x)}</option>`).join('')}</select><select id="skillGenSelect" aria-label="Generation">${state.generations.map(x=>`<option value="${x.id}" ${x.id===g.id?'selected':''}>Add to gen ${x.id}</option>`).join('')}</select></div>
 <p class="muted small" style="margin-bottom:10px">${listing.length} shown. Icons come from your Sims icon pack and aren't always the official badge; upload the exact one if you want.</p>
 <div class="skill-catalog">${listing.map(s=>`<div class="skill-tile">${skillIcon(s,'sm')}<div class="skill-body"><strong>${esc(s.name)}</strong><div class="muted small">${esc(s.pack)} · ${s.group==='Adult'?'':esc(s.group)+' · '}max ${s.max}</div><div class="actions tight"><button class="btn btn-xs ${isTracked(g,s.id)?'':'btn-primary'}" data-action="${isTracked(g,s.id)?'remove-catalog-skill':'add-catalog-skill'}" data-id="${attr(s.id)}">${isTracked(g,s.id)?'Remove':'Add'}</button><button class="btn btn-xs" data-action="pick-icon" data-id="${attr(s.id)}">Icon</button><button class="btn btn-xs btn-ghost" data-action="edit-custom-skill" data-id="${attr(s.id)}">Edit</button></div></div></div>`).join('')}</div>${listing.length?'':`<div class="empty">No skills match.</div>`}`}

function chaosRow(x){const g=state.generations[(+x.generation||1)-1];return `<div class="row chaos-row"><span class="swatch" style="background:${safeColor(g?.color)}"></span><div class="grow"><div class="label">Gen ${esc(x.generation)} · ${esc(triggerName(x.trigger))}${x.day?' · Day '+esc(x.day):''}</div><strong>${esc(x.name)}</strong><p class="muted small">${esc(x.details)}</p>${x.note?`<p class="small">What happened: ${esc(x.note)}</p>`:''}</div><span class="pts">${Number(x.points)||0}</span>${x.status==='active'?`<span class="row-tools"><button class="btn btn-xs btn-good" data-action="chaos-done" data-id="${attr(x.id)}">Done</button><button class="btn btn-xs btn-bad" data-action="chaos-fail" data-id="${attr(x.id)}">Failed</button></span>`:`<span class="row-tools">${badge(x.status==='done'?'Done':'Failed',x.status==='done'?'good':'bad')}<button class="icon-btn" data-action="chaos-reopen" data-id="${attr(x.id)}">Undo</button><button class="icon-btn danger" data-action="chaos-delete" data-id="${attr(x.id)}">✕</button></span>`}</div>`}
function fatePage(){const g=selected();const fam=state.fateHistory.find(x=>x.generation===g.id&&x.type==='family');const mis=state.fateHistory.filter(x=>x.generation===g.id&&x.type==='misfortune');const log=state.chaosLog.filter(x=>+x.generation===g.id);const open=log.filter(x=>x.status==='active');const closed=log.filter(x=>x.status!=='active');
 return `${head('Fate & chaos','When something happens on its own in your game, pick what it was and roll. The result is binding: finish it for points, fail it and lose them.')}
 <div style="--c:${strong(g.color)}">${genTabs(true)}</div>
 ${section('Something happened',`<button class="btn btn-sm btn-ghost" data-action="edit-events">Edit outcomes</button>`)}
 <div class="trigger-grid">${TRIGGERS.map(([k,label])=>`<button class="trigger" data-action="chaos-roll" data-trigger="${k}"><strong>${esc(label)}</strong><small>${state.fateTables.events[k]?.length||0} outcomes</small></button>`).join('')}</div>
 ${section(`Open rolls · generation ${g.id}`)}
 ${open.length?`<div class="card list">${open.map(chaosRow).join('')}</div>`:'<div class="empty">Nothing open for this generation.</div>'}
 <div class="grid-2" style="margin-top:28px">
  <section class="card"><div class="card-head"><div><div class="label">Once per generation</div><h2>Family fate</h2></div><button class="btn btn-sm btn-ghost" data-action="edit-fate-table" data-table="family">Edit outcomes</button></div>
   <h3>${esc(fam?.name||'Not drawn yet')}</h3><p class="muted">${esc(fam?.details||'Draw it when the heir becomes a young adult.')}</p>
   ${fam?`<p style="margin-top:8px">${badge(fam.completed?'Completed':'In progress',fam.completed?'good':'')}</p>`:''}
   <div class="actions" style="margin-top:14px">${fam?`<button class="btn btn-sm" data-action="edit-fate-record" data-id="${attr(fam.id)}">Edit</button>`:`<button class="btn btn-sm btn-primary" data-action="draw-family">Draw family fate</button>`}</div></section>
  <section class="card"><div class="card-head"><div><div class="label">Max once per Sim week</div><h2>Weekly misfortune</h2></div><button class="btn btn-sm btn-ghost" data-action="edit-fate-table" data-table="misfortune">Edit outcomes</button></div>
   <h3>${esc(mis.at(-1)?.name||'Nothing yet')}</h3><p class="muted">${esc(mis.at(-1)?.details||'Roll at the start of each Sim week if you want it harder.')}</p>
   <div class="field" style="margin-top:12px;max-width:200px"><label for="fateSimDay">Current Sim day</label><input id="fateSimDay" type="number" min="1" value="${attr(g.simDay||'')}" placeholder="e.g. 22"></div>
   <div class="actions" style="margin-top:12px"><button class="btn btn-sm btn-primary" data-action="draw-misfortune">Roll misfortune</button></div></section>
 </div>
 ${section('Pregnancies',`<button class="btn btn-sm" data-action="add-pregnancy">Add pregnancy</button>`)}
 <section class="card"><p class="muted small" style="margin-bottom:10px">Pregnancy length: ${Number(state.settings.pregnancyDays)||9} Sim days · Seasons: ${Number(state.settings.seasonDays)||14} days. Change the real values in MCCC.</p>
 ${state.trackedPregnancies.filter(x=>x.generation===g.id).map(x=>`<div class="row"><div class="grow"><strong>${esc(x.parent)}${x.babyName?' · '+esc(x.babyName):''}</strong><p class="muted small">${esc(x.status)} · with ${esc(x.otherParent||'unknown')} · conceived day ${esc(x.conceptionDay||'?')} · due ${esc(x.dueDay||'?')} · born ${esc(x.birthDay||'?')}</p>${x.notes?`<p class="small">${esc(x.notes)}</p>`:''}</div><span class="row-tools"><button class="icon-btn" data-action="edit-pregnancy" data-id="${attr(x.id)}">Edit</button><button class="icon-btn danger" data-action="delete-pregnancy" data-id="${attr(x.id)}">✕</button></span></div>`).join('')||'<div class="empty">No pregnancies for this generation.</div>'}</section>
 ${section('History',`<button class="btn btn-sm" data-action="add-fate-record">Add manually</button>`)}
 <section class="card list">${[...closed.map(x=>({kind:'chaos',x})),...state.fateHistory.filter(x=>x.generation===g.id).map(x=>({kind:'fate',x}))].reverse().map(({kind,x})=>kind==='chaos'?chaosRow(x):`<div class="row"><div class="grow"><div class="label">${x.type==='family'?'Family fate':'Misfortune'}${x.day?' · Day '+esc(x.day):''}</div><strong>${esc(x.name)}</strong><p class="muted small">${esc(x.details)}</p></div>${badge(x.completed?'Done':'Open',x.completed?'good':'')}<span class="row-tools"><button class="icon-btn" data-action="edit-fate-record" data-id="${attr(x.id)}">Edit</button><button class="icon-btn danger" data-action="delete-fate-record" data-id="${attr(x.id)}">✕</button></span></div>`).join('')||'<div class="empty">Nothing yet.</div>'}</section>`}

function peoplePage(){return `${head('Family & chronicle','Everyone in the family and everything that happened to them.',`<button class="btn btn-sm btn-primary" data-action="add-person">Add a Sim</button>`)}
 <div class="grid-2">${state.people.map(p=>`<article class="card person"><div class="portrait">${p.photo?`<img src="${attr(p.photo)}" alt="">`:esc((p.name||'?').slice(0,1))}</div><div class="grow"><div class="label">Gen ${esc(p.generation)} · ${esc(p.role||'Relative')}</div><h3>${esc(p.name)}</h3>${p.relationship?`<p class="small">${esc(p.relationship)}</p>`:''}${p.parents?`<p class="small muted">Parents: ${esc(p.parents)}</p>`:''}${p.traits?`<p class="small muted">${esc(p.traits)}</p>`:''}${p.notes?`<p class="small" style="margin-top:6px">${esc(p.notes)}</p>`:''}<div class="actions tight" style="margin-top:10px"><button class="btn btn-xs" data-action="edit-person" data-id="${attr(p.id)}">Edit</button><button class="btn btn-xs" data-action="change-person-image" data-id="${attr(p.id)}">Photo</button><button class="btn btn-xs btn-ghost danger" data-action="delete-person" data-id="${attr(p.id)}">Remove</button></div></div></article>`).join('')}</div>${state.people.length?'':'<div class="empty">No one yet.</div>'}
 ${section('Chronicle',`<button class="btn btn-sm" data-action="add-journal">Write an entry</button>`)}
 <section class="card"><div class="timeline">${state.journal.slice().reverse().map(x=>`<div class="tl-item"><div class="label">Gen ${esc(x.generation)}${x.day?' · Day '+esc(x.day):''}</div><h3>${esc(x.title)}</h3><p class="prose">${esc(x.body)}</p><div class="actions tight"><button class="btn btn-xs btn-ghost" data-action="edit-journal" data-id="${attr(x.id)}">Edit</button><button class="btn btn-xs btn-ghost danger" data-action="delete-journal" data-id="${attr(x.id)}">Delete</button></div></div>`).join('')||'<div class="empty">Nothing written yet.</div>'}</div></section>`}

function vaultPage(){const byGen={};for(const h of state.heirlooms)(byGen[h.generation]=byGen[h.generation]||[]).push(h);
 return `${head('Family box',`Everything that defines the Hawthornes. Objects go in, nothing comes out. ${state.heirlooms.length} objects so far.`,`<button class="btn btn-sm btn-primary" data-action="add-heirloom">Add an object</button>`)}
 ${state.generations.map(g=>{const items=byGen[g.id]||[];return `<section class="box-gen"><div class="section-head"><h2><span class="swatch" style="background:${safeColor(g.color)}"></span> ${g.id}. ${esc(g.name||g.title)}</h2><span class="muted small">${items.length} object${items.length===1?'':'s'}</span></div>${items.length?`<div class="grid-3">${items.map(h=>`<article class="card small-card"><h3>${esc(h.name)}</h3><p class="muted small">${esc(h.status||'In the box')}${h.keeper?' · '+esc(h.keeper):''}</p>${h.notes?`<p class="small" style="margin-top:6px">${esc(h.notes)}</p>`:''}<div class="actions tight" style="margin-top:10px"><button class="btn btn-xs" data-action="edit-heirloom" data-id="${attr(h.id)}">Edit</button><button class="btn btn-xs btn-ghost danger" data-action="delete-heirloom" data-id="${attr(h.id)}">Remove</button></div></article>`).join('')}</div>`:`<p class="muted small">Ideas: ${esc(g.heirloomIdea||'–')}</p>`}</section>`}).join('')}`}

function questsPage(){const g=selected();const points=state.quests.filter(x=>state.questDone[`${g.id}:${x.id}`]).reduce((a,b)=>a+(Number(b.points)||0),0);const activeC=state.contracts.filter(x=>x.status==='Active');
 return `${head('Side challenges','Other challenges you\'re stacking on top of the legacy, plus bonus quests.')}
 ${section('Stacked challenges',`<button class="btn btn-sm" data-action="collision" ${activeC.length<2?'disabled':''}>They clash: roll</button><button class="btn btn-sm btn-primary" data-action="add-contract">Add challenge</button>`)}
 <p class="muted small" style="margin:-6px 0 12px">Finish one for its points. Break one and lose them. When two challenges contradict each other, roll: the winner is followed and the loser is broken.</p>
 <section class="card list">${state.contracts.map(x=>`<div class="row"><div class="grow"><strong>${esc(x.name)}</strong>${x.generation?` <span class="muted small">· gen ${esc(x.generation)}</span>`:''}<p class="muted small">${esc(x.description)}</p></div><span class="pts">${Number(x.points)||0}</span>${badge(x.status,x.status==='Done'?'good':x.status==='Broken'?'bad':'accent')}<span class="row-tools">${x.status==='Active'?`<button class="btn btn-xs btn-good" data-action="contract-done" data-id="${attr(x.id)}">Done</button><button class="btn btn-xs btn-bad" data-action="contract-break" data-id="${attr(x.id)}">Broken</button>`:`<button class="icon-btn" data-action="contract-reopen" data-id="${attr(x.id)}">Undo</button>`}<button class="icon-btn" data-action="edit-contract" data-id="${attr(x.id)}">Edit</button><button class="icon-btn danger" data-action="delete-contract" data-id="${attr(x.id)}">✕</button></span></div>`).join('')||'<div class="empty">None yet.</div>'}</section>
 ${section('Bonus quests',`<select id="questGenSelect" aria-label="Generation">${state.generations.map(x=>`<option value="${x.id}" ${x.id===g.id?'selected':''}>Gen ${x.id}</option>`).join('')}</select>${badge(points+' pts','accent')}<button class="btn btn-sm" data-action="add-quest">Add quest</button>`)}
 <section class="card list">${state.quests.map(x=>`<div class="row"><label class="check grow"><input type="checkbox" data-quest="${attr(x.id)}" ${state.questDone[`${g.id}:${x.id}`]?'checked':''}><span><strong>${esc(x.name)}</strong><br><span class="muted small">${esc(x.description)}</span></span></label><span class="pts">${x.points}</span><span class="row-tools"><button class="icon-btn" data-action="edit-quest" data-id="${attr(x.id)}">Edit</button><button class="icon-btn danger" data-action="delete-quest" data-id="${attr(x.id)}">✕</button></span></div>`).join('')}</section>`}

function rulesPage(){return `${head('Rules','The house rules. Change whatever you want.',`<button class="btn btn-sm btn-primary" data-action="add-rule">Add rule</button>`)}
 <section class="card list">${state.settings.customRules.map((r,i)=>`<div class="row"><span class="rule-num">${i+1}</span><p class="grow">${esc(r)}</p><span class="row-tools"><button class="icon-btn" data-action="edit-rule" data-index="${i}">Edit</button><button class="icon-btn danger" data-action="delete-rule" data-index="${i}">✕</button></span></div>`).join('')}</section>
 ${section('How scoring works')}
 <div class="grid-2"><section class="card"><h3>Gaining points</h3><p class="muted small">Ticked goals, a passed vibe test, finished chaos rolls, completed misfortunes, finished side challenges and bonus quests.</p></section><section class="card"><h3>Losing points</h3><p class="muted small">A failed vibe test or chaos roll costs its points. A broken side challenge costs its points. Missing core goals at succession costs 50 and marks the generation as failed.</p></section></div>`}
function agePage(){const ages=state.settings.lifeStages, season=Number(state.settings.seasonDays)||14, sum=Object.values(ages).reduce((t,x)=>t+(+x||0),0);
 return `${head('Lifespan',`Your custom life stages. ${sum} Sim days in total, about ${(sum/season).toFixed(1)} seasons. Copy them into MCCC.`)}
 <section class="card"><form id="ageForm"><div class="age-grid">${Object.entries(ages).map(([name,days])=>`<label class="age-tile"><span>${esc(name)}</span><input type="number" min="1" max="500" name="${attr(name)}" value="${Number(days)||1}" required><small>days</small></label>`).join('')}</div><div class="form-footer"><button type="button" class="btn" data-action="copy-ages">Copy for MCCC</button><button type="submit" class="btn btn-primary">Save</button></div></form></section>`}
function tripsPage(){return `${head('Childhood trips','Custom getaways for the kids. You can control them on these.',`<button class="btn btn-sm btn-primary" data-action="add-trip">Plan a trip</button>`)}
 <div class="grid-2">${state.trips.map(x=>`<section class="card"><div class="card-head"><div><div class="label">${esc(x.season||'Any season')} · Gen ${esc(x.generation||'–')}</div><h3>${esc(x.name)}</h3></div>${badge(x.status||'Idea',x.status==='Completed'?'good':x.status==='Cancelled'?'bad':'')}</div><p class="muted small">${esc(x.traveler||'Nobody yet')} · ${esc(x.location||'Anywhere')} · ${esc(x.duration||'?')} days</p><p class="small" style="margin-top:8px">${esc(x.activities||'')}</p>${x.notes?`<p class="muted small" style="margin-top:6px">${esc(x.notes)}</p>`:''}<div class="actions tight" style="margin-top:12px"><button class="btn btn-xs" data-action="edit-trip" data-id="${attr(x.id)}">Edit</button>${x.status!=='Completed'?`<button class="btn btn-xs" data-action="complete-trip" data-id="${attr(x.id)}">It happened</button>`:''}<button class="btn btn-xs btn-ghost danger" data-action="delete-trip" data-id="${attr(x.id)}">Remove</button></div></section>`).join('')}</div>`}
function relationshipsPage(){return `${head('Relationships & money','Who\'s with who, who hates who, and where the money went.',`<button class="btn btn-sm btn-primary" data-action="add-relationship">Add relationship</button>`)}
 <div class="grid-2">${state.relationships.map(x=>`<section class="card"><div class="label">Gen ${esc(x.generation)} · ${esc(x.kind)}</div><h3>${esc(x.personA)} &amp; ${esc(x.personB)}</h3><p style="margin:6px 0">${badge(x.status||'No status',String(x.kind).toLowerCase().includes('divorce')?'bad':'')}</p><p class="muted small">${esc(x.notes||'')}</p><div class="actions tight" style="margin-top:10px"><button class="btn btn-xs" data-action="edit-relationship" data-id="${attr(x.id)}">Edit</button><button class="btn btn-xs btn-ghost danger" data-action="delete-relationship" data-id="${attr(x.id)}">Remove</button></div></section>`).join('')}</div>
 ${section('Money',`<button class="btn btn-sm" data-action="add-wealth">Add</button>`)}
 <section class="card list">${state.wealthEvents.map(x=>`<div class="row"><div class="grow"><strong>${esc(x.title)}${x.amount?' · §'+esc(x.amount):''}</strong><p class="muted small">${esc(x.status)} · ${esc(x.source||'')} → ${esc(x.recipient||'')}</p>${x.notes?`<p class="small">${esc(x.notes)}</p>`:''}</div><span class="row-tools"><button class="icon-btn" data-action="edit-wealth" data-id="${attr(x.id)}">Edit</button><button class="icon-btn danger" data-action="delete-wealth" data-id="${attr(x.id)}">✕</button></span></div>`).join('')||'<div class="empty">Nothing yet.</div>'}</section>`}
function hooksPage(){return `${head('Storylines','Ideas for where the story could go.',`<button class="btn btn-sm btn-primary" data-action="add-hook">Add storyline</button>`)}
 <div class="grid-2">${state.storyHooks.map(x=>`<section class="card"><div class="card-head"><div class="label">Gen ${esc(x.generation)}</div>${badge(x.status,x.status==='Happened'?'good':x.status==='Abandoned'?'bad':'')}</div><h3>${esc(x.title)}</h3><p class="small" style="margin-top:6px">${esc(x.description||'')}</p>${x.notes?`<p class="muted small" style="margin-top:6px">${esc(x.notes)}</p>`:''}<div class="actions tight" style="margin-top:12px"><button class="btn btn-xs" data-action="edit-hook" data-id="${attr(x.id)}">Edit</button><button class="btn btn-xs btn-ghost danger" data-action="delete-hook" data-id="${attr(x.id)}">Remove</button></div></section>`).join('')}</div>`}
function settingsPage(){return `${head('Settings')}
 <section class="card"><form id="settingsForm"><h2 class="mb">General</h2><div class="form-grid"><div class="field"><label>Title</label><input name="title" value="${attr(state.settings.title)}"></div><div class="field"><label>Subtitle</label><input name="subtitle" value="${attr(state.settings.subtitle)}"></div><div class="field"><label>Theme</label><select name="theme">${[['light','Light'],['dark','Dark']].map(([v,n])=>`<option value="${v}" ${state.settings.theme===v?'selected':''}>${n}</option>`).join('')}</select></div><div class="field"><label>Current heir</label><select name="activeGeneration">${state.generations.map(g=>`<option value="${g.id}" ${state.activeGeneration===g.id?'selected':''}>${g.id} · ${esc(g.name||g.title)}</option>`).join('')}</select></div><div class="field"><label>Days per season</label><input type="number" min="1" max="112" name="seasonDays" value="${attr(state.settings.seasonDays)}"></div><div class="field"><label>Pregnancy length (days)</label><input type="number" min="1" max="120" name="pregnancyDays" value="${attr(state.settings.pregnancyDays)}"></div><div class="field"><label>Lifespan</label><select name="lifespan">${['Short','Normal','Long','Custom'].map(x=>`<option ${x===state.settings.lifespan?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Starting funds</label><input name="startMoney" value="${attr(state.settings.startMoney)}"></div></div><div class="form-footer"><button class="btn btn-primary" type="submit">Save</button></div></form></section>
 <section class="card"><h2 class="mb">Backups</h2><p class="muted small" style="margin-bottom:12px">Everything is saved in this browser only. Export a backup now and then, especially before clearing browser data or switching computers. Importing replaces everything.</p><div class="actions"><button class="btn btn-primary" data-action="export">Export backup</button><button class="btn" data-action="import">Import backup</button><button class="btn btn-ghost danger" data-action="reset-studio">Reset everything</button></div><input id="backupInput" type="file" accept="application/json,.json" hidden></section>
 <section class="card"><h2 class="mb">Skill icons</h2><p class="muted small" style="margin-bottom:12px">${Object.keys(state.icons).length} uploaded, ${Object.keys(state.iconPicks).length} picked from the icon pack. They're included in backups.</p><div class="actions"><button class="btn btn-sm" data-nav="skills">Manage icons</button><button class="btn btn-sm btn-ghost danger" data-action="clear-icons">Clear custom icons</button></div></section>`}

/* ---------- Modals and editors ---------- */
const modalEl=$('#modalLayer');
function showModal(title,content){modalEl.hidden=false;modalEl.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${attr(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-action="close-modal" aria-label="Close">✕</button></div>${content}</div>`;modalEl.querySelector('input,textarea,select')?.focus()}
function closeModal(){modalEl.hidden=true;modalEl.innerHTML='';modal=null}
function field(name,label,value='',type='text',opts={}){const min=opts.min!==undefined?` min="${opts.min}"`:'';const max=opts.max!==undefined?` max="${opts.max}"`:'';const big=type==='textarea';const control=big?`<textarea name="${name}" rows="${opts.rows||3}">${esc(value)}</textarea>`:type==='select'?`<select name="${name}">${(opts.options||[]).map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${attr(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`}).join('')}</select>`:`<input name="${name}" type="${type}" value="${attr(value)}"${min}${max}>`;return `<div class="field ${big||opts.wide?'wide':''}"><label>${esc(label)}</label>${control}</div>`}
function formModal(title,fields,onSubmit,extras='',submit='Save'){modal=onSubmit;showModal(title,`<form id="modalForm"><div class="form-grid">${fields.join('')}</div>${extras}<div class="form-footer"><button type="button" class="btn" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">${esc(submit)}</button></div></form>`)}
function simpleEdit(title,ref,fieldLabel,callback){formModal(title,[field('value',fieldLabel,ref,'textarea')],v=>callback(v.value))}
function recordEditor(type,id){let source,fields,onSave,title;const gen=state.selectedGeneration;
 const pick=(src,def)=>src.find(x=>x.id===id)||def;
 if(type==='person'){source=state.people;const obj=pick(source,{id:uid(),name:'',generation:gen,role:'Relative',parents:'',relationship:'',traits:'',notes:'',photo:''});title=id?'Edit Sim':'Add a Sim';
  fields=[field('name','Name',obj.name),field('generation','Generation',obj.generation,'number',{min:1,max:10}),field('role','Role',obj.role),field('relationship','Relationship',obj.relationship),field('parents','Parents',obj.parents),field('traits','Traits',obj.traits),field('notes','Notes',obj.notes,'textarea')];onSave=v=>{Object.assign(obj,v,{generation:+v.generation||1});if(!id)source.push(obj)}}
 else if(type==='journal'){source=state.journal;const obj=pick(source,{id:uid(),generation:gen,day:'',title:'',body:''});title=id?'Edit entry':'New chronicle entry';
  fields=[field('title','Title',obj.title),field('generation','Generation',obj.generation,'number',{min:1,max:10}),field('day','Sim day',obj.day),field('body','What happened',obj.body,'textarea',{rows:6})];onSave=v=>{Object.assign(obj,v,{generation:+v.generation||1});if(!id)source.push(obj)}}
 else if(type==='heirloom'){source=state.heirlooms;const obj=pick(source,{id:uid(),name:'',generation:gen,keeper:'',location:'Family box',status:'In the box',notes:''});title=id?'Edit object':'Add to the family box';
  fields=[field('name','Object',obj.name),field('generation','Added by generation',obj.generation,'number',{min:1,max:10}),field('keeper','Who has it',obj.keeper),field('status','Where it is',obj.status,'select',{options:['In the box','On display','Lent to family',...(['In the box','On display','Lent to family'].includes(obj.status)?[]:[obj.status])]}),field('notes','Story behind it',obj.notes,'textarea')];onSave=v=>{Object.assign(obj,v,{generation:+v.generation||1});if(!id)source.push(obj)}}
 else if(type==='pregnancy'){source=state.trackedPregnancies;const obj=pick(source,{id:uid(),generation:gen,parent:'',otherParent:'',conceptionDay:'',dueDay:'',birthDay:'',babyName:'',status:'pregnant',notes:''});title=id?'Edit pregnancy':'Add pregnancy';
  fields=[field('parent','Pregnant Sim',obj.parent),field('otherParent','Other parent',obj.otherParent),field('generation','Generation',obj.generation,'number',{min:1,max:10}),field('status','Status',obj.status,'select',{options:['planned','pregnant','in labor','born','ended','unknown']}),field('conceptionDay','Conceived (Sim day)',obj.conceptionDay,'number',{min:0}),field('dueDay','Due (Sim day)',obj.dueDay||(obj.conceptionDay!==''?+obj.conceptionDay+Number(state.settings.pregnancyDays):''),'number',{min:0}),field('birthDay','Born (Sim day)',obj.birthDay,'number',{min:0}),field('babyName','Baby name',obj.babyName),field('birthLocation','Where',obj.birthLocation||''),field('birthMethod','How',obj.birthMethod||''),field('notes','Notes',obj.notes,'textarea')];onSave=v=>{Object.assign(obj,v,{generation:+v.generation||1});if(!id)source.push(obj)}}
 else if(type==='quest'){source=state.quests;const obj=pick(source,{id:uid(),name:'',points:20,description:''});title=id?'Edit quest':'Add quest';
  fields=[field('name','Name',obj.name),field('points','Points',obj.points,'number',{min:0,max:999}),field('description','What you have to do',obj.description,'textarea')];onSave=v=>{Object.assign(obj,v,{points:+v.points||0});if(!id)source.push(obj)}}
 else if(type==='contract'){source=state.contracts;const obj=pick(source,{id:uid(),name:'',generation:'',status:'Active',points:40,description:''});title=id?'Edit challenge':'Add a challenge';
  fields=[field('name','Challenge',obj.name),field('generation','Generation (blank = any)',obj.generation),field('points','Points',obj.points,'number',{min:0,max:999}),field('status','Status',obj.status,'select',{options:['Active','Done','Broken']}),field('description','Rules',obj.description,'textarea')];onSave=v=>{Object.assign(obj,v,{points:+v.points||0});if(!id)source.push(obj)}}
 else if(type==='fate-record'){source=state.fateHistory;const obj=pick(source,{id:uid(),generation:gen,type:'misfortune',name:'',details:'',day:'',locked:true,completed:false,points:0});title=id?'Edit fate':'Add fate manually';
  fields=[field('name','Name',obj.name),field('generation','Generation',obj.generation,'number',{min:1,max:10}),field('type','Type',obj.type,'select',{options:[['family','Family fate'],['misfortune','Misfortune']]}),field('day','Sim day',obj.day),field('points','Points',obj.points||0,'number',{min:0}),field('completed','Done?',String(!!obj.completed),'select',{options:[['false','No'],['true','Yes']]}),field('details','Details',obj.details,'textarea')];onSave=v=>{Object.assign(obj,v,{generation:+v.generation||1,completed:v.completed==='true',points:+v.points||0});if(!id)source.push(obj)}}
 else if(type==='trip'){source=state.trips;const obj=pick(source,{id:uid(),generation:gen,season:'Spring',name:'',location:'',duration:'3–4',status:'Idea',day:'',traveler:'',activities:'',notes:''});title=id?'Edit trip':'Plan a trip';
  fields=[field('name','Trip',obj.name),field('traveler','Who goes',obj.traveler),field('generation','Generation',obj.generation,'number',{min:1,max:10}),field('season','Season',obj.season,'select',{options:['Spring','Summer','Autumn','Winter','Any season']}),field('location','Where',obj.location),field('duration','Days',obj.duration),field('status','Status',obj.status,'select',{options:['Idea','Planned','In progress','Completed','Cancelled']}),field('day','Sim day',obj.day),field('activities','Activities',obj.activities,'textarea'),field('notes','What actually happened',obj.notes,'textarea')];onSave=v=>{Object.assign(obj,v,{generation:+v.generation||1});if(!id)source.push(obj)}}
 else if(type==='relationship'){source=state.relationships;const obj=pick(source,{id:uid(),generation:gen,personA:'',personB:'',kind:'Family',status:'',notes:'',day:''});title=id?'Edit relationship':'Add relationship';
  fields=[field('personA','Sim',obj.personA),field('personB','Other Sim',obj.personB),field('kind','Type',obj.kind),field('status','Status',obj.status),field('generation','Generation',obj.generation,'number',{min:1,max:10}),field('day','Sim day',obj.day),field('notes','Notes',obj.notes,'textarea')];onSave=v=>{Object.assign(obj,v,{generation:+v.generation||1});if(!id)source.push(obj)}}
 else if(type==='wealth'){source=state.wealthEvents;const obj=pick(source,{id:uid(),generation:gen,title:'',amount:'',source:'',recipient:'',status:'Unknown',notes:''});title=id?'Edit money entry':'Add money entry';
  fields=[field('title','What',obj.title),field('amount','Amount (§)',obj.amount),field('source','From',obj.source),field('recipient','To',obj.recipient),field('status','Status',obj.status,'select',{options:['Received','Transferred','Unresolved','Planned','Unknown']}),field('generation','Generation',obj.generation,'number',{min:1,max:10}),field('notes','Notes',obj.notes,'textarea')];onSave=v=>{Object.assign(obj,v,{generation:+v.generation||1});if(!id)source.push(obj)}}
 else if(type==='hook'){source=state.storyHooks;const obj=pick(source,{id:uid(),generation:gen,title:'',status:'Idea',description:'',notes:''});title=id?'Edit storyline':'Add storyline';
  fields=[field('title','Title',obj.title),field('generation','Generation',obj.generation,'number',{min:1,max:10}),field('status','Status',obj.status,'select',{options:['Idea','Open','In progress','Happened','Abandoned']}),field('description','The idea',obj.description,'textarea'),field('notes','What actually happened',obj.notes,'textarea')];onSave=v=>{Object.assign(obj,v,{generation:+v.generation||1});if(!id)source.push(obj)}}
 else return;
 formModal(title,fields,onSave)}
function getTable(key){if(key.startsWith('events:'))return state.fateTables.events[key.slice(7)];return state.fateTables[key]}
function setTable(key,rows){if(key.startsWith('events:'))state.fateTables.events[key.slice(7)]=rows;else state.fateTables[key]=rows}
function tableLabel(key){return key==='family'?'Family fates':key==='misfortune'?'Weekly misfortunes':triggerName(key.slice(7))}
function tableEditor(key){const rows=getTable(key)||[];const isFamily=key==='family';modal={type:'table',table:key};
 showModal(tableLabel(key),`${key.startsWith('events:')?`<div class="field" style="margin-bottom:12px"><label>Event</label><select id="eventTableSelect">${TRIGGERS.map(([k,l])=>`<option value="events:${k}" ${key==='events:'+k?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`:''}<p class="muted small">Weights are relative chances, not percentages.</p><div class="list">${rows.map(r=>`<div class="row"><div class="grow"><strong>${esc(r.name)}</strong><p class="muted small">${esc(r.details)}</p></div><span class="muted small">w ${r.weight}${isFamily?'':' · '+(Number(r.points)||0)+' pts'}</span><span class="row-tools"><button class="icon-btn" data-action="edit-table-item" data-table="${attr(key)}" data-id="${attr(r.id)}">Edit</button><button class="icon-btn danger" data-action="delete-table-item" data-table="${attr(key)}" data-id="${attr(r.id)}">✕</button></span></div>`).join('')}</div><div class="form-footer"><button class="btn btn-sm" data-action="add-table-item" data-table="${attr(key)}">Add outcome</button></div>`)}
function tableItemEditor(key,id){const rows=getTable(key);const isFamily=key==='family';const x=rows.find(r=>r.id===id)||{id:uid(),name:'',weight:10,details:'',...(isFamily?{minChildren:1}:{points:10})};
 formModal(id?'Edit outcome':'Add outcome',[field('name','Name',x.name),field('weight','Weight',x.weight,'number',{min:1}),...(isFamily?[field('minChildren','Minimum kids',x.minChildren,'number',{min:1})]:[field('points','Points',x.points,'number',{min:0})]),field('details','What you have to do',x.details,'textarea')],v=>{Object.assign(x,v,{weight:Math.max(1,+v.weight||1),...(isFamily?{minChildren:+v.minChildren||1}:{points:+v.points||0})});if(!id)rows.push(x)})}
function goalEditor(id){const g=selected(),obj=g.goals.find(x=>x.id===id)||{id:uid(),text:'',points:15,done:false};formModal(id?'Edit goal':'Add goal',[field('text','Goal',obj.text,'textarea'),field('points','Points',obj.points,'number',{min:0,max:999}),field('core','Core goal?',obj.core?'yes':'no','select',{options:[['no','No'],['yes','Yes: required to inherit']]})],v=>{obj.text=v.text;obj.points=+v.points||0;obj.core=v.core==='yes';if(!id)g.goals.push(obj)})}
function lotEditor(id){const g=selected(),obj=g.lot.find(x=>x.id===id)||{id:uid(),name:'',done:false};formModal(id?'Edit lot challenge':'Add lot challenge',[field('name','Lot challenge',obj.name,'textarea')],v=>{obj.name=v.name;if(!id)g.lot.push(obj)})}
function vibeEditor(){const g=selected(),v=g.vibe||(g.vibe={name:'',test:'',fail:'',points:40,status:'pending'});formModal('Edit vibe test',[field('name','Name',v.name),field('points','Points',v.points,'number',{min:0,max:999}),field('test','The test',v.test,'textarea'),field('fail','How it fails',v.fail,'textarea')],x=>{Object.assign(v,x,{points:+x.points||0})})}
function chooseSkill(){const list=skills().filter(x=>!isTracked(selected(),x.id));formModal('Add a skill to generation '+state.selectedGeneration,[field('skill','Skill',list[0]?.id||'','select',{options:list.map(x=>[x.id,x.name+' · '+x.pack]),wide:true}),field('target','Target level',10,'number',{min:1,max:15})],v=>{const s=skillById(v.skill);if(s&&!isTracked(selected(),s.id))selected().skills.push({id:s.id,target:Math.max(1,Math.min(s.max,+v.target||s.max)),level:0})})}
function skillEditor(id){const isBuiltin=baseSkills.some(x=>x.id===id);const record=(id?skillById(id):null)||{id:uid(),name:'',pack:'Custom / mod',group:'Adult',max:10};formModal(id?'Edit skill':'Custom or modded skill',[field('name','Name',record.name),field('pack','Pack or mod',record.pack),field('group','Category',record.group,'select',{options:['Adult','Child','Toddler','Horse','Custom']}),field('max','Max level',record.max,'number',{min:1,max:100})],v=>{const changed={...v,max:Math.max(1,+v.max||10)};if(isBuiltin)state.skillOverrides[id]=changed;else if(id){Object.assign(state.customSkills.find(x=>x.id===id),changed)}else state.customSkills.push({...record,...changed})})}
function picker(id){const sk=byKey(id);iconSearch='';modal={type:'icon',id};showModal('Icon · '+sk.name,`<div class="field"><label>Search the icon pack</label><input id="iconSearch" value="" placeholder="Gardening, Piano, Rose…"></div><div id="iconChoices" style="margin:12px 0">${iconChoices()}</div><div class="actions"><label class="btn btn-sm">Upload image<input id="iconUpload" data-icon-upload="${attr(id)}" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button class="btn btn-sm btn-ghost" data-action="clear-skill-icon" data-id="${attr(id)}">Use default</button></div>`)}
function iconChoices(){const names=allIcons.filter(x=>x.toLowerCase().includes(iconSearch.toLowerCase())).slice(0,96);return `<div class="icon-browser">${names.map(n=>`<button class="icon-option" data-action="set-icon" data-icon="${attr(n)}" title="${attr(n)}"><img src="${attr(artPath(n))}" alt=""><span>${esc(n)}</span></button>`).join('')}</div><p class="muted small" style="margin-top:6px">${names.length} shown of ${allIcons.length}.</p>`}

/* ---------- Rolls ---------- */
function weighted(rows){const sum=total(rows.map(x=>Math.max(0,+x.weight||0)));let v=Math.random()*sum;return rows.find(x=>(v-=Math.max(0,+x.weight||0))<0)||rows.at(-1)}
function resultBox(label,name,details,points){return `<div class="result"><div class="label">${esc(label)}</div><h3>${esc(name)}</h3><p>${esc(details)}</p>${points?`<p class="muted small" style="margin-top:8px">Finish it: +${points} pts · Fail it: −${points} pts</p>`:''}</div>`}
function drawFate(type){const g=selected();if(type==='misfortune'&&g.simDay){const week=Math.floor((Number(g.simDay)-1)/7);if(state.lastDraws[g.id+':'+week]){toast('Already rolled a misfortune this Sim week.');return}}if(type==='family'&&state.fateHistory.some(x=>x.generation===g.id&&x.type==='family')){toast('This generation already has a family fate.');return}
 let options=state.fateTables[type].filter(x=>(+x.weight||0)>0);const recent=state.fateHistory.filter(x=>x.type===type).slice(-2).map(x=>x.name);const fresh=options.filter(x=>!recent.includes(x.name));if(fresh.length)options=fresh;
 if(!options.length){toast('Add some outcomes first.');return}const pick=weighted(options);const record={id:uid(),generation:g.id,type,name:pick.name,details:pick.details,day:g.simDay||'',locked:true,completed:false,points:type==='misfortune'?(Number(pick.points)||0):0};state.fateHistory.push(record);if(type==='misfortune'&&g.simDay)state.lastDraws[g.id+':'+Math.floor((Number(g.simDay)-1)/7)]=record.id;save();render();
 showModal(type==='family'?'Family fate':'Misfortune',`${resultBox('Generation '+g.id,pick.name,pick.details,record.points)}<div class="form-footer"><button class="btn btn-primary" data-action="close-modal">Got it</button></div>`)}
function chaosPrompt(trigger){const g=selected();formModal(triggerName(trigger),[field('note','What happened? (optional)','','textarea',{rows:2}),field('day','Sim day',g.simDay||'')],v=>{rollChaos(trigger,v.note,v.day);return 'keep-open'},'','Roll')}
function rollChaos(trigger,note,day){const g=selected();let options=(state.fateTables.events[trigger]||[]).filter(x=>(+x.weight||0)>0);if(!options.length){toast('No outcomes for this event yet.');return}
 const recent=state.chaosLog.filter(x=>x.trigger===trigger).slice(-1).map(x=>x.name);const fresh=options.filter(x=>!recent.includes(x.name));if(fresh.length)options=fresh;const pick=weighted(options);
 const nothing=!(+pick.points);const rec={id:uid(),generation:g.id,trigger,name:pick.name,details:pick.details,points:+pick.points||0,day:day||'',note:note||'',status:nothing?'done':'active'};state.chaosLog.push(rec);
 if(note)state.journal.push({id:uid(),generation:g.id,day:day||'',title:triggerName(trigger),body:note+'\nRolled: '+pick.name+'. '+pick.details});
 save();render();showModal('You rolled',`${resultBox(triggerName(trigger),pick.name,pick.details,rec.points)}<div class="form-footer"><button class="btn btn-primary" data-action="close-modal">Deal with it</button></div>`)}
function collisionPrompt(){const list=state.contracts.filter(x=>x.status==='Active');formModal('Two challenges clash',[field('a','First challenge',list[0]?.id,'select',{options:list.map(x=>[x.id,x.name]),wide:true}),field('b','Second challenge',list[1]?.id,'select',{options:list.map(x=>[x.id,x.name]),wide:true}),field('why','What clashes? (optional)','','textarea',{rows:2})],v=>{if(v.a===v.b){toast('Pick two different challenges');return 'keep-open'}const A=state.contracts.find(x=>x.id===v.a),B=state.contracts.find(x=>x.id===v.b);const [win,lose]=Math.random()<.5?[A,B]:[B,A];lose.status='Broken';state.journal.push({id:uid(),generation:state.activeGeneration,day:'',title:'Challenges clashed',body:`${win.name} won over ${lose.name}.${v.why?' '+v.why:''}`});save();render();showModal('Clash result',`${resultBox('The winner',win.name,`Keep following it. ${lose.name} is broken: −${Number(lose.points)||0} pts.`,0)}<div class="form-footer"><button class="btn btn-primary" data-action="close-modal">OK</button></div>`);return 'keep-open'},'','Roll')}
function finishChapter(){const g=selected();const missed=g.goals.filter(x=>x.core&&!x.done);
 if(missed.length){showModal('Core goals missed',`<p>Generation ${g.id} still has ${missed.length} core goal${missed.length>1?'s':''} open:</p><ul class="plain-list">${missed.map(x=>`<li>${esc(x.text)}</li>`).join('')}</ul><p class="note warn" style="margin-top:12px">If the heir is an elder now, the firstborn loses the inheritance. Control passes to the secondborn, the generation is marked as failed and you lose 50 points.</p><div class="form-footer"><button class="btn" data-action="close-modal">Not yet</button><button class="btn btn-bad" data-action="confirm-finish" data-mode="skipped">Fail it: secondborn inherits</button></div>`)}
 else showModal('Finish generation '+g.id,`<p>All core goals are done. The firstborn inherits.</p><div class="form-footer"><button class="btn" data-action="close-modal">Cancel</button><button class="btn btn-primary" data-action="confirm-finish" data-mode="firstborn">Finish chapter</button></div>`)}

/* ---------- Import / export ---------- */
function exportState(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='hawthorne-legacy-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exported')}
function importState(obj){if(!obj||typeof obj!=='object')throw Error('Invalid JSON file');if(Array.isArray(obj.generations)&&obj.generations.length===10){state=fixShape(obj)}else if('checks' in obj||'branch' in obj){const fresh=clone(seed);migrateOld(obj,fresh);state=fixShape(fresh)}else throw Error('Not a Hawthorne Legacy backup');save();closeModal();page='home';editingGeneration=false;render();toast('Backup imported')}
function imageUpload(file,callback){if(!file||!file.type.startsWith('image/'))return toast('Choose a PNG, JPEG or WebP image');if(file.size>15e6)return toast('Image too large (15 MB max)');const reader=new FileReader();reader.onerror=()=>toast('Could not read this image');reader.onload=()=>{const im=new Image();im.onload=()=>{const size=192,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const c=canvas.getContext('2d');const scale=Math.min(size/im.width,size/im.height);const w=im.width*scale,h=im.height*scale;c.drawImage(im,(size-w)/2,(size-h)/2,w,h);callback(canvas.toDataURL('image/webp',0.88))};im.onerror=()=>toast('Image could not be decoded');im.src=reader.result};reader.readAsDataURL(file)}
function bulkIcons(files){const matches=[],skipped=[];const normalize=t=>String(t||'').toLowerCase().replace(/\.(png|jpe?g|webp)$/,'').replace(/^(skill[-_ ]?ts4[-_ ]?|ts4[-_ ]?skill[-_ ]?|skill[-_ ]?)/,'').replace(/skill(?:icon)?$/,'').replace(/[^a-z0-9]/g,'');for(const file of files){const key=normalize(file.name);const sk=skills().find(s=>normalize(s.name)===key);if(sk)matches.push([file,sk]);else skipped.push(file.name)}if(!matches.length){alert('No filenames matched a skill. Name them like Gardening.png or Skill_TS4_Handiness.png.');return}let done=0;matches.forEach(([file,sk])=>imageUpload(file,data=>{state.icons[sk.id]=data;delete state.iconPicks[sk.id];done++;if(done===matches.length){save();render();alert(`${done} icons imported.${skipped.length?'\n'+skipped.length+' files did not match a skill.':''}`)}}))}
function askDelete(text,fn){if(confirm(text)){fn();save();render();toast('Removed')}}

/* ---------- Render ---------- */
const PAGES={home:overview,chapters,skills:skillAtlas,fate:fatePage,people:peoplePage,relations:relationshipsPage,trips:tripsPage,ages:agePage,hooks:hooksPage,vault:vaultPage,quests:questsPage,rules:rulesPage,settings:settingsPage};
function changePage(p){if(!PAGES[p])return;page=p;editingGeneration=false;closeMenu();render();window.scrollTo({top:0,behavior:'instant'})}
function render(){const g=page==='home'?active():selected();document.body.dataset.theme=state.settings.theme||'light';document.documentElement.style.setProperty('--accent',strong(g.color));document.documentElement.style.setProperty('--accent-raw',safeColor(g.color));
 $('#siteTitle').textContent=state.settings.title||'The Hawthorne Legacy';document.title=state.settings.title||'The Hawthorne Legacy';
 const n=openChaos().length;$('#navChaos').textContent=n||'';
 $('#main').innerHTML=PAGES[page]();document.querySelectorAll('.nav [data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===page))}
function closeMenu(){document.body.classList.remove('menu-open');$('#menuToggle').setAttribute('aria-expanded','false')}

async function onAction(action,button){const g=selected(),id=button.dataset.id||'',idx=Number(button.dataset.index),table=button.dataset.table;
 const setStatus=(list,s)=>{const x=list.find(r=>r.id===id);if(x){x.status=s;save();render()}};
 switch(action){
 case 'close-modal':closeModal();break;
 case 'edit-generation':editingGeneration=!editingGeneration;render();break;
 case 'toggle-active':state.activeGeneration=g.id;state.generations.forEach(x=>{if(!x.completed&&x.id!==g.id&&x.status==='playing')x.status='planned'});g.status='playing';save();render();toast('Current heir updated');break;
 case 'finish-chapter':finishChapter();break;
 case 'confirm-finish':{g.completed=true;g.status='completed';g.succession=button.dataset.mode;state.journal.push({id:uid(),generation:g.id,day:g.simDay||'',title:g.succession==='skipped'?`Generation ${g.id} failed`:`Generation ${g.id} finished`,body:g.succession==='skipped'?`${g.name||'The heir'} didn't finish their core goals. The inheritance goes to the secondborn.`:`${g.name||'The heir'} finished their core goals. The firstborn inherits.`});if(g.id<10){state.activeGeneration=g.id+1;state.generations[g.id].status='playing'}closeModal();save();render();break}
 case 'reopen-chapter':g.completed=false;g.status='playing';delete g.succession;save();render();break;
 case 'vibe-pass':g.vibe.status='passed';save();render();break;
 case 'vibe-fail':g.vibe.status='failed';save();render();break;
 case 'vibe-reset':g.vibe.status='pending';save();render();break;
 case 'vibe-edit':vibeEditor();break;
 case 'add-goal':goalEditor(null);break;
 case 'up-goal':case 'down-goal':{const i=g.goals.findIndex(x=>x.id===id),j=i+(action==='up-goal'?-1:1);if(i>=0&&j>=0&&j<g.goals.length){[g.goals[i],g.goals[j]]=[g.goals[j],g.goals[i]];save();render()}break}
 case 'edit-goal':goalEditor(id);break;
 case 'delete-goal':askDelete('Delete this goal?',()=>g.goals=g.goals.filter(x=>x.id!==id));break;
 case 'reset-gen-goals':askDelete('Untick every goal in this generation?',()=>g.goals.forEach(x=>x.done=false));break;
 case 'add-lot':lotEditor(null);break;
 case 'edit-lot':lotEditor(id);break;
 case 'delete-lot':askDelete('Delete this lot challenge?',()=>g.lot=g.lot.filter(x=>x.id!==id));break;
 case 'open-skill-select':chooseSkill();break;
 case 'remove-skill':case 'remove-catalog-skill':g.skills=g.skills.filter(x=>x.id!==id);save();render();break;
 case 'add-catalog-skill':{const s=byKey(id);if(!isTracked(g,id)){g.skills.push({id,target:s.max,level:0});save();render();toast(`${s.name} added to generation ${g.id}`)}break}
 case 'pick-icon':picker(id);break;
 case 'set-icon':if(modal?.type==='icon'){delete state.icons[modal.id];state.iconPicks[modal.id]=button.dataset.icon;save();closeModal();render()}break;
 case 'clear-skill-icon':delete state.icons[id];delete state.iconPicks[id];save();closeModal();render();break;
 case 'custom-skill':skillEditor(null);break;
 case 'bulk-icons':{let input=$('#bulkIconInput');if(!input){changePage('skills');input=$('#bulkIconInput')}input?.click();break}
 case 'edit-custom-skill':skillEditor(id);break;
 case 'chaos-roll':chaosPrompt(button.dataset.trigger);break;
 case 'chaos-done':setStatus(state.chaosLog,'done');break;
 case 'chaos-fail':setStatus(state.chaosLog,'failed');break;
 case 'chaos-reopen':setStatus(state.chaosLog,'active');break;
 case 'chaos-delete':askDelete('Delete this roll? Only do this if it was a mistake.',()=>state.chaosLog=state.chaosLog.filter(x=>x.id!==id));break;
 case 'edit-events':tableEditor('events:'+TRIGGERS[0][0]);break;
 case 'draw-family':drawFate('family');break;
 case 'draw-misfortune':drawFate('misfortune');break;
 case 'edit-fate-table':tableEditor(table);break;
 case 'add-table-item':tableItemEditor(table,null);break;
 case 'edit-table-item':tableItemEditor(table,id);break;
 case 'delete-table-item':if(confirm('Remove this outcome?')){setTable(table,getTable(table).filter(x=>x.id!==id));save();render();tableEditor(table)}break;
 case 'add-fate-record':recordEditor('fate-record',null);break;
 case 'edit-fate-record':recordEditor('fate-record',id);break;
 case 'delete-fate-record':askDelete('Delete this fate? Only do this if it was a mistake.',()=>state.fateHistory=state.fateHistory.filter(x=>x.id!==id));break;
 case 'add-pregnancy':recordEditor('pregnancy',null);break;
 case 'edit-pregnancy':recordEditor('pregnancy',id);break;
 case 'delete-pregnancy':askDelete('Delete this pregnancy?',()=>state.trackedPregnancies=state.trackedPregnancies.filter(x=>x.id!==id));break;
 case 'add-person':recordEditor('person',null);break;
 case 'edit-person':recordEditor('person',id);break;
 case 'change-person-image':{const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.onchange=()=>imageUpload(input.files?.[0],data=>{const p=state.people.find(x=>x.id===id);if(p){p.photo=data;save();render()}});input.click();break}
 case 'delete-person':askDelete('Remove this Sim?',()=>state.people=state.people.filter(x=>x.id!==id));break;
 case 'add-journal':recordEditor('journal',null);break;
 case 'edit-journal':recordEditor('journal',id);break;
 case 'delete-journal':askDelete('Delete this entry?',()=>state.journal=state.journal.filter(x=>x.id!==id));break;
 case 'add-trip':recordEditor('trip',null);break;
 case 'edit-trip':recordEditor('trip',id);break;
 case 'delete-trip':askDelete('Delete this trip?',()=>state.trips=state.trips.filter(x=>x.id!==id));break;
 case 'complete-trip':{const trip=state.trips.find(x=>x.id===id);if(trip){trip.status='Completed';const memoryId='memory-'+trip.id;if(!state.journal.some(j=>j.id===memoryId))state.journal.push({id:memoryId,generation:+trip.generation||1,day:trip.day||'',title:'Trip: '+trip.name,body:trip.notes||'Trip happened.'});save();render();toast('Added to the chronicle')}break}
 case 'add-relationship':recordEditor('relationship',null);break;
 case 'edit-relationship':recordEditor('relationship',id);break;
 case 'delete-relationship':askDelete('Remove this relationship?',()=>state.relationships=state.relationships.filter(x=>x.id!==id));break;
 case 'add-wealth':recordEditor('wealth',null);break;
 case 'edit-wealth':recordEditor('wealth',id);break;
 case 'delete-wealth':askDelete('Remove this entry?',()=>state.wealthEvents=state.wealthEvents.filter(x=>x.id!==id));break;
 case 'add-hook':recordEditor('hook',null);break;
 case 'edit-hook':recordEditor('hook',id);break;
 case 'delete-hook':askDelete('Remove this storyline?',()=>state.storyHooks=state.storyHooks.filter(x=>x.id!==id));break;
 case 'copy-ages':{const msg=Object.entries(state.settings.lifeStages).map(([name,n])=>name+': '+n+' days').join('\n');if(navigator.clipboard?.writeText)navigator.clipboard.writeText(msg).then(()=>toast('Copied')).catch(()=>prompt('Copy these:',msg));else prompt('Copy these:',msg);break}
 case 'add-heirloom':recordEditor('heirloom',null);break;
 case 'edit-heirloom':recordEditor('heirloom',id);break;
 case 'delete-heirloom':askDelete('Remove this object from the list? (Only if you added it by mistake: nothing leaves the box.)',()=>state.heirlooms=state.heirlooms.filter(x=>x.id!==id));break;
 case 'add-quest':recordEditor('quest',null);break;
 case 'edit-quest':recordEditor('quest',id);break;
 case 'delete-quest':askDelete('Remove this quest?',()=>state.quests=state.quests.filter(x=>x.id!==id));break;
 case 'add-contract':recordEditor('contract',null);break;
 case 'edit-contract':recordEditor('contract',id);break;
 case 'delete-contract':askDelete('Remove this challenge?',()=>state.contracts=state.contracts.filter(x=>x.id!==id));break;
 case 'contract-done':setStatus(state.contracts,'Done');break;
 case 'contract-break':setStatus(state.contracts,'Broken');break;
 case 'contract-reopen':setStatus(state.contracts,'Active');break;
 case 'collision':collisionPrompt();break;
 case 'add-rule':simpleEdit('Add a rule','','Rule',v=>{if(notempty(v))state.settings.customRules.push(v)});break;
 case 'edit-rule':simpleEdit('Edit rule',state.settings.customRules[idx],'Rule',v=>state.settings.customRules[idx]=v);break;
 case 'delete-rule':askDelete('Delete this rule?',()=>state.settings.customRules.splice(idx,1));break;
 case 'export':exportState();break;
 case 'import':$('#backupInput')?.click();break;
 case 'reset-studio':askDelete('Reset everything? All your progress in this browser will be erased. Export a backup first.',()=>{state=fixShape(clone(seed));editingGeneration=false;page='home'});break;
 case 'clear-icons':askDelete('Remove all custom icons?',()=>{state.icons={};state.iconPicks={}});break;
 }
}
document.addEventListener('click',e=>{
 if(e.target.closest('#menuToggle')){const open=document.body.classList.toggle('menu-open');$('#menuToggle').setAttribute('aria-expanded',String(open));return}
 const nav=e.target.closest('[data-nav]');if(nav){e.preventDefault();changePage(nav.dataset.nav);return}
 const go=e.target.closest('[data-open-gen]');if(go){e.preventDefault();state.selectedGeneration=Number(go.dataset.openGen);editingGeneration=false;if(!go.dataset.stay){page='chapters';window.scrollTo({top:0,behavior:'instant'})}save();render();return}
 const action=e.target.closest('[data-action]');if(action){e.preventDefault();onAction(action.dataset.action,action);return}
 if(e.target===modalEl)closeModal();
 if(document.body.classList.contains('menu-open')&&!e.target.closest('.sidebar'))closeMenu();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!modalEl.hidden)closeModal();closeMenu()}});
document.addEventListener('submit',e=>{
 if(!['generationForm','settingsForm','ageForm','modalForm'].includes(e.target.id))return;e.preventDefault();
 const form=e.target,data=Object.fromEntries(new FormData(form).entries());
 if(form.id==='ageForm'){const ages=state.settings.lifeStages;for(const name of Object.keys(ages))ages[name]=Math.max(1,Math.min(500,+data[name]||ages[name]));state.settings.lifespan='Custom';save(false);render();return}
 if(form.id==='generationForm'){const g=selected();for(const [k,v] of Object.entries(data))if(k in g||['girlName','boyName','home','householdFunds','simDay','notes'].includes(k))g[k]=v;g.color=safeColor(g.color);g.completed=g.status==='completed';editingGeneration=false;save(false);render();return}
 if(form.id==='settingsForm'){for(const [k,v] of Object.entries(data))if(k in state.settings)state.settings[k]=v;state.settings.seasonDays=Math.max(1,+data.seasonDays||14);state.settings.pregnancyDays=Math.max(1,+data.pregnancyDays||9);state.activeGeneration=+data.activeGeneration||1;save(false);render();return}
 if(form.id==='modalForm'&&typeof modal==='function'){const fn=modal;try{const r=fn(data);if(r==='keep-open')return;closeModal();save();render();toast('Saved')}catch(err){console.error(err);toast('Could not save this')}}
});
document.addEventListener('change',e=>{
 const x=e.target;
 if(x.id==='eventTableSelect'){tableEditor(x.value);return}
 if(x.id==='fateSimDay'){selected().simDay=Math.max(1,+x.value||1);save();return}
 if(x.id==='skillGroup'){groupFilter=x.value;render();return}
 if(x.id==='skillPack'){packFilter=x.value;render();return}
 if(x.id==='skillGenSelect'||x.id==='questGenSelect'){state.selectedGeneration=+x.value;render();return}
 if(x.dataset.goal){const goal=selected().goals.find(o=>o.id===x.dataset.goal);if(goal)goal.done=x.checked;save();render();return}
 if(x.dataset.lot){const item=selected().lot.find(o=>o.id===x.dataset.lot);if(item)item.done=x.checked;save();render();return}
 if(x.dataset.quest){state.questDone[`${state.selectedGeneration}:${x.dataset.quest}`]=x.checked;save();render();return}
 if(x.dataset.target){const xp=selected().skills.find(o=>o.id===x.dataset.target);const sk=byKey(x.dataset.target);if(xp){xp.target=Math.max(0,Math.min(sk.max,+x.value||0));save();toast('Target updated')}return}
 if(x.id==='backupInput'&&x.files?.[0]){if(!confirm('Import this backup? It replaces everything in this browser.')){x.value='';return}const reader=new FileReader();reader.onload=()=>{try{importState(JSON.parse(reader.result))}catch(err){alert('Import failed: '+err.message)}};reader.readAsText(x.files[0]);return}
 if(x.id==='bulkIconInput'&&x.files?.length){bulkIcons([...x.files]);return}
 if(x.dataset.iconUpload){imageUpload(x.files?.[0],data=>{state.icons[x.dataset.iconUpload]=data;delete state.iconPicks[x.dataset.iconUpload];save();closeModal();render()});return}
});
document.addEventListener('input',e=>{
 const x=e.target;
 if(x.name==='conceptionDay'&&x.closest('#modalForm')&&x.value!==''){const due=x.closest('#modalForm').querySelector('[name=dueDay]');if(due&&!due.value)due.value=String((+x.value||0)+Number(state.settings.pregnancyDays||9))}
 if(x.id==='skillSearch'){const pos=x.selectionStart;skillSearch=x.value;render();const el=$('#skillSearch');el?.focus();el?.setSelectionRange(pos,pos);return}
 if(x.id==='iconSearch'){iconSearch=x.value;const choices=$('#iconChoices');if(choices)choices.innerHTML=iconChoices();return}
 if(x.dataset.level){const xp=selected().skills.find(o=>o.id===x.dataset.level);if(xp){const max=+x.dataset.max||10;xp.level=+x.value||0;const parent=x.closest('[data-skill-focus]');if(parent){parent.querySelector('.level-value').textContent=xp.level+'/'+max;parent.querySelector('.level-bar').style.width=(xp.level/max*100)+'%'}save()}return}
});
$('#quickExport').addEventListener('click',exportState);
render();
})();
