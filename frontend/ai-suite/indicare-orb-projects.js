(() => {
  const $ = (id) => document.getElementById(id);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));

  const state = {
    mode: localStorage.getItem('ic_orb_mode') || 'everyday',
    project: localStorage.getItem('ic_active_project') || 'general',
    projects: JSON.parse(localStorage.getItem('ic_projects') || '[{"id":"general","name":"General"},{"id":"ofsted","name":"OFSTED readiness"},{"id":"safeguarding","name":"Safeguarding"}]')
  };

  function save() {
    localStorage.setItem('ic_orb_mode', state.mode);
    localStorage.setItem('ic_active_project', state.project);
    localStorage.setItem('ic_projects', JSON.stringify(state.projects));
  }

  function addStyles() {
    if (document.getElementById('icRecoveryStyles')) return;
    const style = document.createElement('style');
    style.id = 'icRecoveryStyles';
    style.textContent = '.ic-orb{position:fixed;right:24px;bottom:24px;width:86px;height:86px;border:0;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff 0,#93c5fd 18%,#2563eb 43%,#020617 100%);box-shadow:0 0 50px rgba(37,99,235,.55);color:#fff;font-weight:900;z-index:1000;cursor:pointer}.ic-orb-panel{position:fixed;right:24px;bottom:124px;width:min(430px,92vw);background:#fff;border:1px solid #e5e7eb;border-radius:24px;box-shadow:0 30px 90px rgba(15,23,42,.25);padding:18px;z-index:999;display:none}.ic-orb-panel.open{display:block}.ic-mode{display:flex;gap:8px;margin:10px 0}.ic-mode button{flex:1;border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:8px;cursor:pointer}.ic-mode button.active{background:#111827;color:#fff}.ic-output{white-space:pre-wrap;background:#f8fafc;border-left:4px solid #2563eb;padding:12px;border-radius:8px;margin-top:12px;max-height:260px;overflow:auto}.ic-projects{display:grid;gap:4px}.ic-project-chip{border:0;background:transparent;border-radius:10px;padding:8px;text-align:left;cursor:pointer}.ic-project-chip.active,.ic-project-chip:hover{background:#eef2ff}';
    document.head.appendChild(style);
  }

  function renderProjects() {
    const box = $('icProjectList');
    if (!box) return;
    box.innerHTML = state.projects.map((project) => `<button class="ic-project-chip ${project.id === state.project ? 'active' : ''}" data-ic-project="${escapeHtml(project.id)}">${escapeHtml(project.name)}</button>`).join('');
    qsa('[data-ic-project]', box).forEach((button) => {
      button.addEventListener('click', () => {
        state.project = button.dataset.icProject;
        save();
        renderProjects();
      });
    });
  }

  function addProjects() {
    if ($('icProjectList')) return;
    const labels = qsa('.label');
    const conversationsLabel = labels.find((label) => /conversations/i.test(label.textContent || ''));
    if (!conversationsLabel || !conversationsLabel.parentNode) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<div class="label">Projects</div><div id="icProjectList" class="ic-projects"></div><button id="icNewProject" class="new-chat new">+ New project</button>';
    conversationsLabel.parentNode.insertBefore(wrapper, conversationsLabel);
    renderProjects();
    $('icNewProject').addEventListener('click', () => {
      const name = prompt('Project name');
      if (!name) return;
      const id = `p-${Date.now()}`;
      state.projects.push({ id, name });
      state.project = id;
      save();
      renderProjects();
    });
  }

  function addOrb() {
    if ($('indicareOrb')) return;
    const panel = document.createElement('div');
    panel.id = 'indicareOrbPanel';
    panel.className = 'ic-orb-panel';
    panel.innerHTML = '<h3>IndiCare Conversation AI</h3><p style="color:#64748b">Press the orb to use IndiCare in Everyday or Specialist mode.</p><div class="ic-mode"><button data-ic-mode="everyday">Everyday</button><button data-ic-mode="specialist">Specialist</button></div><button id="icAsk" class="pill">Ask with current message</button><div id="icOrbOutput" class="ic-output"></div>';
    document.body.appendChild(panel);
    const orb = document.createElement('button');
    orb.id = 'indicareOrb';
    orb.className = 'ic-orb';
    orb.textContent = 'IC';
    document.body.appendChild(orb);
    orb.addEventListener('click', () => panel.classList.toggle('open'));
    qsa('[data-ic-mode]', panel).forEach((button) => {
      button.classList.toggle('active', button.dataset.icMode === state.mode);
      button.addEventListener('click', () => {
        state.mode = button.dataset.icMode;
        save();
        qsa('[data-ic-mode]', panel).forEach((b) => b.classList.toggle('active', b === button));
      });
    });
    $('icAsk').addEventListener('click', async () => {
      const text = (($('input') || $('intelInput') || {}).value || '').trim();
      $('icOrbOutput').textContent = text ? `Ready: ${text}` : 'Type a message first, then press Ask.';
    });
  }

  function init() {
    addStyles();
    addProjects();
    addOrb();
    window.IndiCareRecoveryUI = { state, renderProjects };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
