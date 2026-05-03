const params = new URLSearchParams(window.location.search);
const id = params.get('id');

function el(id){return document.getElementById(id)}
function txt(v,f='—'){return (v===null||v===undefined||v==='')?f:String(v)}

function list(id,data,map){
  const c=el(id); if(!c)return; c.innerHTML='';
  if(!data||!data.length){c.innerHTML='<li>No items</li>';return}
  data.forEach(d=>{
    const li=document.createElement('li');
    li.innerText=map(d);
    c.appendChild(li);
  });
}

async function loadToday(){
  const res=await fetch(id?`/staff-today/${id}`:'/staff-today/me');
  const json=await res.json();
  if(!json.ok) return null;
  return json.data;
}

async function load(){
  const res=await fetch(id?`/staff/${id}`:'/staff/me');
  const json=await res.json();
  const d=json.data;
  const i=(d.academy||{}).intelligence||{};
  const today=await loadToday();

  el('staffProfileName').innerText = d.staff.first_name+' '+d.staff.last_name;
  el('staffProfileRole').innerText = txt(d.staff.role);
  el('staffProfileStatus').innerText = txt(d.employment.status);
  el('staffProfileStage').innerText = txt(d.lifecycle.current_stage);
  el('staffProfileScore').innerText = txt(today?.priority_score ?? i.priority_score);

  if(today){
    list('staffTodayList',today.due_now||[],v=>`${v.title} - ${v.detail||''}`);
    list('staffDatesList',[...(today.reminders||[]),...(today.warnings||[])],v=>`${v.title} - ${v.detail||''}`);
  } else {
    const fallback=[];
    (i.learning_needs||[]).forEach(n=> fallback.push(n.title));
    (d.manager_actions||[]).forEach(a=> fallback.push(a.action));
    list('staffTodayList',fallback,v=>v);
    list('staffDatesList',[],v=>v);
  }

  list('staffTrainingList',i.recommended_modules||[],m=>m.title);
  el('staffSupervisionCard').innerText = txt(d.supervision?.last_supervision_date,'No supervision recorded');
  el('staffEvidenceCard').innerText = (d.academy?.evidence||[]).length + ' evidence items';

  const path=['onboarding','induction','probation','active','appraisal','exit'];
  list('staffLifecyclePath',path,p=>p.toUpperCase());
  list('staffManagerActions',d.manager_actions||[],a=>a.action);
  list('staffLearningNeeds',i.learning_needs||[],n=>n.title);
  list('staffRecommendedModules',i.recommended_modules||[],m=>m.title);
}

load().catch(e=>{
  el('staffProfileError').innerText=e.message;
});
