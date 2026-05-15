(() => {
  async function get(url) {
    const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Request failed ${res.status}`);
    return res.json();
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("annexBtn")?.addEventListener("click", async () => {
      const data = await get("/api/inspection-os/annex-a/demo");
      document.getElementById("annexResult").textContent = `${data.annex_a.sections.length} editable Annex A sections generated.`;
    });
  });
})();
