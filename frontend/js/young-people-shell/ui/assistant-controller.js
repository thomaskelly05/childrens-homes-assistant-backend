import {
  state,
  setAssistantScopeBundle,
  setAssistantScopeBundleLoading,
  setAssistantScopeBundleError,
  setAssistantDerivedState,
  pushAssistantLiveUpdate,
  clearAssistantLiveUpdates,
} from "../state.js";

import { els } from "../dom.js";
import { fetchAssistantScopeBundle } from "../core/api.js";
import * as aiScrubber from "../core/ai-scrubber.js";

import {
  buildAssistantEvidenceContext,
} from "../core/assistant-runtime.js";

import { refreshAssistantUi } from "./assistant-ui.js";
import { escapeHtml, formatDate } from "../core/utils.js";

import {
  buildMorningBrief,
  buildManagerBrief,
  buildQualityBrief,
} from "../assistant/brain.js";

let assistantControllerBound = false;
let latestRefreshToken = 0;

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function getAccessLevel(scope) {
  const role = String(state.userRole || "").toLowerCase();

  if (scope === "child") return "child";
  if (scope === "home") return "home";
  if (scope === "quality") {
    return ["ri", "admin"].includes(role) ? "provider" : "home";
  }

  return "home";
}

function buildScopeContext() {
  const scope = state.currentScope || "child";
  const access = getAccessLevel(scope);

  return {
    scope,
    access_level: access,
    provider_id: state.providerId || null,
    allowed_home_ids:
      scope === "quality" && access === "provider"
        ? safeArray(state.allowedHomeIds)
        : [state.homeId].filter(Boolean),
    young_person_id: state.youngPersonId || null,
    home_id: state.homeId || null,
    home_name:
      state.currentUser?.home_name ||
      state.selectedYoungPerson?.home_name ||
      "Home",
    young_person_name:
      state.selectedYoungPerson?.preferred_name ||
      state.selectedYoungPerson?.name ||
      "Young person",
  };
}

function ensureMeta() {
  if (!state.assistantMeta) state.assistantMeta = {};

  state.assistantMeta.runtime ||= {};
  state.assistantMeta.explainability ||= {};
  state.assistantMeta.assistant_scope ||= {};
  state.assistantMeta.assistant_context ||= {};
  state.assistantMeta.sources ||= [];
}

/* --------------------------------------------------
   Scrubber
-------------------------------------------------- */

function scrubBundle(bundle, context) {
  try {
    if (aiScrubber.scrubAssistantPayload) {
      const res = aiScrubber.scrubAssistantPayload({ bundle, context });
      return {
        bundle: res?.safePayload?.bundle || bundle,
        meta: { enabled: true },
      };
    }
  } catch (err) {
    console.error("Scrubber failed", err);
  }

  return { bundle, meta: { enabled: false } };
}

/* --------------------------------------------------
   Core Analysis
-------------------------------------------------- */

async function buildDerivedState(bundle) {
  const runtime = await buildAssistantEvidenceContext({
    message: "summary",
    records_payload: bundle,
    fetchScopeBundle: false,
  });

  // Build briefs
  state.latestMorningBrief = buildMorningBrief("Morning Brief", bundle);
  state.latestManagerBrief = buildManagerBrief("Manager Brief", bundle);
  state.latestQualityBrief = buildQualityBrief("Quality Brief", bundle);

  setAssistantDerivedState({
    chronology: runtime.chronology,
    facts: runtime.facts,
    care_domains: runtime.care_domains,
    morning_brief: state.latestMorningBrief,
    manager_brief: state.latestManagerBrief,
    quality_brief: state.latestQualityBrief,
    live_summary: runtime.summary,
  });

  ensureMeta();

  state.assistantMeta.intent = runtime.intent || "summary";
  state.assistantMeta.retrieval_mode = runtime.retrieval_mode || "whole_scope";
  state.assistantMeta.output_mode = runtime.output_mode || "answer";

  state.assistantMeta.evidence_summary = runtime.summary || {};
  state.assistantMeta.evidence_sufficiency =
    runtime.evidence_sufficiency || {};

  state.assistantMeta.last_analysis_at = new Date().toISOString();
}

