const createBtn = document.getElementById("new-record-button");
const modal = document.getElementById("record-modal");
const fields = document.getElementById("record-form-fields");
const closeBtn = document.getElementById("close-modal");

if (createBtn) {
  createBtn.addEventListener("click", openChooser);
}
if (closeBtn) closeBtn.onclick = () => modal.classList.add("hidden");

function openChooser() {
  modal.classList.remove("hidden");
  fields.innerHTML = `
    <div class="form-row">
      <label>Select record type</label>
      <select id="record-type">
        <option value="daily">Daily log</option>
        <option value="incident">Incident</option>
        <option value="safeguarding">Safeguarding</option>
      </select>
    </div>
    <button class="primary-action" id="start-form">Continue</button>
  `;
  document.getElementById("start-form").onclick = loadForm;
}

function loadForm() {
  const type = document.getElementById("record-type").value;
  if (type === "daily") {
    fields.innerHTML = `
      <div class="form-row"><label>Mood</label><input /></div>
      <div class="form-row"><label>What happened</label><textarea></textarea></div>
      <div class="form-row"><label>Staff response</label><textarea></textarea></div>
    `;
  }
  if (type === "incident") {
    fields.innerHTML = `
      <div class="form-row"><label>Type</label><input /></div>
      <div class="form-row"><label>Description</label><textarea></textarea></div>
    `;
  }
}

// clickable record cards
window.addEventListener("click", e => {
  const card = e.target.closest(".clickable-record");
  if (!card) return;
  showDetail(card.innerHTML);
});

function showDetail(html) {
  const overlay = document.createElement("div");
  overlay.className = "record-detail-overlay";
  overlay.innerHTML = `
    <div class="record-detail-card">
      <h3>Record detail</h3>
      ${html}
      <button onclick="this.closest('.record-detail-overlay').remove()">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);
}
