(() => {
  document.addEventListener("DOMContentLoaded", async () => {
    const res = await fetch("/api/intelligence-os/chronology/timeline", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ records: [
        { date: "2026-05-01", title: "Missing episode", summary: "Young person returned and police were informed." },
        { date: "2026-05-04", title: "Achievement", summary: "Young person was proud of education progress." }
      ] }),
    });
    const data = await res.json();
    const target = document.getElementById("timeline");
    target.textContent = "";
    data.timeline.events.forEach((event) => {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `<strong>${event.date || "Date not recorded"} - ${event.category}</strong><span>${event.title}</span>`;
      target.appendChild(item);
    });
  });
})();
