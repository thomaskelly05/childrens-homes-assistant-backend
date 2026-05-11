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

  function loadStylesheet() {
    if (document.querySelector('link[data-runtime="indicare-suite-css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/frontend/ai-suite/indicare-suite.css';
    link.dataset.runtime = 'indicare-suite-css';
    document.head.appendChild(link);
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
    panel.innerHTML = '<h3>IndiCare Conversation AI</h3><p style="color:#64748b">Press the orb to use IndiCare in Everyday or Specialist mode.</p><div class="ic-mode"><button data-ic-mode="everyday">Everyday</button><button data-ic-mode="specialist">Specialist</button></div><button id="icListen" class="pill">Start listening</button> <button id="icStop" class="pill">Stop</button> <button id="icAsk" class="pill">Ask with current message</button><div id="icOrbOutput" class="ic-output"></div>';
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
    $('icAsk').addEventListener('click', () => {
      const text = (($('input') || $('intelInput') || $('connectInput') || {}).value || '').trim();
      $('icOrbOutput').textContent = text ? `Ready: ${text}` : 'Type a message first, then press Ask.';
    });
  }

  function loadRuntime(name, src) {
    if (document.querySelector(`script[data-runtime="${name}"]`)) return;
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.runtime = name;
    script.src = src;
    document.body.appendChild(script);
  }

  function init() {
    loadStylesheet();
    addProjects();
    addOrb();
    loadRuntime('orb-ai', '/frontend/ai-suite/indicare-orb-ai.js');
    loadRuntime('connect-runtime', '/frontend/ai-suite/indicare-connect-runtime.js');
    loadRuntime('docs-notes-runtime', '/frontend/ai-suite/indicare-docs-notes-runtime.js');
    loadRuntime('intelligence-runtime', '/frontend/ai-suite/indicare-intelligence-runtime.js');
    loadRuntime('conversations-runtime', '/frontend/ai-suite/indicare-conversations-runtime.js');
    loadRuntime('memory-runtime', '/frontend/ai-suite/indicare-memory-runtime.js');
    loadRuntime('actions-runtime', '/frontend/ai-suite/indicare-actions-runtime.js');
    window.IndiCareRecoveryUI = { state, renderProjects };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();