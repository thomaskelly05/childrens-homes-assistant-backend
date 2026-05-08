/* IndiCare AI governance layer
   Adds calm governance guidance, audit-ready activity capture and safeguarding review nudges.
*/

(function () {
  const TERMS = [
    'safeguarding',
    'missing',
    'police',
    'harm',
    'restraint',
    'self-harm',
    'abuse',
    'exploitation'
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function textContainsSensitiveThemes(text) {
    const lower = String(text || '').toLowerCase();
    return TERMS.filter((term) => lower.includes(term));
  }

  function ensureGovernanceDock() {
    let dock = $('icGovernanceDock');
    if (dock) return dock;

    dock = document.createElement('section');
    dock.id = 'icGovernanceDock';
    dock.className = 'ic-governance-dock';
    dock.innerHTML = `
      <div class="ic-governance-head">
        <strong>Professional review</strong>
        <span>IndiCare AI</span>
      </div>
      <div class="ic-governance-body">
        AI outputs should be checked alongside safeguarding procedures, professional judgement and management oversight.
      </div>
    `;

    document.body.appendChild(dock);
    return dock;
  }

  function showGovernance(message) {
    const dock = ensureGovernanceDock();
    dock.classList.add('visible');

    const body = dock.querySelector('.ic-governance-body');
    if (body) body.textContent = message;

    clearTimeout(showGovernance.timer);
    showGovernance.timer = setTimeout(() => {
      dock.classList.remove('visible');
    }, 6200);
  }

  function monitorMessages() {
    const wraps = Array.from(document.querySelectorAll('#messages .wrap.assistant .msg'));
    const latest = wraps[wraps.length - 1];
    if (!latest || latest.dataset.governanceReviewed === 'true') return;

    latest.dataset.governanceReviewed = 'true';

    const hits = textContainsSensitiveThemes(latest.innerText || '');
    if (!hits.length) return;

    const text = hits.includes('safeguarding') || hits.includes('abuse')
      ? 'Safeguarding-sensitive content detected. Ensure manager/DSL review and follow local safeguarding procedures.'
      : 'Sensitive operational content detected. Review chronology, notifications, management oversight and factual accuracy.';

    showGovernance(text);
    logActivity('sensitive_ai_response', {
      themes: hits,
      response_length: (latest.innerText || '').length
    });
  }

  function logActivity(action, metadata) {
    try {
      const existing = JSON.parse(localStorage.getItem('indicare_ai_activity') || '[]');
      existing.unshift({
        action,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      });

      localStorage.setItem('indicare_ai_activity', JSON.stringify(existing.slice(0, 120)));
    } catch {
      // fail silently
    }
  }

  function bindOperationalTracking() {
    document.addEventListener('click', (event) => {
      const workflow = event.target.closest('[data-workflow-run]');
      if (workflow) {
        logActivity('workflow_run', {
          workflow: workflow.dataset.workflowRun
        });
      }

      const command = event.target.closest('[data-command-key]');
      if (command) {
        logActivity('slash_command', {
          command: command.dataset.commandKey
        });
      }
    });

    $('send')?.addEventListener('click', () => {
      const input = $('input');
      logActivity('message_sent', {
        sensitive_themes: textContainsSensitiveThemes(input?.value || '')
      });
    });
  }

  function injectStyles() {
    if ($('icGovernanceStyles')) return;

    const style = document.createElement('style');
    style.id = 'icGovernanceStyles';
    style.textContent = `
      .ic-governance-dock {
        position: fixed;
        right: 20px;
        bottom: 24px;
        z-index: 4200;
        width: min(360px, calc(100vw - 28px));
        display: none;
        border: 1px solid rgba(245,158,11,.22);
        background: rgba(255,251,235,.98);
        color: #78350f;
        border-radius: 20px;
        box-shadow: 0 18px 44px rgba(15,23,42,.12);
        padding: 14px 16px;
      }

      .ic-governance-dock.visible {
        display: block;
      }

      .ic-governance-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
        font-size: .82rem;
      }

      .ic-governance-head span {
        opacity: .72;
      }

      .ic-governance-body {
        font-size: .82rem;
        line-height: 1.55;
      }

      @media (max-width: 760px) {
        .ic-governance-dock {
          left: 14px;
          right: 14px;
          width: auto;
          bottom: 82px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.IndiCareGovernance = {
    logActivity,
    textContainsSensitiveThemes
  };

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    bindOperationalTracking();

    const messages = $('messages');
    if (messages) {
      new MutationObserver(monitorMessages).observe(messages, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  });
})();
