/* IndiCare AI Suite Loader
   Loads the isolated AI Suite shell/runtime on assistant surfaces using the
   canonical AI Suite asset resolver so deployments do not depend on the page
   being served from a specific route.
*/
(function () {
  if (window.__indicareAiSuiteLoader) return;
  window.__indicareAiSuiteLoader = true;

  function createAssetResolver() {
    const version = window.__INDICARE_AI_SUITE_ASSET_VERSION__ || document.querySelector('meta[name="indicare-ai-suite-asset-version"]')?.content || '';
    const currentScriptBase = document.currentScript?.src ? new URL('.', document.currentScript.src).href : '';
    const path = window.location.pathname || '/';
    const aiSuiteIndex = path.indexOf('/ai-suite');
    const derivedBase = aiSuiteIndex >= 0
      ? `${path.slice(0, aiSuiteIndex)}/ai-suite/`
      : `${path.replace(/\/?(?:assistant(?:\.html)?|ai-suite)?\/?$/, '/') || '/'}ai-suite/`;
    const basePath = window.__INDICARE_AI_SUITE_ASSET_BASE__ || currentScriptBase || derivedBase;
    return {
      basePath,
      version,
      resolve(file) {
        const clean = String(file || '').replace(/^\/+/, '');
        const url = new URL(clean, this.basePath).href;
        return this.version ? `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(this.version)}` : url;
      },
      candidates(file) {
        return [this.resolve(file)];
      },
    };
  }

  const assets = window.IndiCareAISuiteAssets || (window.IndiCareAISuiteAssets = createAssetResolver());
  const registry = window.__indicareAiSuiteRuntimes || (window.__indicareAiSuiteRuntimes = new Map());

  const CSS_ASSETS = [
    'indicare-suite.css',
    'indicare-ai-suite.css',
    'chatgpt-mobile-shell.css',
    'chatgpt-design-guard.css',
  ];

  const JS_ASSETS = [
    'indicare-ai-suite-boundary.js',
    'indicare-ai-suite-bootstrap.js',
  ];

  function candidates(file) {
    return assets.candidates?.(file) || [assets.resolve(file)];
  }

  function ensureBodyClass() {
    document.body?.classList.add('indicare-ai-suite');
    document.documentElement?.setAttribute('data-product-surface', 'ai-suite');
  }

  function loadCss(file) {
    const paths = candidates(file);
    const key = `css:${file}`;
    if (registry.get(key) === 'loaded' || document.querySelector(`link[data-ai-suite-css="${file}"]`)) return;
    const link = document.createElement('link');
    let pathIndex = 0;
    link.rel = 'stylesheet';
    link.href = paths[pathIndex];
    link.dataset.aiSuiteCss = file;
    registry.set(key, 'loading');
    link.onload = () => {
      registry.set(key, 'loaded');
      window.dispatchEvent(new CustomEvent('indicare:asset-loaded', { detail: { type: 'css', file, href: link.href } }));
    };
    link.onerror = () => {
      pathIndex += 1;
      if (paths[pathIndex]) {
        console.warn(`[IndiCare AI Suite] CSS failed at ${link.href}; trying ${paths[pathIndex]}`);
        link.href = paths[pathIndex];
        return;
      }
      registry.set(key, 'failed');
      console.warn(`[IndiCare AI Suite] CSS failed to load: ${file}. Attempted: ${paths.join(', ')}`);
      window.dispatchEvent(new CustomEvent('indicare:asset-failed', { detail: { type: 'css', file, attempted: paths } }));
    };
    document.head.appendChild(link);
  }

  function loadScript(file) {
    return new Promise((resolve) => {
      const paths = candidates(file);
      const key = `js:${file}`;
      if (registry.get(key) === 'loaded' || document.querySelector(`script[data-ai-suite-js="${file}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      let pathIndex = 0;
      script.src = paths[pathIndex];
      script.async = false;
      script.dataset.aiSuiteJs = file;
      registry.set(key, 'loading');
      script.onload = () => {
        registry.set(key, 'loaded');
        window.dispatchEvent(new CustomEvent('indicare:asset-loaded', { detail: { type: 'js', file, src: script.src } }));
        resolve();
      };
      script.onerror = () => {
        pathIndex += 1;
        if (paths[pathIndex]) {
          console.warn(`[IndiCare AI Suite] JS failed at ${script.src}; trying ${paths[pathIndex]}`);
          script.src = paths[pathIndex];
          return;
        }
        registry.set(key, 'failed');
        console.warn(`[IndiCare AI Suite] JS failed to load: ${file}. Attempted: ${paths.join(', ')}`);
        window.dispatchEvent(new CustomEvent('indicare:asset-failed', { detail: { type: 'js', file, attempted: paths } }));
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  function markLegacyStyles() {
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (!/\/ai-suite\//.test(href) && /assistant|dashboard|os|app|platform|care|timeline|chronology/i.test(href)) {
        link.dataset.aiSuiteLegacyCss = 'true';
      }
    });
  }

  function reassertAiSuiteCss() {
    CSS_ASSETS.forEach((file) => {
      const link = document.querySelector(`link[data-ai-suite-css="${file}"]`);
      if (link) document.head.appendChild(link);
    });
    const consolidated = document.querySelector('link[data-runtime="indicare-suite-css"]');
    if (consolidated) document.head.appendChild(consolidated);
  }

  async function boot() {
    ensureBodyClass();
    markLegacyStyles();

    CSS_ASSETS.forEach(loadCss);

    for (const asset of JS_ASSETS) {
      await loadScript(asset);
    }

    window.IndiCareAISuite?.boot?.();

    reassertAiSuiteCss();
    setTimeout(reassertAiSuiteCss, 500);
    setTimeout(reassertAiSuiteCss, 1500);

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
