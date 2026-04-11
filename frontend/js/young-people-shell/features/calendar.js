import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate, formatShortDate } from "../core/utils.js";

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

function normaliseCalendarItems(data = {}) {
  const appointments = Array.isArray(data.appointments) ? data.appointments : [];
  const events = Array.isArray(data.events) ? data.events : [];
  const items = Array.isArray(data.items) ? data.items : [];

  return [...appointments, ...events, ...items]
    .map((item) => ({
      ...item,
      _when:
        item.appointment_date ||
        item.event_datetime ||
        item.start_datetime ||
        item.start_date ||
        item.date ||
        item.created_at ||
        null,
    }))
    .sort((a, b) => {
      const aTime = a._when ? new Date(a._when).getTime() : 0;
      const bTime = b._when ? new Date(b._when).getTime() : 0;
      return aTime - bTime;
    });
}

function groupCalendarItems(items = []) {
  const groups = new Map();

  items.forEach((item) => {
    const when = item._when;
    const dateKey = when ? formatShortDate(when) : "No date";

    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey).push(item);
  });

  return Array.from(groups.entries()).map(([dateLabel, groupedItems]) => ({
    dateLabel,
    items: groupedItems,
  }));
}

function renderCalendarCard(item = {}) {
  const title =
    item.title ||
    item.appointment_type ||
    item.event_type ||
    item.category ||
    "Calendar item";

  const subtitle =
    item.summary ||
    item.purpose ||
    item.description ||
    item.location ||
    item.professional_name ||
    "Open to view details.";

  const meta = [
    item.location || null,
    item.professional_name || null,
    item.professional_role || null,
  ]
    .filter(Boolean)
    .join(" • ");

  return `
    <button class="calendar-card" type="button" data-open-record='${escapeHtml(JSON.stringify(item))}'>
      <div class="calendar-card-time">
        ${escapeHtml(formatDate(item._when))}
      </div>

      <div class="calendar-card-main">
        <div class="calendar-card-title">${escapeHtml(String(title).replaceAll("_", " "))}</div>
        <div class="calendar-card-subtitle">${escapeHtml(subtitle)}</div>
        ${meta ? `<div class="calendar-card-meta">${escapeHtml(meta)}</div>` : ""}
      </div>

      <div class="calendar-card-arrow" aria-hidden="true">›</div>
    </button>
  `;
}

function renderCalendarList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No calendar items found.</p>
      </div>
    `;
  }

  const grouped = groupCalendarItems(items);

  return `
    <div class="calendar-groups">
      ${grouped
        .map(
          (group) => `
            <section class="calendar-group">
              <div class="calendar-group-title">${escapeHtml(group.dateLabel)}</div>
              <div class="calendar-group-list">
                ${group.items.map(renderCalendarCard).join("")}
              </div>
            </section>
          `
        )
        .join("")}
    </div>
  `;
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

export async function loadCalendar() {
  const data = await apiGet(`/young-people/${state.youngPersonId}/calendar`).catch(() => ({}));
  const items = normaliseCalendarItems(data);

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    ${renderSection(
      "Calendar",
      "Appointments, important dates and key moments coming up.",
      renderCalendarList(items)
    )}
  `;

  bindDynamicOpenRecordButtons();
}
