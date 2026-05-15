(() => {
  document.addEventListener("DOMContentLoaded", async () => {
    const res = await fetch("/provider/intelligence/os-snapshot", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ records: [{ title: "Provider QA", summary: "Reg 44 evidence gap and safeguarding oversight review." }] }),
    });
    const target = document.getElementById("providerSnapshot");
    if (!res.ok) { target.textContent = "Provider snapshot requires signed-in provider access."; return; }
    const data = await res.json();
    target.textContent = Object.keys(data.sections || {}).join(", ");
  });
})();
