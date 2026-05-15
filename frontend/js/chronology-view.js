(() => {
  document.addEventListener("DOMContentLoaded", async () => {
    const res = await fetch("/api/intelligence-os/chronology/timeline/demo", {
      credentials: "include",
      headers: { Accept: "application/json" },
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
