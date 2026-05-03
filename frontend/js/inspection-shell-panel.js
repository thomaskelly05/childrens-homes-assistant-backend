(() => {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function text(value, fallback = 'Not recorded') {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
  }
  function youngPersonId() {
    const selector = byId('ypSelector');
    const params = new URLSearchParams(window.location.search);
    return selector?.value || params.get('young_person_id') || params.get('id') || document.body.dataset.youngPersonId || '';
  }
  function renderList(container, rows, map) {
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(rows) || rows.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No current items found.';
      container.appendChild(li);
      return;
    }
    rows.slice(0, 6).forEach((row) => {
      const li = document.createElement('li');
      li.textContent = map(row);
      container.appendChild(li);
    });
  }
  async function getJson(url) {
    const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Server returned ${res.status}. Check backend logs for this inspection endpoint.`);
    }
    const json = await res.json();
    if (!res.ok || json.ok === false) throw new Error(json.detail || json.error || 'Request failed');
    return json.data || json;
  }
  function setFallback(message) {
    const fallback = message || 'Inspection intelligence unavailable.';
    const ids = ['ypInspectionShiftSafety', 'ypInspectionEnforcement', 'ypInspectionResponsibility'];
    ids.forEach((id) => { const el = byId(id); if (el) el.textContent = 'Unable to load'; });
    renderList(byId('ypInspectionChildVoice'), [], () => '');
    renderList(byId('ypInspectionSafeguardingStory'), [], () => '');
    renderList(byId('ypInspectionConsistency'), [{ message: fallback }], (item) => text(item.message));
  }
  async function loadInspectionPanel() {
    const panel = byId('ypInspectionPanel');
    if (!panel) return;
    const ypId = youngPersonId();
    const status = byId('ypInspectionStatus');
    if (status) status.textContent = 'Loading inspection intelligence...';

    try {
      const staff = await getJson('/inspection-os/me');
      let child = null;
      if (ypId) child = await getJson('/inspection-os/child/' + encodeURIComponent(ypId));

      const staffSafety = staff.shift_safety || {};
      byId('ypInspectionShiftSafety').textContent = text(staffSafety.status, 'No staff safety status found');
      byId('ypInspectionEnforcement').textContent = text((staff.enforcement || {}).status, 'No enforcement gates');

      const responsibility = (child && child.responsibility) || {};
      const worker = [responsibility.worker_first_name, responsibility.worker_last_name].filter(Boolean).join(' ');
      byId('ypInspectionResponsibility').textContent = worker || text(responsibility.key_worker_id, 'No key worker found');

      const voice = child?.child_voice || {};
      renderList(byId('ypInspectionChildVoice'), voice.items || [], (item) => text(item.voice));

      const story = child?.safeguarding_story || {};
      renderList(byId('ypInspectionSafeguardingStory'), story.stories || [], (item) => {
        return text(item.concern, 'Concern') + ' -> ' + text(item.action, 'Action not recorded') + ' -> ' + text(item.outcome, 'Outcome not recorded');
      });

      const consistency = child?.consistency || {};
      renderList(byId('ypInspectionConsistency'), consistency.warnings || [], (item) => text(item.message));

      if (status) status.textContent = 'Inspection intelligence loaded.';
    } catch (error) {
      setFallback(error.message);
      if (status) status.textContent = 'Inspection intelligence could not load: ' + error.message;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadInspectionPanel();
    byId('ypSelector')?.addEventListener('change', () => setTimeout(loadInspectionPanel, 250));
  });
})();
