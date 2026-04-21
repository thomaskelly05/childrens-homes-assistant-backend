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
import { buildAssistantEvidenceContext } from "../core/assistant-runtime.js";
import { refreshAssistantUi } from "./assistant-ui.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  buildMorningBrief,
  buildManagerBrief,
  buildQualityBrief,
} from "../assistant/brain.js";
import {
  ensureAssistantState,
  getAssistantMeta,
  mergeAssistantMeta,
  getCurrentScope,
  getCurrentSection,
  getSelectedYoungPerson,
  getHomeName,
  getAllowedHomeIds,
  getAccessLevelForScope,
  getAssistantTypeForScope,
  detectAssistantIntent,
  detectAssistantIntents,
  detectRetrievalMode,
  detectOutputMode,
  assistantPromptsForView,
} from "../assistant/helpers.js";
import { inferAssistantAnalysisLens } from "../core/assistant-context.js";

let assistantControllerBound = false;
let latestRefreshToken = 0;

const MAX_BRIEF_EVIDENCE = 10;
const MAX_BRIEF_CHRONOLOGY = 5;
const QUALITY_LEVEL_SCOPES = new Set(["quality", "ofsted", "reports"]);

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getScopeContext() {
  const scope = getCurrentScope();
  const accessLevel = getAccessLevelForScope(scope);
  const youngPerson = getSelectedYoungPerson();

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
      QUALITY_LEVEL_SCOPES.has(scope) && accessLevel === "provider"
        ? getAllowedHomeIds()
        : [state.homeId || youngPerson?.home_id || youngPerson?.homeId].filter(
            Boolean
          ),
    young_person_id: state.youngPersonId || null,
    home_id:
      state.homeId ||
      youngPerson?.home_id ||
      youngPerson?.homeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      null,
    home_name: getHomeName(),
    young_person_name:
      youngPerson?.preferred_name ||
      youngPerson?.full_name ||
      youngPerson?.name ||
      "Young person",
    assistant_type: getAssistantTypeForScope(scope),
  };
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

function currentAssistantContext() {
  const scopeContext = getScopeContext();
  const scope = getCurrentScope();
  const section = getCurrentSection();
  const person = getSelectedYoungPerson() || {};
  const prompts = assistantPromptsForView(section, scope);

  const intentMeta = detectAssistantIntents(
    `${scope} ${section} ${state.userRole || ""}`
  );
  const analysisLens = inferAssistantAnalysisLens({
    scope,
    section,
    role: state.userRole,
    intent: intentMeta.primary_intent,
  });

  return {
    scope,
    section,
    role: state.userRole || "staff",
    access_level: scopeContext.access_level,
    analysis_lens: analysisLens,
    prompts,
    person: {
      id: scopeContext.young_person_id,
      name:
        person.preferred_name ||
        person.full_name ||
        person.name ||
        scopeContext.young_person_name ||
        "Young person",
      preferred_name: person.preferred_name || "",
      home_name: person.home_name || scopeContext.home_name || "",
      risk: person.summary_risk_level || "",
      placement_status: person.placement_status || "",
    },
    home: {
      home_id: scopeContext.home_id,
      home_name: scopeContext.home_name || "Home",
    },
    active_record_type: state.activeRecordType || null,
    active_record_item: state.activeRecordItem || null,
    composer_record_type: state.composerRecordType || null,
    composer_record_id: state.composerRecordId || null,
  };
}

