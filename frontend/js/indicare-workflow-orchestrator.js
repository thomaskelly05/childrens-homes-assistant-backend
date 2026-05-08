/* IndiCare AI workflow orchestrator
   Creates background operational workflow tracking and visible orchestration UI.
*/

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  const WORKFLOWS = {
    chronology: 'Building chronology review',
    safeguarding: 'Reviewing safeguarding actions',
    chat_to_doc: 'Generating operational DOC',
    workspace_to_inspection_summary: 'Preparing inspection summary'
  };

  function injectStyles() {
    if ($('icWorkflowStyles')) return;

    const style = document.createElement('style');
    style.id = 'icWorkflowStyles';
    style.textContent = `
      .ic-ops-centre {
        margin: 14px 0;
        border:1px solid var(--ic-border);
        background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,250,252,.96));
        border-radius:24px;
        overflow:hidden;
        box-shadow:0 16px 40px rgba(15,23,42,.06);
      }

      .ic-ops-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:16px 18px;
        border-bottom:1px solid var(--ic-border);
      }

      .ic-ops-head strong {
        font-size:.92rem;
      }

      .ic-ops-head span {
        font-size:.74rem;
        color:var(--ic-muted);
      }

      .ic-ops-list {
        display:flex;
        flex-direction:column;
        gap:10px;
        padding:14px;
      }

      .ic-ops-card {
        border:1px solid var(--ic-border);
        background:#fff;
        border-radius:18px;
        padding:14px;
      }

      .ic-ops-meta {
        display:flex;
        justify-content:space-between;
        margin-bottom:8px;
        font-size:.72rem;
        color:var(--ic-muted);
      }

      .ic-ops-progress {
        margin-top:12px;
        height:8px;
        background:#e2e8f0;
        border-radius:999px;
        overflow:hidden;
      }

      .ic-ops-progress span {
        display:block;
        height:100%;
        width:0%;
        border-radius:999px;
        background:linear-gradient(90deg,#2563eb,#60a5fa);
        transition:width .4s ease;
      }

      .ic-shell-upgrade .ic-main {
        background:
          radial-gradient(circle at top right, rgba(37,99,235,.08), transparent 22%),
          linear-gradient(180deg,#f8fafc,#eef4ff);
      }
    `;

    document.head.appendChild(style);
  }

  function ensureOpsCentre() {
    const panel = $('assistantPanel');
    if (!panel || $('icOpsCentre')) return;

    const centre = document.createElement('section');
    centre.id = 'icOpsCentre';
    centre.className = 'ic-ops-centre';
    centre.innerHTML = `
      <div class="ic-ops-head">
        <div>
          <strong>Operational workflows</strong><br />
          <span>Background orchestration and AI task coordination</span>
        </div>
        <span id="icOpsCount">0 active</span>
      </div>

      <div class="ic-ops-list" id="icOpsList">
        <div class="ic-ops-card">
          <div class="ic-ops-meta">
            <span>System</span>
            <span>Ready</span>
          </div>
          <strong>Operational orchestration online</strong>
          <div class="ic-ops-progress"><span style="width:100%"></span></div>
        </div>
      </div>
    `;

    panel.prepend(centre);
  }

  function addWorkflow(name) {
    const list = $('icOpsList');
    if (!list) return;

    const card = document.createElement('article');
    card.className = 'ic-ops-card';

    const id = `wf-${Date.now()}`;
    card.id = id;

    card.innerHTML = `
      <div class="ic-ops-meta">
        <span>Workflow</span>
        <span>Running</span>
      </div>

      <strong>${WORKFLOWS[name] || 'Processing operational workflow'}</strong>
      <p>IndiCare AI is coordinating operational reasoning, chronology awareness and workflow outputs.</p>

      <div class="ic-ops-progress"><span></span></div>
    `;

    list.prepend(card);
    updateCount();

    animateWorkflow(card);
  }

  function animateWorkflow(card) {
    const bar = card.querySelector('.ic-ops-progress span');
    if (!bar) return;

    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 18) + 10;
      bar.style.width = `${Math.min(progress, 100)}%`;

      if (progress >= 100) {
        clearInterval(interval);

        const meta = card.querySelector('.ic-ops-meta span:last-child');
        if (meta) meta.textContent = 'Completed';

        setTimeout(() => {
          card.style.opacity = '.72';
        }, 1200);
      }
    }, 420);
  }

  function updateCount() {
    const count = document.querySelectorAll('.ic-ops-card').length - 1;
    const node = $('icOpsCount');
    if (node) node.textContent = `${Math.max(count, 0)} active`;
  }

  function bindWorkflowTracking() {
    document.addEventListener('click', (event) => {
      const workflow = event.target.closest('[data-workflow-run]');
      if (!workflow) return;

      addWorkflow(workflow.dataset.workflowRun || 'workflow');
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    ensureOpsCentre();
    bindWorkflowTracking();
    document.body.classList.add('ic-shell-upgrade');
  });
})();
