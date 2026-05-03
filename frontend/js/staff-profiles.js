async function loadHomeStaff(homeId){
  const status = document.getElementById('staffHubStatus');
  const container = document.getElementById('staffProfilesList');
  status.textContent = 'Loading…';
  container.innerHTML = '';

  const res = await fetch(`/staff/home/${homeId}`);
  const json = await res.json();
  const data = json.data;

  status.textContent = '';

  (data.staff_profiles || []).forEach(p => {
    const div = document.createElement('div');
    div.style.border = '1px solid #ddd';
    div.style.padding = '12px';
    div.style.marginBottom = '10px';

    div.innerHTML = `
      <strong>${p.staff.first_name} ${p.staff.last_name}</strong><br>
      Role: ${p.staff.role}<br>
      Priority Score: ${p.priority_score}<br>
      Stage: ${p.employment_stage}<br>
      <a href="/staff-profile.html?id=${p.staff.id}">Open profile</a>
    `;

    container.appendChild(div);
  });
}

document.getElementById('loadHomeStaffBtn').onclick = () => {
  const id = document.getElementById('homeIdInput').value || 1;
  loadHomeStaff(id);
};
