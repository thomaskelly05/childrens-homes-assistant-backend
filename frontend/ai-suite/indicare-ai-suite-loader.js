/* IndiCare AI Suite Loader
   Automatically loads the isolated AI Suite shell/runtime on /assistant.
*/
(function () {
  if (window.__indicareAiSuiteLoader) return;
  window.__indicareAiSuiteLoader = true;

  const CSS_ASSETS = [
    '/ai-suite/indicare-ai-suite.css',
    '/ai-suite/chatgpt-mobile-shell.css'
  ];

  const JS_ASSETS = [
    '/ai-suite/indicare-ai-suite-boundary.js',
    '/ai-suite/indicare-ai-suite-bootstrap.js'
  ];

  function ensureBodyClass() {
    document.body?.classList.add('indicare-ai-suite');
    document.documentElement?.setAttribute('data-product-surface', 'ai-suite');
  }

  function loadCss(href) {
    if (document.querySelector(`link[data-ai-suite-css="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.aiSuiteCss = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[data-ai-suite-js="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.aiSuiteJs = src;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.body.appendChild(script);
    });
  }

  async function boot() {
    ensureBodyClass();

    CSS_ASSETS.forEach(loadCss);

    for (const asset of JS_ASSETS) {
      await loadScript(asset);
    }

    window.IndiCareAISuite?.boot?.();

    document.body?.classList.add('indicare-ai-suite-loaded');

    window.dispatchEvent(new CustomEvent('indicare:ai-suite:loaded'));
  }

  if (location.pathname.includes('/assistant')) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(boot, 0);
    } else {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    }
  }
})();
