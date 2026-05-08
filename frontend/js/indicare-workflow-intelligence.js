/* IndiCare workflow intelligence layer
   Adds inline DOCS intelligence chips and live Notes extraction previews.
   Reuses standalone workflow orchestration instead of duplicating AI logic.
*/

(function () {
  const DOC_EDITOR = 'indicareDocEditor';
  const TRANSCRIPT = 'indicareTranscript';

  function $(id) {
    return document.getElementById(id);
  }

  async function runWorkflow(workflowId, content, memoryContext = {}) {
    const response = await fetch('/standalone-workflows/run', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        content,
        memory_context: memoryContext
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.detail?.message || 'Workflow unavailable');
    }

    return payload;
  }

  function createChip(text, type = 'neutral') {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `ic-inline-chip ic-inline-chip-${type}`;
    chip.textContent = text;
    return chip;
  }

  function renderDocSignals(editor) {
    let rail = document.getElementById('icDocSignals');
    if (!rail) {
      rail = document.createElement('div');
      rail.id = 'icDocSignals';
      rail.className = 'ic-inline-signals';
      editor.parentElement.insertBefore(rail, editor);
    }

    const content = editor.innerText.toLowerCase();
    rail.innerHTML = '';

    if (!content.includes('said') && !content.includes('voice')) {
      rail.appendChild(createChip('Child voice may need strengthening', 'warning'));
    }

    if (!content.includes('manager') && !content.includes('oversight')) {
      rail.appendChild(createChip('Management oversight not identified', 'warning'));
    }

    if (content.includes('police') || content.includes('missing') || content.includes('risk')) {
      rail.appendChild(createChip('Safeguarding review suggested', 'info'));
    }

    if (!content.includes('outcome')) {
      rail.appendChild(createChip('Chronology outcome may be missing', 'neutral'));
    }
  }

  function ensureNotesPanel(transcript) {
    let panel = document.getElementById('icNotesExtraction');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'icNotesExtraction';
      panel.className = 'ic-live-extraction ic-card';
      transcript.parentElement.appendChild(panel);
    }
    return panel;
  }

  function renderNotesSignals(transcript) {
    const panel = ensureNotesPanel(transcript);
    const content = transcript.value.toLowerCase();

    const items = [];

    if (content.includes('police')) {
      items.push('Police involvement detected');
    }

    if (content.includes('missing')) {
      items.push('Possible missing-from-care chronology identified');
    }

    if (content.includes('upset') || content.includes('distressed') || content.includes('angry')) {
      items.push('Emotional dysregulation theme identified');
    }

    if (content.includes('safeguarding') || content.includes('risk')) {
      items.push('Safeguarding concern detected');
    }

    if (content.includes('follow up') || content.includes('action')) {
      items.push('Follow-up action referenced');
    }

    panel.innerHTML = `
      <div class="ic-extraction-header">
        <strong>Live operational extraction</strong>
        <span>${items.length} insight${items.length === 1 ? '' : 's'}</span>
      </div>
      <div class="ic-extraction-list">
        ${items.length
          ? items.map(item => `<div class="ic-extraction-item">${item}</div>`).join('')
          : '<div class="ic-extraction-empty">Transcription intelligence will appear here as notes are added.</div>'}
      </div>
    `;
  }

  async function attachWorkflowButtons() {
    document.querySelectorAll('[data-workflow-run]').forEach((button) => {
      if (button.dataset.workflowBound === 'true') return;
      button.dataset.workflowBound = 'true';

      button.addEventListener('click', async () => {
        const workflowId = button.dataset.workflowRun;
        const editor = $(DOC_EDITOR);
        const transcript = $(TRANSCRIPT);
        const chatInput = $('input');

        let content = '';

        if (workflowId.startsWith('doc_')) {
          content = editor?.innerText || '';
        } else if (workflowId.startsWith('note_')) {
          content = transcript?.value || '';
        } else {
          content = document.getElementById('input')?.value || '';
        }

        button.disabled = true;
        const original = button.textContent;
        button.textContent = 'Running…';

        try {
          const result = await runWorkflow(workflowId, content, window.currentWorkspaceMemory || {});
          showWorkflowResult(result);
        } catch (error) {
          showToast(error.message || 'Workflow unavailable');
        } finally {
          button.disabled = false;
          button.textContent = original;
        }
      });
    });
  }

  function showWorkflowResult(result) {
    let modal = document.getElementById('icWorkflowPreview');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'icWorkflowPreview';
      modal.className = 'ic-workflow-preview';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="ic-workflow-card ic-card">
        <div class="ic-workflow-head">
          <strong>${result.workflow.title}</strong>
          <button type="button" id="closeWorkflowPreview">×</button>
        </div>
        <pre>${escapeHtml(result.prompt.slice(0, 3000))}</pre>
      </div>
    `;

    modal.classList.add('visible');

    document.getElementById('closeWorkflowPreview')?.addEventListener('click', () => {
      modal.classList.remove('visible');
    });
  }

  function showToast(text) {
    let toast = document.getElementById('icWorkflowToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'icWorkflowToast';
      toast.className = 'ic-tier-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<strong>Workflow</strong><span>${escapeHtml(text)}</span>`;
    toast.classList.add('visible');

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  window.addEventListener('DOMContentLoaded', () => {
    const editor = $(DOC_EDITOR);
    const transcript = $(TRANSCRIPT);

    if (editor) {
      renderDocSignals(editor);
      editor.addEventListener('input', () => renderDocSignals(editor));
    }

    if (transcript) {
      renderNotesSignals(transcript);
      transcript.addEventListener('input', () => renderNotesSignals(transcript));
    }

    attachWorkflowButtons();
  });
})();
