/* =========================
   INDICARE COMPOSER (PRODUCTION)
   SCCIF + OFSTED ALIGNED
   ========================= /

import { state } from "../state.js";
import { els } from "../dom.js";
import { apiSend } from "../core/api.js";
import { escapeHtml, toDateInputValue, toDateTimeLocalValue } from "../core/utils.js";

/ =========================
   HELPERS
   ========================= /

function getToday() {
  return toDateInputValue(new Date());
}

function getNow() {
  return toDateTimeLocalValue(new Date());
}

function getScopeId() {
  return state.youngPersonId || state.homeId || null;
}

/ =========================
   FIELD BUILDER (UPDATED)
   → LABEL + DESCRIPTION ABOVE
   ========================= /

function buildField(field) {
  return     <div class="composer-field ${field.full ? "full" : ""}">       <div class="field-label">${escapeHtml(field.label)}</div>       ${field.description ?<div class="field-description">${escapeHtml(field.description)}</div>: ""}              ${         field.type === "textarea"           ?<textarea name="${field.name}" rows="${field.rows || 4}">${escapeHtml(field.value || "")}</textarea>          : field.type === "select"           ?<select name="${field.name}">
              ${(field.options || [])
                .map(
                  (o) =>
                    <option value="${o.value}" ${                       o.value === field.value ? "selected" : ""                     }>${o.label}</option>
                )
                .join("")}
            </select>          : field.type === "checkbox"           ?<input type="checkbox" name="${field.name}" ${
              field.value ? "checked" : ""
            } />          :<input type="${field.type || "text"}" name="${field.name}" value="${escapeHtml(field.value || "")}" />      }     </div>  ;
}

function section(title, description, fields) {
  return     <section class="composer-section">       <h3>${escapeHtml(title)}</h3>       <p class="section-description">${escapeHtml(description)}</p>       ${fields.map(buildField).join("")}     </section>  ;
}

/ =========================
   DAILY RECORD (BEST PRACTICE)
   ========================= /

function buildDailyNote(item = {}) {
  return {
    title: "Daily Record",
    intro:
      "This record should clearly explain what happened during the shift, how the young person experienced it, and what needs to happen next. It should be clear enough for any professional to understand instantly.",

    html:       ${section(         "Basic Information",         "Record the essential context for this shift.",         [           { name: "date", label: "Date", type: "date", value: item.date || getToday(), description: "The date of the shift." },           { name: "shift", label: "Shift", value: item.shift || "", description: "Day, Late or Night shift." }         ]       )}        ${section(         "What Happened",         "Provide a clear, factual timeline of events during the shift.",         [           { name: "events", label: "Chronology", type: "textarea", rows: 5, description: "Write what happened in order. Stick to facts." }         ]       )}        ${section(         "Child Experience",         "Explain how the young person presented and what they may have been communicating.",         [           { name: "presentation", label: "Presentation", type: "textarea", description: "Mood, behaviour, engagement." },           { name: "voice", label: "Child Voice", type: "textarea", description: "What did they say or communicate?" }         ]       )}        ${section(         "Staff Response",         "Explain what staff did and why.",         [           { name: "response", label: "Staff Response", type: "textarea", description: "What actions did staff take?" }         ]       )}        ${section(         "Outcome & Next Steps",         "Ensure clear accountability.",         [           { name: "outcome", label: "Outcome", type: "textarea", description: "What changed by the end of the shift?" },           { name: "actions", label: "Actions Required", type: "textarea", description: "What must happen next and who is responsible?" }         ]       )}    ,
  };
}

/ =========================
   INCIDENT FORM (SAFEGUARDING GRADE)
   ========================= /

function buildIncident(item = {}) {
  return {
    title: "Incident Record",
    intro:
      "This record must clearly show what happened, how risk was managed, and what decisions were made. It should stand up to safeguarding and Ofsted scrutiny.",

    html:       ${section(         "Incident Details",         "Basic information about the incident.",         [           { name: "datetime", label: "Date & Time", type: "datetime-local", value: getNow(), description: "Exact time of incident." },           { name: "type", label: "Incident Type", description: "Short category (e.g. aggression, missing)." }         ]       )}        ${section(         "Factual Account",         "Provide a clear and objective description.",         [           { name: "description", label: "What Happened", type: "textarea", rows: 5, description: "Write only what you saw and heard." }         ]       )}        ${section(         "Context",         "What led up to the incident.",         [           { name: "before", label: "Antecedent", type: "textarea", description: "What happened before?" }         ]       )}        ${section(         "Response",         "Explain how staff responded.",         [           { name: "response", label: "Staff Response", type: "textarea", description: "What did staff do?" }         ]       )}        ${section(         "Outcome",         "Final position and safety.",         [           { name: "outcome", label: "Outcome", type: "textarea", description: "How did the incident end?" }         ]       )}        ${section(         "Safeguarding",         "Record key safeguarding flags.",         [           { name: "police", label: "Police Involved", type: "checkbox", description: "Tick if police attended." },           { name: "ofsted", label: "Ofsted Notified", type: "checkbox", description: "Tick if notification required." }         ]       )}    ,
  };
}

/ =========================
   KEYWORK SESSION
   ========================= /

function buildKeywork(item = {}) {
  return {
    title: "Keywork Session",
    intro:
      "Record meaningful direct work with the young person. Focus on discussion, reflection, and agreed actions.",

    html:       ${section(         "Session Details",         "Basic session information.",         [           { name: "date", label: "Date", type: "date", value: getToday(), description: "Date of session." },           { name: "topic", label: "Topic", description: "What was the session about?" }         ]       )}        ${section(         "Discussion",         "What was talked about.",         [           { name: "discussion", label: "Discussion Summary", type: "textarea", description: "What was covered?" }         ]       )}        ${section(         "Child Voice",         "What the young person said or communicated.",         [           { name: "voice", label: "Child Voice", type: "textarea", description: "Capture direct voice." }         ]       )}        ${section(         "Outcome",         "What was agreed.",         [           { name: "actions", label: "Actions Agreed", type: "textarea", description: "Clear next steps." }         ]       )}    ,
  };
}

/ =========================
   FORM ROUTER
   ========================= /

function getForm(type, item) {
  if (type === "daily_note") return buildDailyNote(item);
  if (type === "incident") return buildIncident(item);
  if (type === "keywork") return buildKeywork(item);

  return {
    title: "Record",
    intro: "Complete the form below.",
    html: "<p>No form configured</p>",
  };
}

/ =========================
   OPEN COMPOSER
   ========================= /

export function openComposer(type, item = {}) {
  const form = getForm(type, item);

  els.composerTitle.textContent = form.title;
  els.composerIntro.textContent = form.intro;
  els.composerFields.innerHTML = form.html;

  els.composerPanel.classList.remove("hidden");
}

/ =========================
   SAVE
   ========================= */

export async function saveComposer(type) {
  const form = els.composerForm;
  const data = Object.fromEntries(new FormData(form));

  await apiSend(/api/${type}, "POST", {
    ...data,
    young_person_id: state.youngPersonId,
  });

  els.composerPanel.classList.add("hidden");
}