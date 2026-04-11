import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderAvatar } from "../core/utils.js";
import { renderRowList } from "../ui/records.js";

function renderSummaryStat(label, value) {
  return `
    <div class="summary-stat">
      <div class="summary-stat-label">${escapeHtml(label)}</div>
      <div class="summary-stat-value">${escapeHtml(String(value ?? "—"))}</div>
    </div>
  `;
}

function renderSection(title, subtitle, body) {
  return `
    <section class="content-section">
      <div class="content-section-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${body}
    </section>
  `;
}

function renderProfileCard(yp = {}, bundle = {}) {
  const communication = bundle.communication_profile || {};
  const identity = bundle.identity_profile || {};
  const education = bundle.education_profile || {};
  const health = bundle.health_profile || {};
  const legal = bundle.legal_status || {};

  const fullName =
    [yp.first_name, yp.last_name].filter(Boolean).join(" ").trim() ||
    yp.preferred_name ||
    "Young person";

  return `
    <section class="profile-hero-card">
      <div class="profile-hero-top">
        <div class="profile-hero-avatar-wrap">
          ${renderAvatar(yp, "profile-hero-avatar")}
        </div>
        <div class="profile-hero-copy">
          <div class="profile-hero-name">${escapeHtml(fullName)}</div>
          <div class="profile-hero-meta">
            ${escapeHtml(
              [
                yp.preferred_name ? `Preferred: ${yp.preferred_name}` : null,
                yp.date_of_birth ? `DOB: ${new Date(yp.date_of_birth).toLocaleDateString("en-GB")}` : null,
                yp.home_name || null,
              ]
                .filter(Boolean)
                .join(" • ") || "Young person profile"
            )}
          </div>
        </div>
      </div>

      <div class="profile-grid">
        <div class="profile-card editable-card" data-edit-box="identity">
          <div class="profile-card-title">About me</div>
          <div class="profile-card-text">${escapeHtml(identity.interests || "No interests recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(identity.strengths_summary || "No strengths summary recorded yet.")}</div>
        </div>

        <div class="profile-card editable-card" data-edit-box="communication">
          <div class="profile-card-title">How to support me well</div>
          <div class="profile-card-text">${escapeHtml(communication.what_helps || "No support guidance recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(communication.communication_style || "No communication profile recorded yet.")}</div>
        </div>

        <div class="profile-card editable-card" data-edit-box="education">
          <div class="profile-card-title">Learning</div>
          <div class="profile-card-text">${escapeHtml(education.school_name || "No education setting recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(education.support_summary || education.education_status || "No learning support summary recorded yet.")}</div>
        </div>

        <div class="profile-card editable-card" data-edit-box="health">
          <div class="profile-card-title">Health and wellbeing</div>
          <div class="profile-card-text">${escapeHtml(health.mental_health_summary || health.medication_summary || "No health summary recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(health.allergies || "No allergies recorded.")}</div>
        </div>

        <div class="profile-card editable-card" data-edit-box="network">
          <div class="profile-card-title">Important adults</div>
          <div class="profile-card-text">${escapeHtml(legal.social_worker_name || "No named social worker recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(legal.local_authority || legal.legal_status || "No network summary recorded yet.")}</div>
        </div>
      </div>
    </section>
  `;
}

function bindEditableCards() {
  if (!els.viewContent) return;

  els.viewContent.querySelectorAll(".editable-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const mod = await import("../composer/composer.js");
      mod.openComposerFor("support_plan", "create");
    });
  });
}

function bindDynamicOpenRecordButtons() {
  if (!els.viewContent) return;

  els.viewContent.querySelectorAll("[data-open-record]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const item = JSON.parse(btn.dataset.openRecord);
        const mod = await import("../ui/records.js");
        mod.openRecordDetail(item);
      } catch {
        // ignore
      }
    });
  });
}

export async function loadOverview() {
  const [overviewData, timelineData, complianceData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/overview`).catch(() => ({})),
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=8`).catch(() => ({ timeline: [] })),
    apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
  ]);

  const yp = overviewData.young_person || state.youngPerson || {};
  const alerts = overviewData.alerts || [];
  const timeline = timelineData.timeline || [];
  const compliance = complianceData.compliance_items || complianceData.items || [];

  const immediate = [
    ...alerts.map((x) => ({ ...x, title: x.title || x.label || "Important update" })),
    ...compliance.filter((x) =>
      ["overdue", "pending", "submitted", "due_soon"].includes(
        String(x.status || x.compliance_status || "").toLowerCase()
      )
    ),
  ].slice(0, 6);

  const todayRows = timeline.slice(0, 6);

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    ${renderProfileCard(yp, overviewData.bundle || {})}

    <section class="summary-strip">
      ${renderSummaryStat("Current view", "Overview")}
      ${renderSummaryStat("Important updates", alerts.length)}
      ${renderSummaryStat("Recent activity", timeline.length)}
      ${renderSummaryStat("Checks due", compliance.length)}
    </section>

    ${renderSection(
      "Today",
      "What adults need to notice first.",
      renderRowList(todayRows, "No recent activity recorded yet.")
    )}

    ${renderSection(
      "Needs attention",
      "Outstanding follow-up and important updates.",
      renderRowList(immediate, "Nothing urgent is showing right now.")
    )}
  `;

  bindDynamicOpenRecordButtons();
  bindEditableCards();
}
