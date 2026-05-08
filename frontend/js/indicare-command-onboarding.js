/* IndiCare AI command + onboarding layer
   Adds ChatGPT-style quick starts, slash commands and calm first-run guidance.
   Reuses existing composer, workflows, suite switcher and search overlay.
*/

(function () {
  const SEEN_KEY = 'indicare_ai_onboarding_seen';

  const QUICK_STARTS = [
    {
      title: 'Write an incident record',
      text: 'Create a professional incident record with chronology, child voice, staff actions and management oversight.',
      prompt: 'Help me create a professional incident record. Ask me for the key details if anything is missing.'
    },
    {
      title: 'Improve a recording',
      text: 'Make wording factual, professional, trauma-informed and suitable for children’s residential care.',
      prompt: 'Improve this recording so it is factual, professional, trauma-informed and suitable for children’s residential care.'
    },
    {
      title: 'Extract chronology',
      text: 'Turn notes into Date/Time → Event → Action → Outcome.',
      prompt: 'Extract a clear chronology using Date/Time → Event → Action → Outcome.'
    },
    {
      title: 'Review safeguarding',
      text: 'Check for concerns, missing information, risk analysis and follow-up actions.',
      prompt: 'Review this for safeguarding considerations, missing information, risk analysis and follow-up actions.'
    }
  ];

  const COMMANDS = [
    { key: 'incident', label: 'Incident record', prompt: 'Help me create a professional incident record. Ask me for the key details if anything is missing.' },
    { key: 'chronology', label: 'Extract chronology', prompt: 'Extract a clear chronology using Date/Time → Event → Action → Outcome.' },
    { key: 'safeguarding', label: 'Safeguarding review', prompt: 'Review this for safeguarding considerations, missing information, risk analysis and follow-up actions.' },
    { key: 'handover', label: 'Handover note', prompt: 'Help me create a concise residential care handover with risks, presentation, actions and follow-up.' },
    { key: 'reg45', label: 'Reg 45 evidence', prompt: 'Help me prepare Regulation 45 evidence with impact, safeguarding, leadership oversight and improvement actions.' },
    { key: 'docs', label: 'Open DOCS', action: () => document.querySelector('[data-suite-view="docs"]')?.click() },
    { key: 'notes', label: 'Open Notes', action: () => document.querySelector('[data-suite-view="notes"]')?.click() },
    { key: 'search', label: 'Search workspace', action: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })) }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function injectStyles() {
    if ($('icCommandOnboardingStyles')) return;

    const style = document.createElement('style');
    style.id = 'icCommandOnboardingStyles';
    style.textContent = `
      .ic-quick-starts {
        width: min(760px, 100%);
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin: 22px auto 0;
      }

      .ic-quick-starts button {
        border: 1px solid var(--ic-border);
        background: var(--ic-panel);
        color: var(--ic-text);
        border-radius: 18px;
        padding: 14px;
        text-align: left;
        box-shadow: 0 8px 24px rgba(15,23,42,.045);
        transition: transform var(--ic-transition), border-color var(--ic-transition), background var(--ic-transition);
      }

      .ic-quick-starts button:hover {
        transform: translateY(-2px);
        border-color: rgba(9,105,255,.28);
        background: color-mix(in srgb, var(--ic-blue-soft) 42%, var(--ic-panel));
      }

      .ic-quick-starts strong {
        display: block;
        font-size: .92rem;
        margin-bottom: 5px;
      }

      .ic-quick-starts span {
        display: block;
        color: var(--ic-muted);
        font-size: .78rem;
        line-height: 1.45;
      }

      .ic-command-menu {
        position: fixed;
        z-index: 3600;
        width: min(420px, calc(100vw - 28px));
        display: none;
        padding: 8px;
        border: 1px solid var(--ic-border);
        border-radius: 20px;
        background: var(--ic-panel);
        box-shadow: 0 20px 60px rgba(15,23,42,.18);
      }

      .ic-command-menu.visible { display: grid; gap: 4px; }

      .ic-command-menu button {
        border: 0;
        background: transparent;
        color: var(--ic-text);
        border-radius: 14px;
        padding: 11px 12px;
        text-align: left;
        font-weight: 850;
      }

      .ic-command-menu button:hover,
      .ic-command-menu button.active {
        background: var(--ic-blue-soft);
        color: var(--ic-blue);
      }

      .ic-onboarding-tip {
        position: fixed;
        left: 50%;
        bottom: 92px;
        transform: translateX(-50%);
        z-index: 2800;
        width: min(540px, calc(100vw - 28px));
        display: none;
        padding: 14px 16px;
        border: 1px solid var(--ic-border);
        border-radius: 20px;
        background: var(--ic-panel);
        box-shadow: 0 18px 44px rgba(15,23,42,.14);
      }

      .ic-onboarding-tip.visible { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .ic-onboarding-tip strong { display: block; font-size: .9rem; }
      .ic-onboarding-tip span { display: block; color: var(--ic-muted); font-size: .78rem; margin-top: 2px; }
      .ic-onboarding-tip button { border: 0; background: transparent; color: var(--ic-muted); font-size: 1.2rem; }

      @media (max-width: 760px) {
        .ic-quick-starts { grid-template-columns: 1fr; }
        .ic-onboarding-tip { bottom: 76px; }
      }
    `;
    document.head.appendChild(style);
  }

  function setPrompt(prompt) {
    const input = $('input');
    if (!input) return;
    input.value = prompt;
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function addQuickStarts() {
    const empty = $('empty');
    if (!empty || $('icQuickStarts')) return;

    const grid = document.createElement('div');
    grid.id = 'icQuickStarts';
    grid.className = 'ic-quick-starts';
    grid.innerHTML = QUICK_STARTS.map((item) => `
      <button type="button" data-quick-prompt="${escapeHtml(item.prompt)}">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.text)}</span>
      </button>
    `).join('');

    empty.appendChild(grid);
  }

  function ensureCommandMenu() {
    let menu = $('icCommandMenu');
    if (menu) return menu;

    menu = document.createElement('div');
    menu.id = 'icCommandMenu';
    menu.className = 'ic-command-menu';
    menu.innerHTML = COMMANDS.map((command) => `
      <button type="button" data-command-key="${escapeHtml(command.key)}">/${escapeHtml(command.key)} — ${escapeHtml(command.label)}</button>
    `).join('');
    document.body.appendChild(menu);
    return menu;
  }

  function showCommandMenu() {
    const input = $('input');
    const menu = ensureCommandMenu();
    const rect = input?.getBoundingClientRect();
    if (!rect) return;

    menu.style.left = `${Math.max(14, rect.left)}px`;
    menu.style.top = `${Math.max(14, rect.top - 294)}px`;
    menu.classList.add('visible');
  }

  function hideCommandMenu() {
    $('icCommandMenu')?.classList.remove('visible');
  }

  function runCommand(key) {
    const command = COMMANDS.find((item) => item.key === key);
    if (!command) return;

    hideCommandMenu();

    if (command.action) {
      command.action();
      return;
    }

    setPrompt(command.prompt);
  }

  function onboardingTip() {
    if (localStorage.getItem(SEEN_KEY) === 'true') return;

    const tip = document.createElement('div');
    tip.className = 'ic-onboarding-tip visible';
    tip.innerHTML = `
      <div>
        <strong>Tip: use / for residential care commands</strong>
        <span>Try /incident, /chronology, /safeguarding or press ⌘K to search.</span>
      </div>
      <button type="button" aria-label="Dismiss onboarding tip">×</button>
    `;
    document.body.appendChild(tip);

    tip.querySelector('button')?.addEventListener('click', () => {
      localStorage.setItem(SEEN_KEY, 'true');
      tip.remove();
    });
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const quick = event.target.closest('[data-quick-prompt]');
      if (quick) {
        setPrompt(quick.dataset.quickPrompt || '');
        return;
      }

      const command = event.target.closest('[data-command-key]');
      if (command) {
        runCommand(command.dataset.commandKey);
        return;
      }

      if (!event.target.closest('#icCommandMenu')) {
        hideCommandMenu();
      }
    });

    $('input')?.addEventListener('input', (event) => {
      if (event.target.value.trim() === '/') {
        showCommandMenu();
      } else if (!event.target.value.trim().startsWith('/')) {
        hideCommandMenu();
      }
    });

    $('input')?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideCommandMenu();
      if (event.key === 'Enter' && event.target.value.trim().startsWith('/')) {
        const key = event.target.value.trim().slice(1).split(' ')[0];
        const match = COMMANDS.find((command) => command.key.startsWith(key));
        if (match) {
          event.preventDefault();
          runCommand(match.key);
        }
      }
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    addQuickStarts();
    ensureCommandMenu();
    bind();
    setTimeout(onboardingTip, 900);
  });
})();
