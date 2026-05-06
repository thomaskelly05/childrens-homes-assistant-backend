const commandCentre = document.querySelector('.os-command-centre');

let cachedYoungPeople = [];

async function renderContextBar() {
  const host = commandCentre || document.querySelector('.topbar') || document.querySelector('.main-panel');
  if (!host) return;

  const existing = document.getElementById('context-bar');
  if (existing) existing.remove();

  const ctx = window.IndiCareContext?.get?.() || {};
  const youngPeople = await loadYoungPeople();
  const selected = selectCurrentChild(youngPeople, ctx);

  if (selected && String(selected.id) !== String(ctx.childId)) {
    setChildContext(selected, { silent: true });
  }

  const bar = document.createElement('div');
  bar.id = 'context-bar';
  bar.className = 'context-bar premium-context-bar';
  bar.innerHTML = `
    <div class="context-block">
      <label>Home</label>
      <select id="home-select">
        ${homesFrom(youngPeople, ctx).map((home) => `<option value="${escapeHtml(home.id)}">${escapeHtml(home.name)}</option>`).join('')}
      </select>
    </div>

    <div class="context-block child-context">
      <label>Child</label>
      <select id="child-select">
        ${youngPeople.map((child) => `<option value="${escapeHtml(child.id)}">${escapeHtml(displayName(child))}</option>`).join('')}
      </select>
      <div class="child-summary">
        <strong>${escapeHtml(displayName(selected) || ctx.childName || 'Select child')}</strong>
        <span>${escapeHtml(summaryFor(selected) || ctx.childSummary || 'Select a child to load their journey, records and evidence.')}</span>
      </div>
    </div>
  `;

  host.appendChild(bar);

  const homeSelect = document.getElementById('home-select');
  const childSelect = document.getElementById('child-select');
  if (homeSelect) homeSelect.value = String(selected?.home_id || ctx.homeId || '');
  if (childSelect) childSelect.value = String(selected?.id || ctx.childId || '');

  homeSelect?.addEventListener('change', (event) => {
    const homeId = event.target.value;
    const homeName = event.target.selectedOptions?.[0]?.textContent || 'Selected home';
    const firstChildInHome = youngPeople.find((child) => String(child.home_id || '') === String(homeId)) || youngPeople[0];
    window.IndiCareContext.set({ homeId, homeName });
    if (firstChildInHome) setChildContext(firstChildInHome);
  });

  childSelect?.addEventListener('change', (event) => {
    const child = youngPeople.find((item) => String(item.id) === String(event.target.value));
    if (child) setChildContext(child);
  });
}

async function loadYoungPeople() {
  if (cachedYoungPeople.length) return cachedYoungPeople;
  const endpoints = ['/young-people?limit=100', '/api/young-people?limit=100'];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) continue;
      const data = await response.json();
      const rows = data.young_people || data.items || data.results || [];
      if (Array.isArray(rows) && rows.length) {
        cachedYoungPeople = rows.map(normaliseChild);
        return cachedYoungPeople;
      }
    } catch {}
  }
  cachedYoungPeople = [normaliseChild({ id: 1001, preferred_name: 'Demo', first_name: 'Demo', last_name: 'Young Person', home_id: 1, placement_status: 'active', summary_risk_level: 'medium' })];
  return cachedYoungPeople;
}

function normaliseChild(row) {
  const id = row.id || row.young_person_id || row.person_id;
  return {
    ...row,
    id,
    home_id: row.home_id || row.homeId || row.placement_home_id || '',
    home_name: row.home_name || row.homeName || row.home || (row.home_id ? `Home ${row.home_id}` : 'Selected home'),
    preferred_name: row.preferred_name || row.preferredName || row.display_name || row.name || row.first_name || 'Young person',
    first_name: row.first_name || row.firstName || '',
    last_name: row.last_name || row.lastName || '',
    placement_status: row.placement_status || row.status || '',
    summary_risk_level: row.summary_risk_level || row.risk_level || row.risk || '',
  };
}

function selectCurrentChild(children, ctx) {
  return children.find((child) => String(child.id) === String(ctx.childId)) || children[0] || null;
}

function setChildContext(child, options = {}) {
  const next = {
    childId: String(child.id),
    childName: displayName(child),
    childSummary: summaryFor(child),
    childRiskLevel: child.summary_risk_level || '',
    childPlacementStatus: child.placement_status || '',
    homeId: String(child.home_id || ''),
    homeName: child.home_name || (child.home_id ? `Home ${child.home_id}` : 'Selected home'),
  };
  window.IndiCareContext?.set?.(next);
  if (!options.silent) refreshCurrentView();
}

function refreshCurrentView() {
  const active = document.querySelector('.nav-item.active');
  if (active) {
    setTimeout(() => active.click(), 50);
  } else {
    window.loadTodayForChild?.();
  }
}

function homesFrom(children, ctx) {
  const map = new Map();
  children.forEach((child) => {
    const id = String(child.home_id || ctx.homeId || '');
    if (!id) return;
    map.set(id, { id, name: child.home_name || `Home ${id}` });
  });
  if (!map.size) map.set(String(ctx.homeId || ''), { id: String(ctx.homeId || ''), name: ctx.homeName || 'Selected home' });
  return [...map.values()];
}

function displayName(child) {
  if (!child) return '';
  const preferred = child.preferred_name || child.name || child.display_name;
  const full = `${child.first_name || ''} ${child.last_name || ''}`.trim();
  return preferred || full || `Young person ${child.id}`;
}

function summaryFor(child) {
  if (!child) return '';
  const parts = [];
  if (child.placement_status) parts.push(`Placement: ${child.placement_status}`);
  if (child.summary_risk_level) parts.push(`Risk: ${child.summary_risk_level}`);
  if (child.local_authority) parts.push(`LA: ${child.local_authority}`);
  return parts.join(' • ') || 'Records, plans and evidence are linked to this child.';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

window.addEventListener('indicare:context-change', () => renderContextBar());
window.addEventListener('DOMContentLoaded', renderContextBar);
setTimeout(renderContextBar, 0);
