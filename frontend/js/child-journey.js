(() => {
  async function get(url) {
    const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
    return res.json();
  }
  document.addEventListener("DOMContentLoaded", async () => {
    const data = await get("/api/intelligence-os/child-journey/demo");
    document.getElementById("journeySections").textContent = `${data.summary.sections.length} editable child journey sections.`;
  });
})();
