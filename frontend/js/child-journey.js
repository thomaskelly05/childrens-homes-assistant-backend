(() => {
  async function post(url, body = {}) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Request failed ${res.status}`);
    return res.json();
  }

  async function getLiveRecords() {
    try {
      const res = await fetch("/api/chronology", { credentials: "include", headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || data.timeline || data.chronology || data.records || [];
    } catch (_) {
      return [];
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const target = document.getElementById("journeySections");
    if (!target) return;

    try {
      const records = await getLiveRecords();
      const data = await post("/api/intelligence-os/child-journey/synthesis", { records, context: {} });
      target.textContent = `${data.summary.sections.length} editable child journey sections.`;
    } catch (error) {
      target.textContent = `Child journey could not load: ${error.message || error}`;
    }
  });
})();