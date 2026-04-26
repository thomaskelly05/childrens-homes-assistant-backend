/* =========================================
   INDICARE COMPOSER — BEST IN CLASS VERSION
   SCCIF • OFSTED • SAFEGUARDING READY
   ========================================= /

import { state } from "../state.js";
import { els } from "../dom.js";
import { apiSend } from "../core/api.js";
import { escapeHtml, toDateInputValue, toDateTimeLocalValue } from "../core/utils.js";

/ =========================================
   CORE HELPERS
   ========================================= /

function today() {
  return toDateInputValue(new Date());
}

function now() {
  return toDateTimeLocalValue(new Date());
}

/ =========================================
   FIELD BUILDER (EXPLANATIONS ABOVE)
   ========================================= /

function field(f) {
  return     <div class="field ${f.full ? "full" : ""}">       <div class="label">${escapeHtml(f.label)}</div>       <div class="description">${escapeHtml(f.desc || "")}</div>              ${         f.type === "textarea"           ?<textarea name="${f.name}" rows="${f.rows || 4}">${escapeHtml(f.value || "")}</textarea>          : f.type === "select"           ?<select name="${f.name}">
              ${f.options
                .map(
                  (o) =>
                    <option value="${o.value}" ${o.value === f.value ? "selected" : ""}>${o.label}</option>
                )
                .join("")}
            </select>          : f.type === "checkbox"           ?<input type="checkbox" name="${f.name}" ${f.value ? "checked" : ""}/>          :<input type="${f.type || "text"}" name="${f.name}" value="${escapeHtml(f.value || "")}" />      }     </div>  ;
}

function section(title, desc, fields) {
  return     <section class="section">       <h3>${escapeHtml(title)}</h3>       <p class="section-desc">${escapeHtml(desc)}</p>       ${fields.map(field).join("")}     </section>  ;
}

/ =========================================
   DAILY RECORD (OUTSTANDING LEVEL)
   ========================================= /

function dailyRecord(item = {}) {
  return {
    title: "Daily Record",
    intro: "This record should clearly explain the day, the young person’s experience, and what must happen next. It must be clear, factual, and defensible.",

    html:       ${section("Basic Info","Core shift details",[         {name:"date",label:"Date",type:"date",value:today(),desc:"Date of this record"},         {name:"shift",label:"Shift",desc:"Day / Late / Night"}       ])}        ${section("What happened (FACT)","Write a clear timeline. No opinion.",[         {name:"chronology",label:"Chronology",type:"textarea",rows:5,desc:"Step-by-step account of events",full:true}       ])}        ${section("Child experience (MEANING)","What this meant for the young person",[         {name:"presentation",label:"Presentation",type:"textarea",desc:"Mood, behaviour, regulation",full:true},         {name:"voice",label:"Child Voice",type:"textarea",desc:"Exact words or communication",full:true},         {name:"analysis",label:"What this may mean",type:"textarea",desc:"What is the behaviour communicating?",full:true}       ])}        ${section("Staff response (ACTION)","What staff did and why",[         {name:"response",label:"Staff Response",type:"textarea",desc:"Explain decisions and actions",full:true}       ])}        ${section("Impact & Risk","What changed and current risk",[         {name:"impact",label:"Impact on child",type:"textarea",desc:"What changed for them?",full:true},         {name:"risk",label:"Risk update",type:"textarea",desc:"Risk increased, decreased or same?",full:true}       ])}        ${section("Next steps (ACCOUNTABILITY)","Clear follow-up",[         {name:"actions",label:"Actions Required",type:"textarea",desc:"Who does what and when",full:true},         {name:"manager",label:"Manager Oversight",type:"textarea",desc:"Management review / challenge",full:true}       ])}    
  };
}

/ =========================================
   INCIDENT (SAFEGUARDING GRADE)
   ========================================= /

function incidentForm(item = {}) {
  return {
    title: "Incident Record",
    intro: "This must clearly show what happened, how risk was managed, and why decisions were made.",

    html:       ${section("Incident Details","Basic info",[         {name:"datetime",label:"Date & Time",type:"datetime-local",value:now(),desc:"Exact time"},         {name:"type",label:"Incident Type",desc:"Short category"}       ])}        ${section("Factual Account","Clear, neutral, chronological",[         {name:"description",label:"What happened",type:"textarea",rows:5,desc:"Facts only",full:true}       ])}        ${section("Context","What led to incident",[         {name:"antecedent",label:"Before incident",type:"textarea",desc:"Triggers/events",full:true}       ])}        ${section("Child Experience","Their perspective",[         {name:"presentation",label:"Presentation",type:"textarea",desc:"Behaviour/emotion",full:true},         {name:"voice",label:"Child Voice",type:"textarea",desc:"What they said",full:true}       ])}        ${section("Response","What staff did",[         {name:"response",label:"Staff Response",type:"textarea",desc:"Actions taken",full:true}       ])}        ${section("Outcome","End result",[         {name:"outcome",label:"Outcome",type:"textarea",desc:"Final position",full:true}       ])}        ${section("Safeguarding","Compliance flags",[         {name:"police",label:"Police involved",type:"checkbox",desc:"Tick if yes"},         {name:"ofsted",label:"Ofsted notified",type:"checkbox",desc:"Tick if required"}       ])}    
  };
}

/ =========================================
   KEYWORK (THERAPEUTIC QUALITY)
   ========================================= /

function keyworkForm(item = {}) {
  return {
    title: "Keywork Session",
    intro: "This should show meaningful work, reflection, and agreed change.",

    html:       ${section("Session Info","Basic details",[         {name:"date",label:"Date",type:"date",value:today(),desc:"Session date"},         {name:"topic",label:"Topic",desc:"Focus of session"}       ])}        ${section("Discussion","What happened",[         {name:"discussion",label:"Discussion",type:"textarea",desc:"What was explored",full:true}       ])}        ${section("Child Voice","Young person perspective",[         {name:"voice",label:"Child Voice",type:"textarea",desc:"Direct voice",full:true}       ])}        ${section("Reflection","Meaning",[         {name:"reflection",label:"Analysis",type:"textarea",desc:"What this means",full:true}       ])}        ${section("Outcome","Next steps",[         {name:"actions",label:"Actions Agreed",type:"textarea",desc:"Clear plan",full:true}       ])}    
  };
}

/ =========================================
   FORM ROUTER
   ========================================= /

function getForm(type, item) {
  if (type === "daily_note") return dailyRecord(item);
  if (type === "incident") return incidentForm(item);
  if (type === "keywork") return keyworkForm(item);

  return { title:"Record", intro:"Complete form", html:"" };
}

/ =========================================
   OPEN
   ========================================= /

export function openComposer(type, item = {}) {
  const form = getForm(type, item);

  els.composerTitle.textContent = form.title;
  els.composerIntro.textContent = form.intro;
  els.composerFields.innerHTML = form.html;

  els.composerPanel.classList.remove("hidden");
}

/ =========================================
   SAVE (WITH QUALITY CHECK)
   ========================================= */

function qualityCheck(data) {
  const issues = [];

  if (!data.chronology && !data.description)
    issues.push("Missing factual account");

  if (!data.voice)
    issues.push("Missing child voice");

  if (!data.actions)
    issues.push("Missing actions");

  return issues;
}

export async function saveComposer(type) {
  const form = els.composerForm;
  const data = Object.fromEntries(new FormData(form));

  const issues = qualityCheck(data);

  if (issues.length) {
    console.warn("Quality issues:", issues);
  }

  await apiSend(/api/${type}, "POST", {
    ...data,
    young_person_id: state.youngPersonId,
  });

  els.composerPanel.classList.add("hidden");
}