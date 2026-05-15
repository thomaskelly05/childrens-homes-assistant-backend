(() => {
  async function load() {
    const res = await fetch("/api/safeguarding-os/flowchart/steps", { credentials: "include", headers: { Accept: "application/json" } });
    const data = await res.json();
    const target = document.getElementById("flowSteps");
    target.textContent = "";
    data.steps.forEach((step) => {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `<strong>${step.title}</strong><span>Manager review required: ${step.requires_manager_review}</span>`;
      target.appendChild(item);
    });
  }
  document.addEventListener("DOMContentLoaded", load);
})();
