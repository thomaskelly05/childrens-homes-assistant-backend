const statusStrip = document.getElementById("status-strip");

async function loadProactiveAlerts() {
  try {
    const res = await fetch("/intelligence/proactive", { credentials: "include" });
    const data = await res.json();

    if (!data?.ok) return;

    const alerts = data.alerts || [];

    if (!alerts.length) {
      statusStrip.innerHTML = `<div class="alert low">No active alerts</div>`;
      return;
    }

    statusStrip.innerHTML = alerts.map(a => `
      <div class="alert ${a.level}">
        <strong>${a.title}</strong>
        <p>${a.message}</p>
        <small>${a.recommended_action}</small>
      </div>
    `).join("");

  } catch (err) {
    console.error("Proactive alerts failed", err);
  }
}

// run on load
loadProactiveAlerts();

// refresh every 60s
setInterval(loadProactiveAlerts, 60000);
