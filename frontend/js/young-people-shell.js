// 🔥 CONFIG — CHANGE THESE TO MATCH YOUR BACKEND
const ENDPOINTS = {
  youngPeople: "/young-people",
  notes: "/young-people/daily-notes",
  incidents: "/incidents",
  aiNote: "/ai-notes/generate",
  aiIncident: "/ai-notes/incident"
};

/* LOAD DASHBOARD */
async function loadDashboard() {
  loadYoungPeople();
  loadActivity();
}

/* LOAD YOUNG PEOPLE */
async function loadYoungPeople() {
  try {
    const res = await fetch(ENDPOINTS.youngPeople);
    const data = await res.json();

    const container = document.getElementById("youngPeopleList");
    container.innerHTML = "";

    data.forEach(yp => {
      const div = document.createElement("div");
      div.className = "yp-card";
      div.innerHTML = `
        <strong>${yp.name}</strong><br>
        Age: ${yp.age || "-"}
      `;
      div.onclick = () => viewYoungPerson(yp.id);
      container.appendChild(div);
    });

  } catch (e) {
    console.error("YP LOAD ERROR", e);
  }
}

/* LOAD ACTIVITY */
async function loadActivity() {
  const container = document.getElementById("activityFeed");
  container.innerHTML = `<div class="activity-item">No recent activity</div>`;
}

/* VIEW PROFILE */
async function viewYoungPerson(id) {
  alert("Open profile next phase");
}

/* MODALS */
function openNoteModal() {
  document.getElementById("noteModal").classList.remove("hidden");
}
function openIncidentModal() {
  document.getElementById("incidentModal").classList.remove("hidden");
}

/* AI NOTE */
async function runAINote() {
  const input = document.getElementById("noteInput").value;

  const res = await fetch(ENDPOINTS.aiNote, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text: input })
  });

  const data = await res.json();
  document.getElementById("noteOutput").value = data.output || data.text;
}

/* SAVE NOTE */
async function saveNote() {
  const text = document.getElementById("noteOutput").value;

  await fetch(ENDPOINTS.notes, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });

  location.reload();
}

/* AI INCIDENT */
async function runAIIncident() {
  const input = document.getElementById("incidentInput").value;

  const res = await fetch(ENDPOINTS.aiIncident, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text: input })
  });

  const data = await res.json();
  document.getElementById("incidentOutput").value = data.output || data.text;
}

/* SAVE INCIDENT */
async function saveIncident() {
  const text = document.getElementById("incidentOutput").value;

  await fetch(ENDPOINTS.incidents, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ text })
  });

  location.reload();
}

/* INIT */
loadDashboard();
