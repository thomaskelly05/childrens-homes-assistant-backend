/* IndiCare AI operational search overlay
   ChatGPT-style command/search palette for residential care workflows.
*/

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function ensureOverlay() {
    let overlay = $('icOperationalSearch');

    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'icOperationalSearch';
    overlay.className = 'ic-search-overlay';

    overlay.innerHTML = `
      <div class="ic-search-panel ic-card">
        <div class="ic-search-header">
          <input id="icOperationalSearchInput" type="text" placeholder="Search chronology, safeguarding, chats, DOCS and notes..." autocomplete="off" />
          <button id="icCloseOperationalSearch" type="button">×</button>
        </div>

        <div class="ic-search-shortcuts">
          <button type="button" data-search-shortcut="missing from care">Missing from care</button>
          <button type="button" data-search-shortcut="police involvement">Police involvement</button>
          <button type="button" data-search-shortcut="safeguarding">Safeguarding</button>
          <button type="button" data-search-shortcut="management oversight">Management oversight</button>
        </div>

        <div id="icOperationalSearchSummary" class="ic-search-summary"></div>
        <div id="icOperationalSearchResults" class="ic-search-results"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    $('icCloseOperationalSearch')?.addEventListener('click', closeOverlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeOverlay();
      }
    });

    $('icOperationalSearchInput')?.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        await runSearch(event.target.value);
      }
    });

    overlay.querySelectorAll('[data-search-shortcut]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.dataset.searchShortcut || '';
        $('icOperationalSearchInput').value = value;
        await runSearch(value);
      });
    });

    return overlay;
  }

  function openOverlay() {
    const overlay = ensureOverlay();
    overlay.classList.add('visible');
    setTimeout(() => $('icOperationalSearchInput')?.focus(), 40);
  }

  function closeOverlay() {
    $('icOperationalSearch')?.classList.remove('visible');
  }

  async function runSearch(query) {
    const results = $('icOperationalSearchResults');
    const summary = $('icOperationalSearchSummary');

    if (!query?.trim()) {
      results.innerHTML = '';
      summary.innerHTML = '';
      return;
    }

    results.innerHTML = '<div class="ic-search-loading">Searching operational workspace…</div>';

    try {
      const response = await fetch('/standalone-search/operational', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: window.currentWorkspaceId || 'standalone',
          query,
          limit: 30
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.detail?.message || 'Search unavailable');
      }

      renderResults(payload);
    } catch (error) {
      results.innerHTML = `<div class="ic-search-empty">${escapeHtml(error.message || 'Search unavailable')}</div>`;
    }
  }

  function renderResults(payload) {
    const results = $('icOperationalSearchResults');
    const summary = $('icOperationalSearchSummary');

    summary.textContent = payload.summary || '';

    if (!payload.results?.length) {
      results.innerHTML = '<div class="ic-search-empty">No operational results found.</div>';
      return;
    }

    results.innerHTML = payload.results.map((item) => `
      <article class="ic-search-result ic-card">
        <div class="ic-search-result-head">
          <span class="ic-search-type">${escapeHtml(item.type || 'result')}</span>
          <strong>${escapeHtml(item.title || 'Untitled')}</strong>
        </div>
        <p>${escapeHtml(item.snippet || '')}</p>
      </article>
    `).join('');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  window.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openOverlay();
    }

    if (event.key === 'Escape') {
      closeOverlay();
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ic-global-search-trigger';
    trigger.innerHTML = 'Search <kbd>⌘K</kbd>';
    trigger.addEventListener('click', openOverlay);

    const topActions = document.querySelector('.ic-top-actions');
    topActions?.prepend(trigger);
  });
})();
