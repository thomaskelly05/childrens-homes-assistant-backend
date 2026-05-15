(() => {
  async function post(url, body) {
    const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Request failed ${res.status}`);
    return res.json();
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("annexBtn")?.addEventListener("click", async () => {
      const data = await post("/api/inspection-os/annex-a/draft", { records: [{ title: "Reg 44 action", summary: "Manager should review safeguarding evidence gap and training follow-up." }] });
      document.getElementById("annexResult").textContent = `${data.annex_a.sections.length} editable Annex A sections generated.`;
    });
  });
})();
