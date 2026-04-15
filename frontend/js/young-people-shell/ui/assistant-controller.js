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
  buildMorningBriefContext,
  buildManagerBriefContext,
  buildQualityBriefContext,
} from "../core/assistant-runtime.js";
import { refreshAssistantUi } from "./assistant-ui.js";
import { escapeHtml, formatDate } from "../core/utils.js";

let assistantControllerBound = false;
let latestRefreshToken = 0;

const MAX_BRIEF_EVIDENCE = 10;
const MAX_BRIEF_CHRONOLOGY = 5;

function getAllowedHomeIds() {
  return Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
    : [];
}

function getAccessLevelForScope(scope = state.currentScope || "child") {
  const role = String(state.userRole || "").toLowerCase();

  if (scope === "child") return "child";
  if (scope === "home") return "home";
  if (scope === "quality") {
    return role === "ri" || role === "admin" ? "provider" : "home";
  }
  return "home";
}

function getScopeContext() {
  const scope = state.currentScope || "child";
  const accessLevel = getAccessLevelForScope(scope);

  return {
    scope,
    current_scope: scope,
    access_level: accessLevel,
    provider_id:
      state.providerId ||
      state.currentUser?.provider_id ||
      state.currentUser?.providerId ||
      null,
    allowed_home_ids:
      scope === "quality" && accessLevel === "provider"
        ? getAllowedHomeIds()
        : [state.homeId || state.selectedYoungPerson?.home_id].filter(Boolean),
    young_person_id: state.youngPersonId || null,
    home_id: state.homeId || state.selectedYoungPerson?.home_id || null,
    home_name:
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      state.selectedYoungPerson?.home_name ||
      null,
    young_person_name:
      state.selectedYoungPerson?.preferred_name ||
      state.selectedYoungPerson?.full_name ||
      state.selectedYoungPerson?.name ||
      null,
  };
}

function getBundlePayload() {
  return state.scopeBundle || {};
}

function ensureAssistantMeta() {
  if (!state.assistantMeta || typeof state.assistantMeta !== "object") {
    state.assistantMeta = {};
  }
}

function scrubAssistantBundle(bundle = {}, context = {}) {
  try {
    if (typeof aiScrubber.scrubAssistantPayload === "function") {
      const result = aiScrubber.scrubAssistantPayload({
        context,
        bundle,
      });

      return {
        bundle: result?.safePayload?.bundle || result?.safePayload || bundle,
        meta: {
          enabled: true,
          mode: "client_side_bundle",
        },
      };
    }

    if (typeof aiScrubber.createScrubber === "function") {
      const scrubber = aiScrubber.createScrubber();
      scrubber.registerContext(context || {});
      scrubber.registerContext(bundle || {});
      const safeBundle = scrubber.scrubPayload(bundle || {});

      return {
        bundle: safeBundle || bundle,
        meta: {
          enabled: true,
          mode: "client_side_bundle",
        },
      };
    }

    return {
      bundle,
      meta: {
        enabled: false,
        reason: "scrubber_not_found",
      },
    };
  } catch (error) {
    console.error("[assistant-controller] bundle scrub failed", error);

    return {
      bundle,
      meta: {
        enabled: false,
        reason: "scrubber_error",
        error: error?.message || "Unknown scrubber error",
      },
    };
  }
}

