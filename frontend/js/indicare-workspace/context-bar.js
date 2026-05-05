const topbar = document.querySelector(".topbar");

function renderContextBar() {
  if (!topbar) return;

  const existing = document.getElementById("context-bar");
  if (existing) existing.remove();

  const ctx = window.IndiCareContext?.get?.() || {};

  const bar = document.createElement("div");
  bar.id = "context-bar";
  bar.className = "context-bar";

  bar.innerHTML = `
    <div class="context-block">
      <label>Home</label>
      <select id="home-select">
        <option value="1">Main home</option>
        <option value="2">Second home</option>
      </select>
    </div>

    <div class="context-block child-context">
      <label>Child</label>
      <select id="child-select">
        <option value="1">Child A</option>
        <option value="2">Child B</option>
      </select>
      <div class="child-summary">
        <strong>${ctx.childName}</strong>
        <span>${ctx.childSummary}</span>
      </div>
    </div>
  `;

  topbar.appendChild(bar);

  document.getElementById("home-select").value = ctx.homeId;
  document.getElementById("child-select").value = ctx.childId;

  document.getElementById("home-select").addEventListener("change", (e) => {
    window.IndiCareContext.set({ homeId: e.target.value });
  });

  document.getElementById("child-select").addEventListener("change", (e) => {
    const id = e.target.value;
    window.IndiCareContext.set({
      childId: id,
      childName: `Child ${id}`,
      childSummary: "Update profile, risks and lived experience for this child.",
    });
  });
}

window.addEventListener("indicare:context-change", renderContextBar);
window.addEventListener("DOMContentLoaded", renderContextBar);
