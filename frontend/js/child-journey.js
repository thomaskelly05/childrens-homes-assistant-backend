(() => {
  async function post(url) {
    const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ records: [{ title: "Progress", summary: "Child described trusted adult support, education progress and feeling safer." }] }) });
    return res.json();
  }
  document.addEventListener("DOMContentLoaded", async () => {
    const data = await post("/api/intelligence-os/child-journey/synthesis");
    document.getElementById("journeySections").textContent = `${data.summary.sections.length} editable child journey sections.`;
  });
})();
