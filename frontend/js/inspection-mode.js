(() => {
  async function json(url, options = {}) {
    const res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...options,
    });
    if (!res.ok) throw new Error(`Request failed ${res.status}`);
    return res.json();
  }

  async function getLiveRecords() {
    try {
      const data = await json("/api/chronology");
      return data.items || data.timeline || data.chronology || data.records || [];
    } catch (_) {
      return [];
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("annexBtn")?.addEventListener("click", async () => {
      const target = document.getElementById("annexResult");
      try {
        const records = await getLiveRecords();
        const data = await json("/api/inspection-os/annex-a/draft", {
          method: "POST",
          body: JSON.stringify({ records, context: {} }),
        });
        target.textContent = `${data.annex_a.sections.length} editable Annex A sections generated from live chronology records.`;
      } catch (error) {
        target.textContent = `Annex A could not load: ${error.message || error}`;
      }
    });
  });
})();