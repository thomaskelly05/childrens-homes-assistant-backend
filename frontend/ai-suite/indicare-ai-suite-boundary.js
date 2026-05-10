/* IndiCare AI Suite Boundary
   Creates a hard separation between the AI Suite frontend and the IndiCare OS frontend.
*/
(function () {
  if (window.__indicareAiSuiteBoundaryLoaded) return;
  window.__indicareAiSuiteBoundaryLoaded = true;

  const OS_PATTERNS = [
    '.connected-care-workspace',
    '.care-workspace-grid',
    '.operational-dashboard-grid',
    '.chronology-grid',
    '.record-dashboard',
    '.care-module-grid',
    '.compliance-dashboard',
    '.home-dashboard',
    '.young-person-dashboard',
    '[data-os-module]',
    '[data-care-module]',
    '[data-operational-grid]'
  ];

  const AI_APPS = [
    'assistant',
    'notes',
    'docs',
    'connect',
    'mail'
  ];

  function hideOsSurfaces() {
    OS_PATTERNS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        node.setAttribute('data-ai-suite-hidden', 'true');
        node.style.display = 'none';
      });
    });
  }

  function ensureAiIdentity() {
    document.body?.classList.add('indicare-ai-suite');
    document.documentElement?.setAttribute('data-product-surface', 'ai-suite');

    AI_APPS.forEach((app) => {
      document.body?.classList.add(`ai-suite-${app}-enabled`);
    });
  }

  function ensureConversationalWorkspace() {
    const title = document.querySelector('.page-title, #title');
    if (title && /connected care workspace/i.test(title.textContent || '')) {
      title.textContent = 'IndiCare AI';
    }

    const subtitle = document.querySelector('.page-overline');
    if (subtitle && /operational|care/i.test(subtitle.textContent || '')) {
      subtitle.textContent = 'Conversational intelligence workspace';
    }
  }

  function ensureAiSidebarLabels() {
    document.querySelectorAll('[data-suite-view]').forEach((node) => {
      const value = node.getAttribute('data-suite-view');
      if (!value) return;
      if (!AI_APPS.includes(value) && value !== 'intelligence') {
        node.style.display = 'none';
      }
    });
  }

  function ensureContextRailIdentity() {
    const railTitles = document.querySelectorAll('.right-rail h2, .right-rail h3, .context-panel-title');
    railTitles.forEach((node) => {
      const text = String(node.textContent || '').toLowerCase();
      if (text.includes('care') || text.includes('compliance') || text.includes('operational')) {
        node.textContent = 'Conversation Context';
      }
    });
  }

  function observe() {
    const observer = new MutationObserver(() => {
      hideOsSurfaces();
      ensureConversationalWorkspace();
      ensureAiSidebarLabels();
      ensureContextRailIdentity();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    ensureAiIdentity();
    hideOsSurfaces();
    ensureConversationalWorkspace();
    ensureAiSidebarLabels();
    ensureContextRailIdentity();
    observe();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }
})();
