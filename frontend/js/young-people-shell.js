// ================= STATE =================
const state = {
youngPeople: [],
selected: null,
activeTab: "overview",
doc: { id:null, type:null, saveFn:null, dirty:false, timer:null }
};

// ================= HELPERS =================
const $ = id => document.getElementById(id);
const $$ = s => [...document.querySelectorAll(s)];
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

const arr = d => Array.isArray(d) ? d :
Array.isArray(d?.items) ? d.items :
Array.isArray(d?.rows) ? d.rows :
Array.isArray(d?.data) ? d.data : [];

const esc = s => String(s ?? "")
.replaceAll("&","&amp;")
.replaceAll("<","&lt;")
.replaceAll(">","&gt;");

const clean = v => (typeof v === "string" ? v.trim() : v) || null;

const fDate = x => x ? new Date(x).toLocaleDateString("en-GB") : "—";

function setHTML(id, html){ const el=$(id); if(el) el.innerHTML=html; }
function setText(id, t){ const el=$(id); if(el) el.textContent=t; }
function setValue(id, v){ const el=$(id); if(el) el.value=v ?? ""; }

// ================= API =================
async function j(url, options={}){
const res = await fetch(url,{
credentials:"include",
headers:{ "Content-Type":"application/json" },
...options
});
if(!res.ok) throw new Error(`Request failed (${res.status})`);
return res.json();
}

// ================= UI =================
function msg(text, bad=false){
const el = $("statusBar");
if(!el) return;
el.classList.remove("hidden");
el.innerHTML = `<span class="pill ${bad?"red":"green"}">${esc(text)}</span>`;
setTimeout(()=>el.classList.add("hidden"),3000);
}

// ================= YOUNG PEOPLE =================
function fullName(p){
return `${p.first_name||""} ${p.last_name||""}`.trim();
}

function renderYoungPersonSelect(){
const el = $("youngPersonSelect");
if(!el) return;

el.innerHTML = state.youngPeople.map(p=>`
<option value="${p.id}">
${esc(fullName(p))}
</option>
`).join("");
}

function renderHeader(){
const p = state.selected;
if(!p) return;

setText("selectedYoungPersonName", fullName(p));
setText("selectedYoungPersonMeta", `Placement: ${p.placement_status||"—"}`);
}

async function loadYoungPeople(){
try{
const rows = arr(await j("/young-people"));
state.youngPeople = rows;

if(!rows.length){
setHTML("youngPersonSelect","<option>No young people</option>");
return;
}

state.selected = rows[0];
renderYoungPersonSelect();
renderHeader();
loadTab();

}catch(e){
msg(e.message,true);
}
}

// ================= TABS =================
function setTab(tab){
state.activeTab = tab;

$$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
$$(".panel").forEach(p=>p.classList.toggle("active",p.id===`tab-${tab}`));

loadTab();
}

// ================= DOCUMENT MODE =================
function openDocument(){
$("browseMode")?.classList.add("hidden");
$("documentMode")?.classList.remove("hidden");
}

function closeDocument(){
$("documentMode")?.classList.add("hidden");
$("browseMode")?.classList.remove("hidden");
}

function setDoc(title){
setText("docTitle",title);
}

// ================= LOADERS =================
async function loadOverview(){
const d = await j(`/young-people/${state.selected.id}`);
setHTML("overviewContent",`
<div class="card">
<div class="card-title">${esc(fullName(d))}</div>
<div class="card-summary">
Risk: ${esc(d.summary_risk_level||"—")}
</div>
</div>
`);
}

async function loadPlans(){
const rows = arr(await j(`/young-people/${state.selected.id}/plans`));
setHTML("plansContent",
rows.map(r=>`
<div class="card open-plan" data-id="${r.id}">
<div class="card-title">${esc(r.title)}</div>
</div>
`).join("")
);

$$(".open-plan").forEach(el=>{
el.onclick = ()=>openPlan(el.dataset.id);
});
}

// ================= OPEN DOCUMENT =================
async function openPlan(id){
openDocument();

const r = await j(`/young-people/plans/${id}`);

setDoc(r.title||"Plan");

setHTML("docBody",`
<textarea id="planText" class="textarea">${esc(r.summary||"")}</textarea>
<button id="savePlan" class="btn primary">Save</button>
`);

$("savePlan").onclick = async ()=>{
await j(`/young-people/plans/${id}`,{
method:"PUT",
body:JSON.stringify({ summary:$("planText").value })
});
msg("Saved");
loadPlans();
};
}

// ================= CREATE =================
async function openNewPlan(){
openDocument();
setDoc("New Plan");

setHTML("docBody",`
<input id="title" class="input" placeholder="Title"/>
<textarea id="summary" class="textarea"></textarea>
<button id="create" class="btn primary">Create</button>
`);

$("create").onclick = async ()=>{
const res = await j("/young-people/plans",{
method:"POST",
body:JSON.stringify({
young_person_id:state.selected.id,
title:$("title").value,
summary:$("summary").value
})
});
msg("Created");
loadPlans();
openPlan(res.id);
};
}

// ================= LOAD TAB =================
function loadTab(){
if(!state.selected) return;

const map = {
overview: loadOverview,
plans: loadPlans
};

map[state.activeTab]?.();
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded",()=>{

$$(".tab").forEach(btn=>{
btn.onclick = ()=>setTab(btn.dataset.tab);
});

$("docBackBtn")?.addEventListener("click",closeDocument);

$("plansOpenCreateBtn")?.addEventListener("click",openNewPlan);

loadYoungPeople();
});
