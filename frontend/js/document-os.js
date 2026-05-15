(() => {
  const $ = (id) => document.getElementById(id);
  const safe = (value, fallback = "no evidence found") => value === undefined || value === null || value === "" ? fallback : String(value);
  const list = (el, items, render) => { if (!el) return; el.textContent = ""; items.forEach((item) => el.appendChild(render(item))); };
  const card = (title, body) => {
    const node = document.createElement("div");
    node.className = "item";
    node.innerHTML = `<strong>${safe(title)}</strong><span>${safe(body)}</span>`;
    return node;
  };
  async function json(url, options = {}) {
    const res = await fetch(url, { headers: { "Content-Type": "application/json", Accept: "application/json" }, credentials: "include", ...options });
    if (!res.ok) throw new Error(`Request failed ${res.status}`);
    return res.json();
  }
  async function loadTemplates() {
    try {
      const data = await json("/api/document-os/templates");
      $("templateCount").textContent = data.templates.length;
      list($("templateList"), data.templates.slice(0, 12), (item) => card(item.title, `${item.category} - manager sign-off required`));
    } catch (error) {
      $("templateList").appendChild(card("Unable to load templates", error.message));
    }
  }
  async function extract() {
    const templateId = $("templateId").value || "placement_plan";
    const sourceText = $("sourceText").value || "";
    const params = new URLSearchParams({ template_id: templateId, source_text: sourceText });
    const data = await json(`/api/document-os/extraction/demo?${params.toString()}`);
    $("extractResult").textContent = `Confidence ${data.confidence_score}. Draft only: ${data.draft_only}. ${data.review_notes.join(" ")}`;
  }
  document.addEventListener("DOMContentLoaded", () => {
    loadTemplates();
    $("extractBtn")?.addEventListener("click", extract);
  });
})();
