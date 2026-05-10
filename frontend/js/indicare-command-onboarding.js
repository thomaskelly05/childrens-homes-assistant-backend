/* IndiCare AI command layer
   Slash commands only. Quick-start cards are now owned by assistant-cockpit.html
   so this file must not inject duplicate homepage cards.
*/

(function () {
  const SEEN_KEY = 'indicare_ai_command_tip_seen';

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
      .ic-command-menu {
        position: fixed;
        z-index: 3600;
        width: min(420px, calc(100vw - 28px));
        display: none;
        padding: 8px;
        border: 1px solid var(--ic-clean-border, #e6edf6);
        border-radius: 20px;
        background: #fff;
        box-shadow: 0 20px 60px rgba(15,23,42,.16);
      }

      .ic-command-menu.visible { display: grid; gap: 4px; }

      .ic-command-menu button {
        border: 0;
        background: transparent;
        color: var(--ic-clean-text, #0f1f3a);
        border-radius: 14px;
        padding: 11px 12px;
        text-align: left;
        font-weight: 850;
      }

      .ic-command-menu button:hover,
      .ic-command-menu button.active {
        background: var(--ic-clean-blue-soft, #edf5ff);
        color: var(--ic-clean-blue, #0b6fff);
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
        border: 1px solid var(--ic-clean-border, #e6edf6);
        border-radius: 20px;
        background: #fff;
        box-shadow: 0 18px 44px rgba(15,23,42,.12);
      }

      .ic-onboarding-tip.visible { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .ic-onboarding-tip strong { display: block; font-size: .9rem; }
      .ic-onboarding-tip span { display: block; color: var(--ic-clean-muted, #65748b); font-size: .78rem; margin-top: 2px; }
      .ic-onboarding-tip button { border: 0; background: transparent; color: var(--ic-clean-muted, #65748b); font-size: 1.2rem; }
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
    ensureCommandMenu();
    bind();
    setTimeout(onboardingTip, 900);
  });
})();
