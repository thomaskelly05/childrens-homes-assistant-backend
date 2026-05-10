/* IndiCare AI proactive suggestions
   Lightweight ChatGPT-style suggestion dock using existing memory, workflow and search surfaces.
*/

(function () {
  const DEFAULT_SUGGESTIONS = [
    { label: 'Create an incident record', prompt: 'Help me create a professional incident record.' },
    { label: 'Improve recording', prompt: 'Improve this recording so it is factual, professional and suitable for children’s residential care.' },
    { label: 'Extract chronology', prompt: 'Extract a chronology using Date/Time → Event → Action → Outcome.' },
    { label: 'Review safeguarding', prompt: 'Review this for safeguarding considerations, missing information and follow-up actions.' }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function memory() {
    try {
      return window.IndiCareSuiteMemory?.loadMemory?.() || {};
    } catch {
      return {};
    }
  }

  function buildSuggestions() {
    const current = memory();
    const themes = current.themes || [];
    const alerts = current.alerts || [];
    const timeline = current.timeline || [];
    const suggestions = [];

    if (alerts.length) {
      suggestions.push({
        label: 'Review alerts',
        prompt: `Review these operational alerts and suggest next steps: ${alerts.slice(0, 4).join(' | ')}`
      });
    }

    if (themes.includes('Missing from care') || hasTerm(timeline, 'missing')) {
      suggestions.push({
        label: 'Missing episode review',
        prompt: 'Create a missing-from-care review with chronology, risks, return conversation prompts and management oversight.'
      });
    }

    if (themes.includes('Safeguarding') || hasTerm(timeline, 'safeguarding')) {
      suggestions.push({
        label: 'Safeguarding summary',
        prompt: 'Summarise the safeguarding concerns, known facts, missing information and immediate follow-up actions.'
      });
    }

    if (themes.includes('Child voice')) {
      suggestions.push({
        label: 'Strengthen child voice',
        prompt: 'Review the current work and suggest where child voice, wishes and feelings should be captured more clearly.'
      });
    }

    if (timeline.length) {
      suggestions.push({
        label: 'Create chronology',
        prompt: 'Create a clean chronology from the current project memory and recent timeline items.'
      });
    }

    return [...suggestions, ...DEFAULT_SUGGESTIONS].slice(0, 6);
  }

  function hasTerm(items, term) {
    return items.some((item) => String(item.text || item.summary || '').toLowerCase().includes(term));
  }

  function ensureDock() {
    let dock = $('icProactiveSuggestions');
    if (dock) return dock;

    dock = document.createElement('section');
    dock.id = 'icProactiveSuggestions';
    dock.className = 'ic-proactive-dock';
    dock.setAttribute('aria-label', 'Suggested actions');

    const target = document.querySelector('.ic-evidence') || document.body;
    target.appendChild(dock);
    return dock;
  }

  function render() {
    const dock = ensureDock();
    const suggestions = buildSuggestions();

    dock.innerHTML = `
      <div class="ic-proactive-head">
        <strong>Suggested next steps</strong>
        <span>IndiCare AI</span>
      </div>
      <div class="ic-proactive-list">
        ${suggestions.map((item) => `
          <button type="button" data-proactive-prompt="${escapeHtml(item.prompt)}">
            ${escapeHtml(item.label)}
          </button>
        `).join('')}
      </div>
    `;
  }

  function sendPrompt(prompt) {
    const input = $('input');
    if (!input) return;
    input.value = prompt;
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-proactive-prompt]');
      if (!button) return;
      sendPrompt(button.dataset.proactivePrompt || '');
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
    bind();
    render();
    window.setInterval(render, 15000);
  });
})();
