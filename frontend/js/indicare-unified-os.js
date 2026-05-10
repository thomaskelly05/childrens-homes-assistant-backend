(() => {
  const LEGACY_SELECTORS = [
    '.indicare-global-nav',
    '.legacy-topnav',
    '.legacy-header',
    '.old-toolbar',
    '.topbar:not(.keep-topbar)',
    '[data-legacy-nav="true"]',
    '[data-old-shell="true"]'
  ];

  const DESIGN_STYLESHEET = '/css/indicare-blue-os.css';

  function ensureCanonicalStylesheet() {
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')];
    const hasCanonical = existing.some((link) => link.getAttribute('href') === DESIGN_STYLESHEET);
    if (!hasCanonical) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = DESIGN_STYLESHEET;
      document.head.appendChild(link);
    }
  }

  function removeLegacyChrome() {
    LEGACY_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    });
    document.body.classList.add('indicare-unified-os');
  }

  function markCanonicalShell() {
    document.documentElement.dataset.indicareDesign = 'blue-os';
    document.body.dataset.indicareFrontend = 'unified-os';

    const workspaceShell = document.querySelector('[data-app="indicare-workspace"]');
    if (workspaceShell) {
      workspaceShell.classList.add('premium-os-shell', 'indicare-blue-shell');
    }
  }

  function normaliseButtons() {
    document.querySelectorAll('button').forEach((button) => {
      if (button.classList.contains('primary-action') || button.classList.contains('secondary-action')) return;
      const text = button.textContent?.trim().toLowerCase() || '';
      if (/create|submit|save|ask|generate|open/.test(text)) button.classList.add('primary-action');
      else button.classList.add('secondary-action');
    });
  }

  function normaliseCards() {
    document.querySelectorAll('.card, .box, .widget, .tile').forEach((node) => {
      if (!node.classList.contains('panel')) node.classList.add('panel');
    });
  }

  function boot() {
    ensureCanonicalStylesheet();
    removeLegacyChrome();
    markCanonicalShell();
    normaliseButtons();
    normaliseCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  const observer = new MutationObserver(() => {
    removeLegacyChrome();
    markCanonicalShell();
  });

  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, { childList: true, subtree: true }));
})();
