import { CARE_HUB_NAVIGATION } from "./care-hub-navigation.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '\"': "&quot;",
  })[char]);
}

function currentSectionId() {
  const hash = window.location.hash.replace("#", "");
  if (hash) return hash;
  if (window.location.pathname.includes("young-people")) return "children";
  return "today";
}

function renderChildItems(children = []) {
  if (!children.length) return "";
  return `
    <div class="care-hub-nav-children">
      ${children.map((child) => `
        <a href="${escapeHtml(child.href || `#${child.id}`)}">
          ${escapeHtml(child.label)}
        </a>
      `).join("")}
    </div>
  `;
}

export function renderCareHubSidebar(target = document.getElementById("careHubSidebar")) {
  if (!target) return false;
  const active = currentSectionId();

  target.innerHTML = `
    <aside class="care-hub-sidebar" aria-label="Care Hub OS navigation">
      <div class="care-hub-sidebar-brand">
        <img src="/assets/indicare-logo.svg" alt="IndiCare" class="care-hub-logo" />
      </div>

      <nav class="care-hub-nav">
        ${CARE_HUB_NAVIGATION.map((item) => {
          const selected = item.id === active;
          return `
            <section class="care-hub-nav-section ${selected ? "active" : ""}">
              <a class="care-hub-nav-link" href="${escapeHtml(item.href || `#${item.id}`)}">
                <span>${escapeHtml(item.label)}</span>
              </a>
              ${selected ? renderChildItems(item.children || []) : ""}
            </section>
          `;
        }).join("")}
      </nav>
    </aside>
  `;

  return true;
}

export function bindCareHubSidebar() {
  renderCareHubSidebar();
  window.addEventListener("hashchange", () => renderCareHubSidebar());
}

window.IndiCareCareHubSidebar = Object.freeze({ renderCareHubSidebar, bindCareHubSidebar });
