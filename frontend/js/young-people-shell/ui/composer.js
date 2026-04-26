import { state } from "../state.js";
import { els } from "../dom.js";
import { apiSend } from "../core/api.js";
import {
  escapeHtml,
  toDateInputValue,
  toDateTimeLocalValue,
} from "../core/utils.js";

function today() {
  return toDateInputValue(new Date());
}

function now() {
  return toDateTimeLocalValue(new Date());
}

function field(f) {
  const fullClass = f.full ? "full" : "";
  const description = f.desc
    ? `<div class="description">${escapeHtml(f.desc)}</div>`
    : "";

  let control = "";

  if (f.type === "textarea") {
    control = `<textarea name="${escapeHtml(f.name)}" rows="${f.rows || 4}">${escapeHtml(
      f.value || ""
    )}</textarea>`;
  } else if (f.type === "select") {
    control = `
      <select name="${escapeHtml(f.name)}">
        ${(f.options || [])
          .map(
            (o) =>
              `<option value="${escapeHtml(o.value)}" ${
                o.value === f.value ? "selected" : ""
              }>${escapeHtml(o.label)}</option>`
          )
          .join("")}
      </select>
    `;
  } else if (f.type === "checkbox") {
    control = `<input type="checkbox" name="${escapeHtml(f.name)}" ${
      f.value ? "checked" : ""
    } />`;
  } else {
    control = `<input type="${escapeHtml(f.type || "text")}" name="${escapeHtml(
      f.name
    )}" value="${escapeHtml(f.value || "")}" />`;
  }

  return `
    <div class="field ${fullClass}">
      <div class="label">${escapeHtml(f.label)}</div>
      ${description}
      ${control}
    </div>
  `;
}

function section(title, desc, fields) {
  return `
    <section class="section">
      <h3>${escapeHtml(title)}</h3>
      <p class="section-desc">${escapeHtml(desc)}</p>
      ${fields.map(field).join("")}
    </section>
  `;
}

function dailyRecord() {
  return {
    title: "Daily Record",
    intro:
      "This record should clearly explain the day, the young person’s experience, and what must happen next.",
    html: `
      ${section("Basic Info", "Core shift details", [
        { name: "date", label: "Date", type: "date", value: today(), desc: "Date of this record" },
        { name: "shift", label: "Shift", desc: "Day / Late / Night" },
      ])}

      ${section("What happened", "Write a clear timeline. No opinion.", [
        { name: "chronology", label: "Chronology", type: "textarea", rows: 5, desc: "Step-by-step account of events", full: true },
      ])}

      ${section("Child experience", "What this meant for the young person", [
        { name: "presentation", label: "Presentation", type: "textarea", desc: "Mood, behaviour, regulation", full: true },
        { name: "voice", label: "Child Voice", type: "textarea", desc: "Exact words or communication", full: true },
        { name: "analysis", label: "What this may mean", type: "textarea", desc: "What is the behaviour communicating?", full: true },
      ])}

      ${section("Staff response", "What staff did and why", [
        { name: "response", label: "Staff Response", type: "textarea", desc: "Explain decisions and actions", full: true },
      ])}

      ${section("Impact & Risk", "What changed and current risk", [
        { name: "impact", label: "Impact on child", type: "textarea", full: true },
        { name: "risk", label: "Risk update", type: "textarea", full: true },
      ])}

      ${section("Next steps", "Clear follow-up", [
        { name: "actions", label: "Actions Required", type: "textarea", full: true },
        { name: "manager", label: "Manager Oversight", type: "textarea", full: true },
      ])}
    `,
  };
}

