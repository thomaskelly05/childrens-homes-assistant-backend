(() => {
  document.addEventListener("DOMContentLoaded", async () => {
    const res = await fetch("/provider/intelligence/os-snapshot-demo", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const target = document.getElementById("providerSnapshot");
    if (!res.ok) { target.textContent = "Provider snapshot requires signed-in provider access."; return; }
    const data = await res.json();
    target.textContent = Object.keys(data.sections || {}).join(", ");
  });
})();
