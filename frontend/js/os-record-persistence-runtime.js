(() => {
  const FLAG = '__indicareRecordPersistenceRuntime';
  if (window[FLAG]) return;
  window[FLAG] = true;

  async function request(path, method = 'POST', body = {}) {
    const response = await fetch(path, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    try {
      return await response.json();
    } catch {
      return { ok: true };
    }
  }

  function payload(detail = {}) {
    return {
      record_id: detail.recordId,
      action: detail.action,
      continuation: detail.continuation || '',
      review: detail.review || '',
      outcome: detail.outcome || '',
      document_note: detail.document_note || '',
      updated_at: new Date().toISOString()
    };
  }

  async function persist(detail = {}) {
    const data = payload(detail);

    const routes = {
      continuation: '/api/os-command/care-recording',
      draft: '/api/os-command/care-recording',
      sign_off: '/api/os-command/review-workflows',
      return: '/api/os-command/review-workflows',
      escalate: '/api/os-command/safeguarding-patterns',
      document_link: '/api/os-command/inspection/workspaces',
      evidence_ready: '/api/os-command/inspection/workspaces'
    };

    const endpoint = routes[detail.action] || '/api/os-command/care-recording';

    try {
      await request(endpoint, 'POST', data);

      document.dispatchEvent(new CustomEvent('indicare:record-persisted', {
        detail: {
          recordId: detail.recordId,
          action: detail.action,
          persisted: true
        }
      }));
    } catch (error) {
      console.warn('[IndiCare OS] Record persistence failed', error);

      document.dispatchEvent(new CustomEvent('indicare:record-persisted', {
        detail: {
          recordId: detail.recordId,
          action: detail.action,
          persisted: false,
          error: String(error)
        }
      }));
    }
  }

  document.addEventListener('indicare:persist-record', (event) => {
    persist(event.detail || {});
  });

  window.IndiCarePersistRecord = persist;
})();