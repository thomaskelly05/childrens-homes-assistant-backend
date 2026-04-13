import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDate(value) {
  if (!value) return "No date";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusTone(status = "") {
  const s = String(status).toLowerCase();

  if (["overdue", "expired"].includes(s)) return "danger";
  if (["due_soon", "review_due"].includes(s)) return "warning";
  if (["valid", "active"].includes(s)) return "success";

  return "muted";
}

/* =========================
   DEMO DATA (SAFE FALLBACK)
   ========================= */
function getDemoDocuments() {
  return [
    {
      id: 1,
      title: "Placement Plan",
      document_type: "Placement",
      summary: "Current placement plan outlining care approach.",
      status: "active",
      review_date: "2026-05-01",
    },
    {
      id: 2,
      title: "Risk Assessment",
      document_type: "Risk",
      summary: "Assessment of behavioural and environmental risks.",
      status: "review_due",
      review_date: "2026-04-20",
    },
    {
      id: 3,
      title: "Behaviour Support Plan",
      document_type: "Support Plan",
      summary: "Strategies to support emotional regulation.",
      status: "valid",
      review_date: "2026-06-10",
    },
    {
      id: 4,
      title: "Health Care Plan",
      document_type: "Health",
      summary: "Details of medical needs and medication routines.",
      status: "expired",
      review_date: "2026-03-15",
    },
  ];
}

function renderDocuments(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No documents found.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .map((doc) => {
          const tone = getStatusTone(doc.status);

          return `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">
                  ${safeText(doc.title || doc.document_type || "Document")}
                </div>
                <div class="record-row-summary">
                  ${safeText(doc.summary || "No description")}
                </div>
                <div class="record-row-meta">
                  ${safeText(doc.document_type || "")}
                  • Review ${formatDate(doc.review_date)}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${tone}">
                  ${safeText(doc.status || "Recorded")}
                </span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

export async function loadDocuments() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = `<p>No home context</p>`;
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <h2>Documents</h2>
      <p>Loading documents…</p>
    </section>
  `;

  try {
    const data = await apiGet(`/homes/${homeId}/documents`).catch(() => ({
      items: [],
    }));

    let items = data.items || data.documents || [];

    /* =========================
       FALLBACK TO DEMO DATA
       ========================= */
    if (!items.length) {
      items = getDemoDocuments();
    }

    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="overview-panel-head">
          <h2>Documents</h2>
          <p>All uploaded and review-sensitive records</p>
        </div>

        ${renderDocuments(items)}
      </section>
    `;
  } catch (err) {
    const items = getDemoDocuments();

    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="overview-panel-head">
          <h2>Documents</h2>
          <p>All uploaded and review-sensitive records</p>
        </div>

        ${renderDocuments(items)}
      </section>
    `;
  }
}
