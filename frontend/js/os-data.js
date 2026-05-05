window.IndiCareOSData=(function(){
  const fallbackYoungPerson={id:1,first_name:'Jamie',last_name:'Smith',age:15,summary_risk_level:'Medium',key_worker:'Sarah',placement_status:'Stable'};
  const fallback={
    people:[fallbackYoungPerson],
    daily:[{record_type:'Daily note',title:'Settled evening routine',summary:'Young person presented as calm and engaged with staff.',date:'Today',status:'Recorded'}],
    incidents:[{record_type:'Incident',title:'Physical aggression after phone call',summary:'Incident followed emotional trigger. Staff response recorded.',date:'04 May 2026',status:'Manager review required',level:'warning'}],
    risk:[{area:'Aggression',level:'Medium'},{area:'Missing from care',level:'Low'},{area:'Self-harm',level:'Medium'},{area:'Exploitation',level:'Low'}],
    safeguarding:[{title:'Online contact concern',summary:'Unknown adult contact reported. Manager oversight required.',level:'high'}],
    inspection:{score:82,domains:[['Help & Protection',12,80],['Education',8,70],['Health',6,60],['Leadership',10,85]],gaps:[['Safeguarding follow-up','Missing manager commentary','warning'],['Risk review','Overdue update','critical']]}
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  async function get(url){try{const r=await fetch(url,{credentials:'include',headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)return null;return await r.json()}catch{return null}}
  function arr(v){return Array.isArray(v)?v:Array.isArray(v?.items)?v.items:Array.isArray(v?.data)?v.data:Array.isArray(v?.results)?v.results:[]}
  function name(p){return p?.preferred_name||p?.name||p?.full_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||`Young person ${p?.id||''}`}
  function id(p){return p?.id||p?.young_person_id||p?.person_id||1}
  async function getPeople(){const data=await get('/young-people');const people=arr(data);return people.length?people:fallback.people}
  async function getSelectedPerson(){const people=await getPeople();return people[0]||fallbackYoungPerson}
  async function getChildBundle(personId){const urls=['daily-notes','incidents','health','education','family','risk','safeguarding','missing-episodes','documents'].map(x=>`/young-people/${personId}/${x}`);const keys=['daily','incidents','health','education','family','riskRecords','safeguarding','missing','documents'];const out={};await Promise.all(urls.map(async(u,i)=>{out[keys[i]]=arr(await get(u));}));return out}
  async function getInspection(homeId=1){const scores=await get(`/homes/${homeId}/inspection-scores`);const sections=await get(`/homes/${homeId}/inspection-section-scores`);const actions=await get(`/homes/${homeId}/inspection-improvement-actions`);return{scores:arr(scores),sections:arr(sections),actions:arr(actions)}}
  function recordCard(r){const title=r.title||r.summary||r.incident_type||r.record_type||'Care record';const summary=r.summary||r.presentation||r.action_taken||r.outcome||r.detail||'No further detail recorded.';const type=r.record_type||r.source_table||'Record';const status=r.status||r.workflow_status||r.approval_status||'';const date=r.date||r.note_date||r.created_at||r.incident_datetime||r.event_datetime||'';return`<article class="ic-record"><div class="ic-record-type">${esc(type)}</div><h3>${esc(title)}</h3><p>${esc(summary)}</p><div class="ic-record-actions"><span class="ic-chip">${esc(status||'Open')}</span>${date?`<span class="ic-chip">${esc(date)}</span>`:''}<button class="ic-btn primary" type="button">Open</button></div></article>`}
  return{fallback,esc,arr,name,id,get,getPeople,getSelectedPerson,getChildBundle,getInspection,recordCard};
})();