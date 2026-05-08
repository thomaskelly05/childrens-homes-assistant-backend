/* IndiCare AI response intelligence
   Adds chronology references, safeguarding markers and children’s-home response polish
   on top of the existing professional renderer.
*/

(function () {
  const PATTERNS = [
    { type: 'safeguarding', label: 'Safeguarding', match: /safeguarding|risk|harm|exploitation|threshold|police/i },
    { type: 'chronology', label: 'Chronology', match: /chronology|timeline|sequence|date\/time|date and time/i },
    { type: 'child-voice', label: 'Child voice', match: /child.?s voice|young person.?s voice|wishes|feelings|said/i },
    { type: 'oversight', label: 'Oversight', match: /manager|management|oversight|registered manager|leadership/i },
    { type: 'evidence', label: 'Evidence', match: /evidence|ofsted|quality standards|sccif|regulation|inspection/i }
  ];

  function enhanceMessage(message) {
    if (!message || message.dataset.indicareResponseIntelligence === 'true') return;

    const text = message.innerText || '';
    const matches = PATTERNS.filter((item) => item.match.test(text));
    if (!matches.length) return;

    const strip = document.createElement('div');
    strip.className = 'ic-response-context-strip';
    strip.innerHTML = matches.slice(0, 5).map((item) => `
      <button type="button" class="ic-response-context-pill" data-response-context="${item.type}">${item.label}</button>
    `).join('');

    message.prepend(strip);
    addChronologyRefs(message, text);
    message.dataset.indicareResponseIntelligence = 'true';
  }

  function addChronologyRefs(message, text) {
    if (!/chronology|timeline|incident|missing|police|risk/i.test(text)) return;

    const refs = document.createElement('div');
    refs.className = 'ic-chronology-ref-row';
    refs.innerHTML = `
      <button type="button" data-response-action="extract-chronology">Extract chronology</button>
      <button type="button" data-response-action="create-doc">Create DOC</button>
      <button type="button" data-response-action="review-safeguarding">Review safeguarding</button>
    `;

    message.appendChild(refs);
  }

  function setPrompt(prompt) {
    const input = document.getElementById('input');
    if (!input) return;
    input.value = prompt;
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function bindActions() {
    document.addEventListener('click', (event) => {
      const action = event.target.closest('[data-response-action]');
      const context = event.target.closest('[data-response-context]');

      if (action) {
        const key = action.dataset.responseAction;
        if (key === 'extract-chronology') setPrompt('Extract a factual chronology from the previous response using Date/Time → Event → Action → Outcome.');
        if (key === 'create-doc') setPrompt('Turn the previous response into a professional IndiCare DOCS record.');
        if (key === 'review-safeguarding') setPrompt('Review the previous response for safeguarding considerations, missing information and follow-up actions.');
      }

      if (context) {
        const key = context.dataset.responseContext;
        setPrompt(`Expand the ${key.replace('-', ' ')} considerations from the previous response for children’s residential care.`);
      }
    });
  }

  function scan() {
    document.querySelectorAll('.wrap.assistant .msg').forEach(enhanceMessage);
  }

  window.addEventListener('DOMContentLoaded', () => {
    bindActions();
    scan();
    const messages = document.getElementById('messages');
    if (messages) {
      new MutationObserver(scan).observe(messages, { childList: true, subtree: true, characterData: true });
    }
  });
})();
