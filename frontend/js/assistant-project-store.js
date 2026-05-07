/* IndiCare Intelligence project memory engine */

(function () {
  const STORAGE_KEY = 'indicare_intelligence_projects';

  const DEFAULT_ACTIONS = {
    safeguarding: [
      'Create chronology',
      'Review safeguarding threshold',
      'Extract missing information'
    ],
    ofsted: [
      'Prepare evidence summary',
      'Generate inspection questions',
      'Identify evidence gaps'
    ],
    records: [
      'Improve wording',
      'Review chronology',
      'Check child voice'
    ],
    practice: [
      'Generate reflective prompts',
      'Review relational practice',
      'Summarise emotional themes'
    ]
  };

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function loadProjects() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function ensureDefaultProject() {
    const projects = loadProjects();

    if (!projects.length) {
      projects.push({
        id: uid(),
        name: 'Safeguarding Review',
        description: 'General safeguarding and recording workspace.',
        mode: 'safeguarding',
        chats: [],
        uploads: [],
        pinnedOutputs: [],
        savedPrompts: [],
        memorySummary: 'This project focuses on safeguarding oversight and recording quality.',
        recentTopics: [],
        suggestedActions: DEFAULT_ACTIONS.safeguarding,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      saveProjects(projects);
    }

    return projects;
  }

  function renderProjects() {
    const select = document.getElementById('workspaceSelect');
    if (!select) return;

    const projects = ensureDefaultProject();

    select.innerHTML = projects.map((project) => `
      <option value="${project.id}">${project.name}</option>
    `).join('');

    renderProjectHome(projects[0]);
  }

  function renderProjectHome(project) {
    const home = document.getElementById('projectHome');
    const empty = document.getElementById('empty');

    if (home) home.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');

    document.getElementById('projectHomeTitle').textContent = project.name;
    document.getElementById('projectHomeSummary').textContent = project.memorySummary;

    document.getElementById('memoryProjectTitle').textContent = project.name;
    document.getElementById('memoryProjectSummary').textContent = project.memorySummary;

    renderChats(project);
    renderUploads(project);
    renderActions(project);
    renderPinned(project);
  }

  function renderChats(project) {
    const target = document.getElementById('projectRecentChats');
    if (!target) return;

    if (!project.chats.length) {
      target.innerHTML = `
        <div class="ic-project-row">
          <strong>No recent conversations</strong>
          <small>Start chatting to build project memory.</small>
        </div>
      `;
      return;
    }

    target.innerHTML = project.chats.slice(-3).reverse().map((chat) => `
      <div class="ic-project-row">
        <strong>${chat.title}</strong>
        <small>Updated recently</small>
      </div>
    `).join('');
  }

  function renderUploads(project) {
    const target = document.getElementById('projectFiles');
    const count = document.getElementById('memoryDocumentCount');

    if (!target) return;

    count.textContent = project.uploads.length
      ? `${project.uploads.length} project files`
      : 'No project files yet';

    if (!project.uploads.length) {
      target.innerHTML = `
        <div class="ic-project-row">
          <strong>No uploads yet</strong>
          <small>Upload files to build reusable project intelligence.</small>
        </div>
      `;
      return;
    }

    target.innerHTML = project.uploads.map((file) => `
      <div class="ic-project-row">
        <strong>${file.name}</strong>
        <small>${file.tags || 'Residential care document'}</small>
      </div>
    `).join('');
  }

  function renderActions(project) {
    const target = document.getElementById('projectActions');
    if (!target) return;

    target.innerHTML = (project.suggestedActions || []).map((action) => `
      <button type="button" data-project-action="${action}">${action}</button>
    `).join('');
  }

  function renderPinned(project) {
    const target = document.getElementById('projectPinned');
    if (!target) return;

    if (!project.pinnedOutputs.length) {
      target.innerHTML = `
        <div class="ic-project-row">
          <strong>No pinned outputs</strong>
          <small>Pin chronologies, reviews and summaries here.</small>
        </div>
      `;
      return;
    }

    target.innerHTML = project.pinnedOutputs.map((item) => `
      <div class="ic-project-row">
        <strong>${item.title}</strong>
        <small>Pinned project output</small>
      </div>
    `).join('');
  }

  function bindProjectActions() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-project-action]');
      if (!button) return;

      const input = document.getElementById('input');
      if (!input) return;

      input.value = button.getAttribute('data-project-action');
      input.focus();
    });
  }

  function bindWorkspaceSwitcher() {
    const select = document.getElementById('workspaceSelect');
    if (!select) return;

    select.addEventListener('change', () => {
      const projects = loadProjects();
      const project = projects.find((p) => p.id === select.value);
      if (project) renderProjectHome(project);
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    renderProjects();
    bindProjectActions();
    bindWorkspaceSwitcher();
  });
})();
