/* IndiCare Intelligence templates.
   Lightweight ChatGPT-style workflow templates for standalone residential care AI workspaces. */

(function () {
  const TEMPLATES = [
    {
      id: 'missing-review',
      category: 'Missing From Care',
      title: 'Missing From Care Review',
      description: 'Structure chronology, safeguarding concerns, actions taken and management oversight.',
      prompt: `Please help me review a missing-from-care incident.\n\nI will provide:\n- chronology\n- actions taken\n- police involvement\n- return details\n- concerns\n- staff responses\n\nPlease:\n- structure the chronology\n- identify missing information\n- highlight safeguarding concerns\n- draft manager review points\n- suggest follow-up actions.`
    },
    {
      id: 'recording-qa',
      category: 'Recording QA',
      title: 'Recording Quality Review',
      description: 'Review factuality, chronology, child voice and professionalism.',
      prompt: `Please review this residential care recording for:\n- factuality\n- chronology\n- child-centred language\n- safeguarding completeness\n- emotional tone\n- management oversight\n\nPlease identify concerns and provide improved wording.`
    },
    {
      id: 'ofsted-evidence',
      category: 'Ofsted',
      title: 'Ofsted Evidence Builder',
      description: 'Create inspection-ready evidence summaries and identify gaps.',
      prompt: `Please review this information through an Ofsted inspection lens.\n\nPlease identify:\n- evidence seen\n- impact for children\n- safeguarding culture\n- leadership oversight\n- evidence gaps\n- recommended actions\n- potential inspector questions.`
    },
    {
      id: 'safeguarding-threshold',
      category: 'Safeguarding',
      title: 'Safeguarding Threshold Review',
      description: 'Explore risks, missing information and review actions.',
      prompt: `Please analyse this safeguarding concern.\n\nPlease:\n- separate facts from concerns\n- identify missing information\n- identify immediate risks\n- suggest management/DSL review points\n- suggest follow-up actions\n\nDo not make final safeguarding decisions.`
    },
    {
      id: 'supervision-reflection',
      category: 'Leadership',
      title: 'Supervision Reflection',
      description: 'Generate reflective supervision prompts and practice analysis.',
      prompt: `Please help create a reflective supervision discussion.\n\nPlease explore:\n- reflective practice\n- emotional impact\n- trauma-informed thinking\n- relational practice\n- safeguarding awareness\n- strengths and development areas\n- agreed actions.`
    }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function renderTemplates() {
    const sidebar = $('templateList');
    const grid = $('templateGrid');
    if (!sidebar || !grid) return;

    const cards = TEMPLATES.map((template) => `
      <button class="ic-template-card" type="button" data-template-id="${template.id}">
        <small>${template.category}</small>
        <strong>${template.title}</strong>
        <p>${template.description}</p>
      </button>
    `).join('');

    sidebar.innerHTML = cards;
    grid.innerHTML = cards;
  }

  function openTemplate(templateId) {
    const template = TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    const input = $('input');
    const workspace = $('templateWorkspace');
    const messages = $('messages');
    const empty = $('empty');

    if (workspace) workspace.classList.add('hidden');
    if (messages) messages.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');

    if (input) {
      input.value = template.prompt;
      input.focus();
      input.dispatchEvent(new Event('input'));
    }

    const pill = $('workspacePill');
    const title = $('workspaceTitle');

    if (pill) pill.textContent = template.category;
    if (title) title.textContent = template.title;
  }

  function switchView(view) {
    document.querySelectorAll('[data-app-view]').forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-app-view') === view);
    });

    document.querySelectorAll('[data-sidebar-panel]').forEach((panel) => {
      panel.classList.toggle('active', panel.getAttribute('data-sidebar-panel') === view);
    });

    const templateWorkspace = $('templateWorkspace');
    const messages = $('messages');
    const empty = $('empty');

    if (view === 'templates') {
      templateWorkspace?.classList.remove('hidden');
      messages?.classList.add('hidden');
      empty?.classList.add('hidden');
    } else {
      templateWorkspace?.classList.add('hidden');
      if (!messages?.innerHTML.trim()) {
        empty?.classList.remove('hidden');
      }
    }
  }

  function bind() {
    document.querySelectorAll('[data-app-view]').forEach((button) => {
      button.addEventListener('click', () => switchView(button.getAttribute('data-app-view')));
    });

    document.addEventListener('click', (event) => {
      const template = event.target.closest('[data-template-id]');
      if (!template) return;
      openTemplate(template.getAttribute('data-template-id'));
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    renderTemplates();
    bind();
  });
})();
