const staffProfileParams = new URLSearchParams(window.location.search);
const staffProfileId = staffProfileParams.get('id');

function staffProfileText(value, fallback = 'Not recorded') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function staffProfileJson(value) {
  return JSON.stringify(value || {}, null, 2);
}

function staffProfileList(containerId, rows, render) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(rows) || rows.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nothing currently flagged.';
    container.appendChild(li);
    return;
  }
  rows.forEach((row) => {
    const li = document.createElement('li');
    li.textContent = render(row);
    container.appendChild(li);
  });
}

async function loadStaffProfile() {
  const endpoint = staffProfileId ? '/staff/' + encodeURIComponent(staffProfileId) : '/staff/me';
  const response = await fetch(endpoint, { credentials: 'include' });
  const json = await response.json();
  if (!response.ok || !json.ok) throw new Error(json.detail || json.error || 'Could not load staff profile');
  const data = json.data;
  const staff = data.staff || {};
  const intelligence = (((data.academy || {}).intelligence) || {});

  document.getElementById('staffProfileName').textContent = [staff.first_name, staff.last_name].filter(Boolean).join(' ') || 'Staff member';
  document.getElementById('staffProfileRole').textContent = staffProfileText(staff.role);
  document.getElementById('staffProfileStatus').textContent = staffProfileText((data.employment || {}).status);
  document.getElementById('staffProfileStage').textContent = staffProfileText((data.lifecycle || {}).current_stage);
  document.getElementById('staffProfileScore').textContent = staffProfileText(intelligence.priority_score, '0');

  document.getElementById('staffEmployment').textContent = staffProfileJson(data.employment);
  document.getElementById('staffLifecycle').textContent = staffProfileJson(data.lifecycle);
  document.getElementById('staffSupervision').textContent = staffProfileJson(data.supervision);
  document.getElementById('staffAcademy').textContent = staffProfileJson({
    modules: ((data.academy || {}).modules || []).length,
    workbooks: ((data.academy || {}).workbooks || []).length,
    certificates: ((data.academy || {}).certificates || []).length,
    evidence: ((data.academy || {}).evidence || []).length
  });

  staffProfileList('staffLearningNeeds', intelligence.learning_needs || [], (item) => {
    return staffProfileText(item.title) + ' - ' + staffProfileText(item.priority, 'priority not set');
  });
  staffProfileList('staffRecommendedModules', intelligence.recommended_modules || [], (item) => {
    return staffProfileText(item.title) + ' - ' + staffProfileText(item.reason, 'recommended');
  });
  staffProfileList('staffManagerActions', data.manager_actions || [], (item) => {
    return staffProfileText(item.action) + ' - ' + staffProfileText(item.priority, 'priority not set');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadStaffProfile().catch((error) => {
    const errorBox = document.getElementById('staffProfileError');
    if (errorBox) errorBox.textContent = error.message;
  });
});