function getBundlePayload() {
  return state.scopeBundle || {};
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
    const summary = getAssistantMeta()?.live_summary;
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
          Scope: ${escapeHtml(brief.scope || "unknown")} •
          Lens: ${escapeHtml(brief.analysis_lens || "general")} •
          Section: ${escapeHtml(brief.section || "unknown")}
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
              ? `<div class="entity-meta entity-meta-description">${message}</div>`
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

function setAssistantContextText() {
  if (!els.assistantContext) return;

  const context = currentAssistantContext();
  const meta = getAssistantMeta() || {};
  const assistantContext = meta.assistant_context || {};
  const startDate =
    assistantContext.reporting_period_start ||
    assistantContext.start_date ||
    null;
  const endDate =
    assistantContext.reporting_period_end || assistantContext.end_date || null;
  const periodLabel = (() => {
    if (!startDate && !endDate) return "";
    if (startDate && endDate) {
      return ` • period: ${formatDate(startDate)} to ${formatDate(endDate)}`;
    }
    if (startDate) {
      return ` • from: ${formatDate(startDate)}`;
    }
    return ` • to: ${formatDate(endDate)}`;
  })();

  if (context.scope === "child") {
    els.assistantContext.textContent = `Scoped to ${context.person.name} in ${
      context.person.home_name || context.home.home_name || "the home"
    } • lens: ${context.analysis_lens}${periodLabel}.`;
    return;
  }

  if (context.scope === "home") {
    els.assistantContext.textContent = `Scoped to home oversight for ${
      context.home.home_name || "the current home"
    } • lens: ${context.analysis_lens}${periodLabel}.`;
    return;
  }

  if (QUALITY_LEVEL_SCOPES.has(context.scope)) {
    els.assistantContext.textContent = `Scoped to quality and oversight across authorised homes • lens: ${context.analysis_lens}${periodLabel}.`;
    return;
  }

  els.assistantContext.textContent = `Scoped to operational oversight • lens: ${context.analysis_lens}${periodLabel}.`;
}

function renderScopeBadges() {
  const context = currentAssistantContext();

  if (els.scopeBadge) {
    els.scopeBadge.textContent =
      context.scope === "child"
        ? "Young person assistant"
        : context.scope === "home"
          ? "Home assistant"
          : QUALITY_LEVEL_SCOPES.has(context.scope)
            ? "Quality assistant"
            : "Operations assistant";
  }

  if (els.scopeHomeBadge) {
    const homeName = context.home?.home_name;
    els.scopeHomeBadge.textContent = homeName || "";
    els.scopeHomeBadge.classList.toggle("hidden", !homeName);
  }

  if (els.scopeChildBadge) {
    const childName =
      context.scope === "child" ? context.person?.name || "" : "";
    els.scopeChildBadge.textContent = childName;
    els.scopeChildBadge.classList.toggle("hidden", !childName);
  }

  if (els.scopeShiftBadge) {
    els.scopeShiftBadge.textContent =
      state.currentSection || state.activeSection || "workspace";
  }
}

function writeBriefsFromBrain(runtime) {
  const bundle = getBundlePayload();
  const context = currentAssistantContext();

  state.latestMorningBrief = buildMorningBrief("morning brief", bundle, {
    context,
    runtime,
  });

  state.latestManagerBrief = buildManagerBrief("manager oversight brief", bundle, {
    context,
    runtime,
  });

  state.latestQualityBrief = buildQualityBrief("quality and inspection brief", bundle, {
    context,
    runtime,
  });
}

async function buildDerivedAssistantStateFromBundle(bundle) {
  const recordsPayload = bundle || {};
  const context = currentAssistantContext();

  const runtime = await buildAssistantEvidenceContext({
    message: "summary",
    records_payload: recordsPayload,
    fetchScopeBundle: false,
    context: {
      scope: context.scope,
      section: context.section,
      role: context.role,
      analysis_lens: context.analysis_lens,
    },
  });

  writeBriefsFromBrain(runtime);

  setAssistantDerivedState({
    chronology: runtime.chronology,
    facts: runtime.facts,
    care_domains: runtime.care_domains,
    morning_brief: state.latestMorningBrief,
    manager_brief: state.latestManagerBrief,
    quality_brief: state.latestQualityBrief,
    live_summary: {
      ...runtime.summary,
      evidence_count: runtime.evidence?.length ?? runtime.summary?.total ?? 0,
    },
  });

  mergeAssistantMeta({
    intent: runtime.intent || "summary",
    secondary_intents: Array.isArray(runtime.secondary_intents)
      ? runtime.secondary_intents
      : [],
    retrieval_mode: runtime.retrieval_mode || "whole_scope",
    output_mode: runtime.output_mode || "answer",
    chronology: runtime.chronology || [],
    facts: runtime.facts || {},
    care_domains: runtime.care_domains || {},
    evidence_summary: runtime.summary || {},
    evidence_sufficiency: runtime.evidence_sufficiency || {},
    live_summary: {
      ...runtime.summary,
      evidence_count: runtime.evidence?.length ?? runtime.summary?.total ?? 0,
    },
    runtime: {
      ...(runtime.runtime || {}),
      analysis_lens: context.analysis_lens,
      assistant_intent: runtime.intent || "summary",
      retrieval_mode: runtime.retrieval_mode || "whole_scope",
      output_mode: runtime.output_mode || "answer",
    },
    explainability: {
      ...(runtime.explainability || {}),
      reasoning_lens: context.analysis_lens,
    },
    assistant_context: {
      ...(getAssistantMeta().assistant_context || {}),
      analysis_lens: context.analysis_lens,
      suggested_prompts: context.prompts || [],
    },
    last_bundle_refresh_at: new Date().toISOString(),
    last_analysis_at: new Date().toISOString(),
  });

  renderScopeBadges();
  setAssistantContextText();
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

    mergeAssistantMeta({
      scrubber_enabled: scrubbed.meta?.enabled ?? false,
      scrubber_meta: scrubbed.meta || {},
      assistant_scope: {
        ...(getAssistantMeta().assistant_scope || {}),
        scope: context.scope,
        current_scope: context.current_scope,
        access_level: context.access_level,
        provider_id: context.provider_id || null,
        allowed_home_ids: context.allowed_home_ids || [],
        home_id: context.home_id || null,
        young_person_id: context.young_person_id || null,
        assistant_type: context.assistant_type,
      },
      assistant_context: {
        ...(getAssistantMeta().assistant_context || {}),
        scope: context.scope,
        access_level: context.access_level,
        provider_id: context.provider_id || null,
        allowed_home_ids: context.allowed_home_ids || [],
        home_name: context.home_name || null,
        young_person_name: context.young_person_name || null,
        section: getCurrentSection(),
      },
    });

    await buildDerivedAssistantStateFromBundle(scrubbed.bundle);

    if (pushUpdate) {
      pushAssistantLiveUpdate({
        title: updateTitle,
        message:
          context.scope === "child"
            ? `Scoped records refreshed for ${
                context.young_person_name || "the selected young person"
              }.`
            : QUALITY_LEVEL_SCOPES.has(context.scope) &&
                context.access_level === "provider"
              ? `Scoped records refreshed across ${safeArray(
                  context.allowed_home_ids
                ).length} allowed home(s).`
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

  els.clearLiveUpdatesBtn?.addEventListener("click", () => {
    clearAssistantLiveUpdates();
    renderAssistantExtraPanels();
  });
}

export function renderAssistantControllerPanels() {
  renderAssistantExtraPanels();
  renderScopeBadges();
  setAssistantContextText();
}

export function bindAssistantController() {
  if (assistantControllerBound) return;
  assistantControllerBound = true;

  ensureAssistantState();
  bindRefreshButtons();
  renderAssistantExtraPanels();
  renderScopeBadges();
  setAssistantContextText();
}
