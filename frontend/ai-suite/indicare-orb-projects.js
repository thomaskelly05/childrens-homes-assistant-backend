(() => {
  const $ = (id) => document.getElementById(id);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));

  const state = {
    mode: localStorage.getItem('ic_orb_mode') || 'everyday',
    project: localStorage.getItem('ic_active_project') || 'general',
    projects: JSON.parse(localStorage.getItem('ic_projects') || '[{"id":"general","name":"General"},{"id":"ofsted","name":"Inspection evidence preparation"},{"id":"safeguarding","name":"Safeguarding"}]')
  };

  function createAssetResolver() {
    const version = window.__INDICARE_AI_SUITE_ASSET_VERSION__ || document.querySelector('meta[name="indicare-ai-suite-asset-version"]')?.content || '';
    const currentScriptBase = document.currentScript?.src ? new URL('.', document.currentScript.src).href : '';
    const path = window.location.pathname || '/';
    const aiSuiteIndex = path.indexOf('/ai-suite');
    const derivedBase = aiSuiteIndex >= 0
      ? `${path.slice(0, aiSuiteIndex)}/ai-suite/`
      : `${path.replace(/\/?(?:assistant(?:\.html)?|ai-suite)?\/?$/, '/') || '/'}ai-suite/`;
    const basePath = window.__INDICARE_AI_SUITE_ASSET_BASE__ || currentScriptBase || derivedBase;
    return {
      basePath,
      version,
      resolve(file) {
        const clean = String(file || '').replace(/^\/+/, '');
        const url = new URL(clean, this.basePath).href;
        return this.version ? `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(this.version)}` : url;
      },
      candidates(file) {
        return [this.resolve(file)];
      },
    };
  }

  const assetResolver = window.IndiCareAISuiteAssets || (window.IndiCareAISuiteAssets = createAssetResolver());
  const assetPaths = (file) => assetResolver.candidates?.(file) || [assetResolver.resolve(file)];
  const assetPaths = (file) => [`/ai-suite/${file}`, `/frontend/ai-suite/${file}`];
  const runtimeRegistry = window.__indicareAiSuiteRuntimes || (window.__indicareAiSuiteRuntimes = new Map());

  function save() {
    localStorage.setItem('ic_orb_mode', state.mode);
    localStorage.setItem('ic_active_project', state.project);
    localStorage.setItem('ic_projects', JSON.stringify(state.projects));
  }

  function loadStylesheet() {
    if (document.querySelector('link[data-runtime="indicare-suite-css"]')) return;
    const paths = assetPaths('indicare-suite.css');
    const link = document.createElement('link');
    let pathIndex = 0;
    link.rel = 'stylesheet';
    link.href = paths[pathIndex];
    link.dataset.runtime = 'indicare-suite-css';
    link.onload = () => window.dispatchEvent(new CustomEvent('indicare:asset-loaded', { detail: { type: 'css', file: 'indicare-suite.css', href: link.href } }));
    link.onerror = () => {
      pathIndex += 1;
      if (paths[pathIndex]) {
        console.warn(`[IndiCare AI Suite] CSS failed at ${link.href}; trying ${paths[pathIndex]}`);
        link.href = paths[pathIndex];
        return;
      }
      console.warn(`[IndiCare AI Suite] CSS failed to load. Attempted: ${paths.join(', ')}`);
      window.dispatchEvent(new CustomEvent('indicare:asset-failed', { detail: { type: 'css', file: 'indicare-suite.css', attempted: paths } }));
    };
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
    panel.innerHTML = '<h3>IndiCare Conversation AI</h3><p class="ic-panel-copy">Press the orb to use IndiCare in Everyday or Specialist mode.</p><div class="ic-mode"><button data-ic-mode="everyday">Everyday</button><button data-ic-mode="specialist">Specialist</button></div><button id="icListen" class="pill">Start listening</button> <button id="icStop" class="pill">Stop</button> <button id="icAsk" class="pill">Ask with current message</button><div id="icOrbOutput" class="ic-output"></div>';
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

  function loadRuntime(name, file) {
    if (runtimeRegistry.get(name) === 'loaded' || document.querySelector(`script[data-runtime="${name}"]`)) return;
    const paths = assetPaths(file);
    const script = document.createElement('script');
    let pathIndex = 0;
    script.defer = true;
    script.dataset.runtime = name;
    script.src = paths[pathIndex];
    runtimeRegistry.set(name, 'loading');
    script.onload = () => {
      runtimeRegistry.set(name, 'loaded');
      window.dispatchEvent(new CustomEvent('indicare:runtime-loaded', { detail: { name, file } }));
    };
    script.onerror = () => {
      pathIndex += 1;
      if (paths[pathIndex]) {
        script.src = paths[pathIndex];
        return;
      }
      runtimeRegistry.set(name, 'failed');
      console.warn(`[IndiCare AI Suite] Runtime failed to load: ${name} (${file}). Attempted: ${paths.join(', ')}`);
      console.warn(`[IndiCare AI Suite] Runtime failed to load: ${name} (${file})`);
      window.dispatchEvent(new CustomEvent('indicare:runtime-failed', { detail: { name, file } }));
    };
    document.body.appendChild(script);
  }

  function init() {
    loadStylesheet();
    addProjects();
    addOrb();
    loadRuntime('orb-ai', 'indicare-orb-ai.js');
    loadRuntime('connect-runtime', 'indicare-connect-runtime.js');
    loadRuntime('docs-notes-runtime', 'indicare-docs-notes-runtime.js');
    loadRuntime('intelligence-runtime', 'indicare-intelligence-runtime.js');
    loadRuntime('conversations-runtime', 'indicare-conversations-runtime.js');
    loadRuntime('memory-runtime', 'indicare-memory-runtime.js');
    loadRuntime('actions-runtime', 'indicare-actions-runtime.js');
    window.IndiCareRecoveryUI = { state, renderProjects };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();