/* IndiCare AI mobile shift mode
   Keeps the standalone assistant fast and calm on phones/tablets during shift work.
*/

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function isMobile() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function ensureShiftBar() {
    let bar = $('icShiftBar');
    if (bar) return bar;

    bar = document.createElement('nav');
    bar.id = 'icShiftBar';
    bar.className = 'ic-shift-bar';
    bar.setAttribute('aria-label', 'Quick shift actions');
    bar.innerHTML = `
      <button type="button" data-shift-action="chat">Chat</button>
      <button type="button" data-shift-action="voice">Voice</button>
      <button type="button" data-shift-action="incident">Incident</button>
      <button type="button" data-shift-action="chronology">Timeline</button>
      <button type="button" data-shift-action="search">Search</button>
    `;
    document.body.appendChild(bar);
    return bar;
  }

  function applyMode() {
    document.body.classList.toggle('ic-mobile-shift-mode', isMobile());
    ensureShiftBar();
  }

  function setInput(prompt) {
    const input = $('input');
    if (!input) return;
    input.value = prompt;
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function bindShiftActions() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-shift-action]');
      if (!button) return;

      const action = button.dataset.shiftAction;

      if (action === 'chat') {
        setInput('');
        return;
      }

      if (action === 'voice') {
        document.querySelector('[data-suite-view="notes"]')?.click();
        setTimeout(() => $('startTranscribe')?.click(), 100);
        return;
      }

      if (action === 'incident') {
        setInput('Help me write a professional incident record. Ask me for the key details if anything is missing.');
        return;
      }

      if (action === 'chronology') {
        setInput('Create a clear chronology using Date/Time → Event → Action → Outcome.');
        return;
      }

      if (action === 'search') {
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
        window.dispatchEvent(event);
      }
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    applyMode();
    bindShiftActions();
  });

  window.addEventListener('resize', applyMode);
})();
