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

async function load(){
  const res=await fetch(id?`/staff/${id}`:'/staff/me');
  const json=await res.json();
  const d=json.data;
  const i=(d.academy||{}).intelligence||{};

  el('staffProfileName').innerText = d.staff.first_name+' '+d.staff.last_name;
  el('staffProfileRole').innerText = txt(d.staff.role);
  el('staffProfileStatus').innerText = txt(d.employment.status);
  el('staffProfileStage').innerText = txt(d.lifecycle.current_stage);
  el('staffProfileScore').innerText = txt(i.priority_score);

  // TODAY PRIORITIES
  const today=[];
  (i.learning_needs||[]).forEach(n=> today.push(n.title));
  (d.manager_actions||[]).forEach(a=> today.push(a.action));
  list('staffTodayList',today,v=>v);

  // DATES (basic placeholder until DB fields expand)
  const dates=[];
  if(d.lifecycle?.probation) dates.push('Probation review required');
  if(d.lifecycle?.appraisal) dates.push('Appraisal due/recorded');
  list('staffDatesList',dates,v=>v);

  // TRAINING
  list('staffTrainingList',i.recommended_modules||[],m=>m.title);

  // SUPERVISION
  el('staffSupervisionCard').innerText = txt(d.supervision?.last_supervision_date,'No supervision recorded');

  // EVIDENCE
  el('staffEvidenceCard').innerText = (d.academy?.evidence||[]).length + ' evidence items';

  // LIFECYCLE PATH
  const path=['onboarding','induction','probation','active','appraisal','exit'];
  list('staffLifecyclePath',path,p=>p.toUpperCase());

  // MANAGER ACTIONS
  list('staffManagerActions',d.manager_actions||[],a=>a.action);

  // LEARNING
  list('staffLearningNeeds',i.learning_needs||[],n=>n.title);
  list('staffRecommendedModules',i.recommended_modules||[],m=>m.title);
}

load().catch(e=>{
  el('staffProfileError').innerText=e.message;
});