function renderBundleStatus() {
  if (els.assistantScopeBundleStatus) {
    if (state.scopeBundleLoading) {
      els.assistantScopeBundleStatus.textContent = "Loading scoped records…";
    } else if (state.scopeBundleLoadedAt) {
      els.assistantScopeBundleStatus.textContent = `Scoped records loaded: ${formatDate(
        state.scopeBundleLoadedAt
      )}`;
    } else {
      els.assistantScopeBundleStatus.textContent = "No scoped records loaded.";
    }
  }

  if (els.assistantScopeBundleError) {
    els.assistantScopeBundleError.textContent = state.scopeBundleError || "";
    els.assistantScopeBundleError.classList.toggle(
      "hidden",
      !state.scopeBundleError
    );
  }

  if (els.assistantLiveStatus) {
    const summary = state.assistantMeta?.live_summary;
    if (summary && typeof summary === "object") {
      els.assistantLiveStatus.textContent = `Live analysis ready • evidence items: ${
        summary.evidence_count ?? summary.total ?? 0
      }`;
    } else if (state.scopeBundleLoading) {
      els.assistantLiveStatus.textContent = "Analysing scoped records…";
    } else {
      els.assistantLiveStatus.textContent = "Assistant ready.";
    }
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function renderBriefPanel(host, brief, emptyText = "No brief available yet.") {
  if (!host) return;

  if (!brief) {
    host.innerHTML = `<p>${escapeHtml(emptyText)}</p>`;
    return;
  }

  const keyConcerns = safeArray(brief.key_concerns);
  const evidence = safeArray(brief.evidence).slice(0, MAX_BRIEF_EVIDENCE);
  const chronology = safeArray(brief.chronology).slice(0, MAX_BRIEF_CHRONOLOGY);
  const facts = brief.facts || {};
  const sufficiency = brief.evidence_sufficiency || {};

  host.innerHTML = `
    <div class="profile-stack">
      <div class="profile-card">
        <div class="profile-card-title">${escapeHtml(brief.title || "Brief")}</div>
        <div class="profile-card-text">
          Scope: ${escapeHtml(brief.scope || "unknown")} • Section: ${escapeHtml(
    brief.section || "unknown"
  )}
        </div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Summary</div>
        <div class="profile-card-text">
          Evidence items: ${escapeHtml(
            String(brief.summary?.total ?? evidence.length ?? 0)
          )}<br />
          Open tasks: ${escapeHtml(String(brief.summary?.open_tasks ?? 0))}<br />
          Overdue items: ${escapeHtml(
            String(brief.summary?.overdue_items ?? 0)
          )}<br />
          Confidence: ${escapeHtml(String(sufficiency.confidence || "unknown"))}
        </div>
      </div>

      ${
        keyConcerns.length
          ? `
            <div class="profile-card">
              <div class="profile-card-title">Key concerns</div>
              <div class="profile-card-text">${keyConcerns
                .map((item) => escapeHtml(String(item || "")))
                .join("<br />")}</div>
            </div>
          `
          : ""
      }

      ${
        facts.next_appointment ||
        facts.latest_incident ||
        facts.latest_missing_episode
          ? `
            <div class="profile-card">
              <div class="profile-card-title">Key dates</div>
              <div class="profile-card-text">
                ${
                  facts.next_appointment
                    ? `Next appointment: ${escapeHtml(
                        facts.next_appointment.title || "Appointment"
                      )} ${
                        facts.next_appointment.date
                          ? `(${escapeHtml(String(facts.next_appointment.date))})`
                          : ""
                      }<br />`
                    : ""
                }
                ${
                  facts.latest_incident
                    ? `Latest incident: ${escapeHtml(
                        facts.latest_incident.title || "Incident"
                      )} ${
                        facts.latest_incident.date
                          ? `(${escapeHtml(String(facts.latest_incident.date))})`
                          : ""
                      }<br />`
                    : ""
                }
                ${
                  facts.latest_missing_episode
                    ? `Latest missing episode: ${escapeHtml(
                        facts.latest_missing_episode.title || "Missing episode"
                      )} ${
                        facts.latest_missing_episode.date
                          ? `(${escapeHtml(
                              String(facts.latest_missing_episode.date)
                            )})`
                          : ""
                      }`
                    : ""
                }
              </div>
            </div>
          `
          : ""
      }

      ${
        chronology.length
          ? `
            <div class="profile-card">
              <div class="profile-card-title">Chronology</div>
              <div class="profile-card-text">
                ${chronology
                  .map((item) =>
                    escapeHtml(
                      [item.date, item.title, item.summary]
                        .filter(Boolean)
                        .join(" - ")
                    )
                  )
                  .join("<br />")}
              </div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderLiveUpdates() {
  if (!els.liveUpdatesBody) return;

  const updates = Array.isArray(state.liveUpdates) ? state.liveUpdates : [];

  if (!updates.length) {
    els.liveUpdatesBody.innerHTML = `<p>No live updates yet.</p>`;
    return;
  }

  els.liveUpdatesBody.innerHTML = updates
    .map((update) => {
      const title = escapeHtml(String(update.title || "Update"));
      const message = escapeHtml(String(update.message || ""));
      const timestamp = update.created_at
        ? escapeHtml(formatDate(update.created_at))
        : "";

      return `
        <div class="entity-row">
          <div class="entity-title">${title}</div>
          ${timestamp ? `<div class="entity-meta">${timestamp}</div>` : ""}
          ${
            message
              ? `<div class="entity-meta" style="margin-top:6px;">${message}</div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function renderAssistantExtraPanels() {
  renderBundleStatus();

  renderBriefPanel(
    els.morningBriefBody,
    state.latestMorningBrief,
    "No morning brief available yet."
  );

  renderBriefPanel(
    els.managerBriefBody,
    state.latestManagerBrief,
    "No manager brief available yet."
  );

  renderBriefPanel(
    els.qualityBriefBody,
    state.latestQualityBrief,
    "No quality brief available yet."
  );

  renderLiveUpdates();
}

async function buildDerivedAssistantStateFromBundle(bundle) {
  const records_payload = bundle || {};

  const runtime = await buildAssistantEvidenceContext({
    message: "summary",
    records_payload,
    fetchScopeBundle: false,
  });

  const morningBrief = await buildMorningBriefContext({
    records_payload,
    fetchScopeBundle: false,
  });

  const managerBrief = await buildManagerBriefContext({
    records_payload,
    fetchScopeBundle: false,
  });

  const qualityBrief = await buildQualityBriefContext({
    records_payload,
    fetchScopeBundle: false,
  });

  setAssistantDerivedState({
    chronology: runtime.chronology,
    facts: runtime.facts,
    care_domains: runtime.care_domains,
    morning_brief: morningBrief,
    manager_brief: managerBrief,
    quality_brief: qualityBrief,
    live_summary: {
      ...runtime.summary,
      evidence_count: runtime.evidence?.length ?? runtime.summary?.total ?? 0,
    },
  });

  ensureAssistantMeta();

  state.assistantMeta.chronology = runtime.chronology || [];
  state.assistantMeta.facts = runtime.facts || {};
  state.assistantMeta.care_domains = runtime.care_domains || {};
  state.assistantMeta.evidence_summary = runtime.summary || {};
  state.assistantMeta.evidence_sufficiency =
    runtime.evidence_sufficiency || {};
  state.assistantMeta.retrieval_mode =
    runtime.retrieval_mode || "whole_scope";
  state.assistantMeta.output_mode = runtime.output_mode || "answer";
  state.assistantMeta.intent = runtime.intent || "summary";
  state.assistantMeta.last_bundle_refresh_at = new Date().toISOString();
}

export async function refreshAssistantScopeData({
  pushUpdate = false,
  updateTitle = "Assistant scope refreshed",
} = {}) {
  const token = ++latestRefreshToken;
  const context = getScopeContext();

  setAssistantScopeBundleLoading(true);
  setAssistantScopeBundleError(null);
  renderAssistantExtraPanels();

  try {
    const bundle = await fetchAssistantScopeBundle(context);

    if (token !== latestRefreshToken) return null;

    const scrubbed = scrubAssistantBundle(bundle, context);

    setAssistantScopeBundle(scrubbed.bundle);

    ensureAssistantMeta();
    state.assistantMeta.scrubber_enabled = scrubbed.meta?.enabled ?? false;
    state.assistantMeta.scrubber_meta = scrubbed.meta || {};
    state.assistantMeta.scope_access_level = context.access_level;
    state.assistantMeta.allowed_home_ids = context.allowed_home_ids || [];
    state.assistantMeta.provider_id = context.provider_id || null;

    await buildDerivedAssistantStateFromBundle(scrubbed.bundle);

    if (pushUpdate) {
      pushAssistantLiveUpdate({
        title: updateTitle,
        message:
          context.scope === "child"
            ? `Scoped records refreshed for ${
                context.young_person_name || "the selected young person"
              }.`
            : context.scope === "quality" && context.access_level === "provider"
            ? `Scoped records refreshed across ${safeArray(context.allowed_home_ids).length} allowed home(s).`
            : `Scoped records refreshed for ${
                context.home_name || "the selected home"
              }.`,
        created_at: new Date().toISOString(),
      });
    }

    refreshAssistantUi();
    renderAssistantExtraPanels();
    return scrubbed.bundle;
  } catch (error) {
    if (token !== latestRefreshToken) return null;

    setAssistantScopeBundleError(
      error?.message || "Could not load scoped assistant records."
    );
    renderAssistantExtraPanels();
    return null;
  } finally {
    if (token === latestRefreshToken) {
      setAssistantScopeBundleLoading(false);
      renderAssistantExtraPanels();
    }
  }
}

export async function refreshAssistantAnalysisOnly() {
  const bundle = getBundlePayload();

  if (!bundle || typeof bundle !== "object") {
    setAssistantScopeBundleError("No scoped records are loaded yet.");
    renderAssistantExtraPanels();
    return;
  }

  await buildDerivedAssistantStateFromBundle(bundle);

  pushAssistantLiveUpdate({
    title: "Assistant analysis refreshed",
    message:
      "Derived summaries, facts, chronology, and brief panels were updated.",
    created_at: new Date().toISOString(),
  });

  refreshAssistantUi();
  renderAssistantExtraPanels();
}

export async function onAssistantScopeChanged() {
  await refreshAssistantScopeData({
    pushUpdate: false,
  });
}

export async function onYoungPersonSelected() {
  await refreshAssistantScopeData({
    pushUpdate: true,
    updateTitle: "Young person context loaded",
  });
}

export async function onWorkspaceRefreshRequested() {
  await refreshAssistantScopeData({
    pushUpdate: true,
    updateTitle: "Workspace refreshed",
  });
}

function bindRefreshButtons() {
  els.assistantRefreshScopeBtn?.addEventListener("click", async () => {
    await refreshAssistantScopeData({
      pushUpdate: true,
      updateTitle: "Assistant scope refreshed",
    });
  });

  els.assistantRefreshAnalysisBtn?.addEventListener("click", async () => {
    await refreshAssistantAnalysisOnly();
  });

  els.refreshBtn?.addEventListener("click", async () => {
    await onWorkspaceRefreshRequested();
  });

  els.refreshWorkspaceBtn?.addEventListener("click", async () => {
    await onWorkspaceRefreshRequested();
  });

  els.clearLiveUpdatesBtn?.addEventListener("click", () => {
    clearAssistantLiveUpdates();
    renderAssistantExtraPanels();
  });
}

export function renderAssistantControllerPanels() {
  renderAssistantExtraPanels();
}

export function bindAssistantController() {
  if (assistantControllerBound) return;
  assistantControllerBound = true;

  bindRefreshButtons();
  renderAssistantExtraPanels();
}
