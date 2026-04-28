import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";

function getSelectedYoungPersonId() {
  return (
    state?.selectedYoungPerson?.id ||
    state?.youngPersonId ||
    state?.selectedYoungPersonId ||
    null
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTarget() {
  return (
    els?.viewContent ||
    document.getElementById("viewContent") ||
    document.querySelector("[data-view-content]") ||
    document.querySelector(".workspace-content")
  );
}

function renderSignalList(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="cei-muted">No clear signal visible yet.</p>`;
  }

  return `
    <ul class="cei-signal-list">
      ${items
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(item.count)} mention${item.count === 1 ? "" : "s"}</span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderRecommendations(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="cei-muted">No recommendations generated yet.</p>`;
  }

  return `
    <ol class="cei-recommendations">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ol>
  `;
}

function renderExperienceIntelligenceView(target, intelligence) {
  const scores = intelligence?.scores || {};
  const trends = intelligence?.trends || {};
  const signals = intelligence?.signals || {};
  const status = intelligence?.status || "stable";

  target.innerHTML = `
    <section class="cei-shell">
      <header class="cei-header">
        <div>
          <p class="cei-eyebrow">Child Experience Intelligence</p>
          <h2>Is this young person’s lived experience improving?</h2>
          <p>${escapeHtml(intelligence?.summary || "No summary available yet.")}</p>
        </div>

        <div class="cei-status cei-status-${escapeHtml(status)}">
          ${escapeHtml(status)}
        </div>
      </header>

      <div class="cei-grid">
        <article class="cei-card">
          <span>Risk level</span>
          <strong>${escapeHtml(signals.risk_level || "unknown")}</strong>
        </article>

        <article class="cei-card">
          <span>Stability</span>
          <strong>${escapeHtml(trends.stability || "unknown")}</strong>
        </article>

        <article class="cei-card">
          <span>Emotional distress</span>
          <strong>${escapeHtml(trends.emotional_distress || "unknown")}</strong>
        </article>

        <article class="cei-card">
          <span>Risk trajectory</span>
          <strong>${escapeHtml(trends.risk_trajectory || "unknown")}</strong>
        </article>
      </div>

      <div class="cei-grid cei-grid-wide">
        <article class="cei-panel">
          <h3>Visible triggers</h3>
          ${renderSignalList(signals.triggers)}
        </article>

        <article class="cei-panel">
          <h3>Positive anchors</h3>
          ${renderSignalList(signals.positive_anchors)}
        </article>

        <article class="cei-panel">
          <h3>Relationship mentions</h3>
          ${renderSignalList(signals.relationship_mentions)}
        </article>
      </div>

      <article class="cei-panel">
        <h3>Recommended next actions</h3>
        ${renderRecommendations(intelligence?.recommendations)}
      </article>

      <article class="cei-panel">
        <h3>Evidence coverage</h3>

        <div class="cei-grid">
          <div class="cei-mini-stat">
            <strong>${escapeHtml(scores.total_record_count || 0)}</strong>
            <span>Total visible records</span>
          </div>

          <div class="cei-mini-stat">
            <strong>${escapeHtml(scores.recent_record_count || 0)}</strong>
            <span>Recent records</span>
          </div>

          <div class="cei-mini-stat">
            <strong>${escapeHtml(scores.recent_incident_count || 0)}</strong>
            <span>Recent incident/safeguarding records</span>
          </div>
        </div>
      </article>

      <footer class="cei-limitations">
        ${(intelligence?.limitations || [])
          .map((item) => `<p>${escapeHtml(item)}</p>`)
          .join("")}
      </footer>
    </section>
  `;
}

export async function renderExperienceIntelligence() {
  const target = getTarget();
  if (!target) return;

  const youngPersonId = getSelectedYoungPersonId();

  if (!youngPersonId) {
    target.innerHTML = `
      <section class="cei-shell">
        <p class="cei-muted">Select a young person to view Child Experience Intelligence.</p>
      </section>
    `;
    return;
  }

  target.innerHTML = `
    <section class="cei-shell">
      <p class="cei-muted">Loading Child Experience Intelligence...</p>
    </section>
  `;

  try {
    const data = await apiGet(
      `/young-people/${youngPersonId}/experience-intelligence`
    );

    renderExperienceIntelligenceView(target, data?.intelligence || {});
  } catch (error) {
    target.innerHTML = `
      <section class="cei-shell">
        <p class="cei-muted">
          Child Experience Intelligence could not be loaded.
        </p>
      </section>
    `;
  }
}

export const loadExperienceIntelligence = renderExperienceIntelligence;

export default renderExperienceIntelligence;