/* IndiCare Intelligence professional operational document engine */

(function () {
  function createExportActions(messageElement) {
    const actions = document.createElement('div');
    actions.className = 'ic-export-row';

    actions.innerHTML = `
      <button type="button" data-export-type="docx">Export DOCX</button>
      <button type="button" data-export-type="pdf">Export PDF</button>
      <button type="button" data-export-type="print">Print</button>
      <button type="button" data-pin-output="true">Pin output</button>
    `;

    return actions;
  }

  function detectOperationalType(text) {
    const value = text.toLowerCase();

    if (value.includes('chronology')) return 'chronology';
    if (value.includes('ofsted')) return 'ofsted';
    if (value.includes('safeguarding')) return 'safeguarding';
    if (value.includes('recording')) return 'recording';

    return 'general';
  }

  function decorateOperationalOutputs() {
    const messages = document.querySelectorAll('.wrap.assistant');

    messages.forEach((message) => {
      if (message.dataset.exportReady === 'true') return;

      const text = message.innerText || '';
      const type = detectOperationalType(text);

      message.dataset.exportReady = 'true';
      message.dataset.operationalType = type;

      const block = document.createElement('div');
      block.className = 'ic-ai-block';

      const heading = document.createElement('div');
      heading.className = 'ic-trust-strip';

      heading.innerHTML = `
        <span class="ic-trust-pill">Operational Output</span>
        <span class="ic-trust-pill">${type}</span>
      `;

      block.appendChild(heading);
      block.appendChild(createExportActions(message));

      message.appendChild(block);
    });
  }

  function bindExportButtons() {
    document.addEventListener('click', (event) => {
      const exportButton = event.target.closest('[data-export-type]');

      if (exportButton) {
        const type = exportButton.getAttribute('data-export-type');

        if (type === 'print') {
          window.print();
          return;
        }

        alert(`${type.toUpperCase()} export engine will generate a professional operational document.`);
      }

      const pinButton = event.target.closest('[data-pin-output]');

      if (pinButton) {
        alert('Output pinned to project memory.');
      }
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    bindExportButtons();

    const observer = new MutationObserver(() => {
      decorateOperationalOutputs();
    });

    const messages = document.getElementById('messages');

    if (messages) {
      observer.observe(messages, {
        childList: true,
        subtree: true
      });
    }

    decorateOperationalOutputs();
  });
})();