function incidentForm() {
  return {
    title: "Incident Record",
    intro:
      "This must clearly show what happened, how risk was managed, and why decisions were made.",
    html: `
      ${section("Incident Details", "Basic info", [
        { name: "datetime", label: "Date & Time", type: "datetime-local", value: now() },
        { name: "type", label: "Incident Type" },
      ])}

      ${section("Factual Account", "Clear, neutral, chronological", [
        { name: "description", label: "What happened", type: "textarea", rows: 5, full: true },
      ])}

      ${section("Context", "What led to incident", [
        { name: "antecedent", label: "Before incident", type: "textarea", full: true },
      ])}

      ${section("Child Experience", "Their perspective", [
        { name: "presentation", label: "Presentation", type: "textarea", full: true },
        { name: "voice", label: "Child Voice", type: "textarea", full: true },
      ])}

      ${section("Response", "What staff did", [
        { name: "response", label: "Staff Response", type: "textarea", full: true },
      ])}

      ${section("Outcome", "End result", [
        { name: "outcome", label: "Outcome", type: "textarea", full: true },
      ])}

      ${section("Safeguarding", "Compliance flags", [
        { name: "police", label: "Police involved", type: "checkbox" },
        { name: "ofsted", label: "Ofsted notified", type: "checkbox" },
      ])}
    `,
  };
}

function keyworkForm() {
  return {
    title: "Keywork Session",
    intro: "This should show meaningful work, reflection, and agreed change.",
    html: `
      ${section("Session Info", "Basic details", [
        { name: "date", label: "Date", type: "date", value: today() },
        { name: "topic", label: "Topic" },
      ])}

      ${section("Discussion", "What happened", [
        { name: "discussion", label: "Discussion", type: "textarea", full: true },
      ])}

      ${section("Child Voice", "Young person perspective", [
        { name: "voice", label: "Child Voice", type: "textarea", full: true },
      ])}

      ${section("Reflection", "Meaning", [
        { name: "reflection", label: "Analysis", type: "textarea", full: true },
      ])}

      ${section("Outcome", "Next steps", [
        { name: "actions", label: "Actions Agreed", type: "textarea", full: true },
      ])}
    `,
  };
}

function getForm(type) {
  if (type === "daily_note") return dailyRecord();
  if (type === "incident") return incidentForm();
  if (type === "keywork") return keyworkForm();

  return { title: "Record", intro: "Complete form", html: "" };
}

export function openComposer(type, item = {}) {
  const form = getForm(type, item);

  if (els.composerTitle) els.composerTitle.textContent = form.title;
  if (els.composerIntro) els.composerIntro.textContent = form.intro;
  if (els.composerFields) els.composerFields.innerHTML = form.html;

  els.composerPanel?.classList.remove("hidden");
}

export function openComposerFor(type, item = {}) {
  return openComposer(type, item);
}

export function closeComposer() {
  els.composerPanel?.classList.add("hidden");
}

export function resetComposer() {
  if (els.composerForm) els.composerForm.reset();
  if (els.composerFields) els.composerFields.innerHTML = "";
  closeComposer();
}

function qualityCheck(data) {
  const issues = [];

  if (!data.chronology && !data.description) {
    issues.push("Missing factual account");
  }

  if (!data.voice) {
    issues.push("Missing child voice");
  }

  if (!data.actions) {
    issues.push("Missing actions");
  }

  return issues;
}

function getEndpointForType(type) {
  const youngPersonId = state.youngPersonId;

  if (type === "daily_note") return `/young-people/${youngPersonId}/daily-notes`;
  if (type === "incident") return `/young-people/${youngPersonId}/incidents`;
  if (type === "keywork") return `/young-people/${youngPersonId}/keywork`;

  return `/api/${type}`;
}

export async function saveComposer(type) {
  const form = els.composerForm;

  if (!form) {
    throw new Error("Composer form is not available.");
  }

  const data = Object.fromEntries(new FormData(form));

  const issues = qualityCheck(data);
  if (issues.length) {
    console.warn("Quality issues:", issues);
  }

  await apiSend(getEndpointForType(type), "POST", {
    ...data,
    young_person_id: state.youngPersonId,
  });

  closeComposer();
}