/* --------------------------------------------------
   UI Rendering
-------------------------------------------------- */

function renderStatus() {
  if (els.assistantScopeBundleStatus) {
    if (state.scopeBundleLoading) {
      els.assistantScopeBundleStatus.textContent = "Loading evidence…";
    } else if (state.scopeBundleLoadedAt) {
      els.assistantScopeBundleStatus.textContent =
        "Updated " + formatDate(state.scopeBundleLoadedAt);
    }
  }

  if (els.assistantLiveStatus) {
    els.assistantLiveStatus.textContent = state.scopeBundleLoading
      ? "Analysing..."
      : "Assistant ready";
  }
}

function renderBrief(host, brief, empty = "No data") {
  if (!host) return;

  if (!brief) {
    host.innerHTML = `<p>${empty}</p>`;
    return;
  }

  host.innerHTML = `
    <div class="profile-card">
      <strong>${escapeHtml(brief.title || "Brief")}</strong>
      <div>${escapeHtml(
        brief.summary?.total
          ? `${brief.summary.total} records analysed`
          : "No summary"
      )}</div>
    </div>
  `;
}

function renderPanels() {
  renderStatus();

  renderBrief(els.morningBriefBody, state.latestMorningBrief);
  renderBrief(els.managerBriefBody, state.latestManagerBrief);
  renderBrief(els.qualityBriefBody, state.latestQualityBrief);
}

/* --------------------------------------------------
   Main Refresh Logic
-------------------------------------------------- */

export async function refreshAssistantScopeData({
  pushUpdate = false,
} = {}) {
  const token = ++latestRefreshToken;
  const context = buildScopeContext();

  setAssistantScopeBundleLoading(true);

  try {
    const bundle = await fetchAssistantScopeBundle(context);

    if (token !== latestRefreshToken) return;

    const scrubbed = scrubBundle(bundle, context);

    setAssistantScopeBundle(scrubbed.bundle);

    ensureMeta();
    state.assistantMeta.scrubber_enabled = scrubbed.meta.enabled;

    await buildDerivedState(scrubbed.bundle);

    if (pushUpdate) {
      pushAssistantLiveUpdate({
        title: "Scope refreshed",
        message: `Updated ${context.scope}`,
        created_at: new Date().toISOString(),
      });
    }

    refreshAssistantUi();
    renderPanels();

    return scrubbed.bundle;
  } catch (err) {
    setAssistantScopeBundleError(err.message);
  } finally {
    setAssistantScopeBundleLoading(false);
    renderPanels();
  }
}

/* --------------------------------------------------
   Analysis Only
-------------------------------------------------- */

export async function refreshAssistantAnalysisOnly() {
  if (!state.scopeBundle) return;

  await buildDerivedState(state.scopeBundle);

  pushAssistantLiveUpdate({
    title: "Analysis refreshed",
    message: "Derived insights updated",
    created_at: new Date().toISOString(),
  });

  refreshAssistantUi();
  renderPanels();
}

/* --------------------------------------------------
   Event Hooks
-------------------------------------------------- */

export async function onAssistantScopeChanged() {
  await refreshAssistantScopeData();
}

export async function onYoungPersonSelected() {
  await refreshAssistantScopeData({ pushUpdate: true });
}

export async function onWorkspaceRefreshRequested() {
  await refreshAssistantScopeData({ pushUpdate: true });
}

/* --------------------------------------------------
   Bindings
-------------------------------------------------- */

function bindButtons() {
  els.assistantRefreshScopeBtn?.addEventListener("click", () =>
    refreshAssistantScopeData({ pushUpdate: true })
  );

  els.assistantRefreshAnalysisBtn?.addEventListener("click", () =>
    refreshAssistantAnalysisOnly()
  );

  els.clearLiveUpdatesBtn?.addEventListener("click", () => {
    clearAssistantLiveUpdates();
    renderPanels();
  });
}

export function bindAssistantController() {
  if (assistantControllerBound) return;
  assistantControllerBound = true;

  bindButtons();
  renderPanels();
}
