(() => {
  if (window.__indicareRuntimeSafety) return;
  window.__indicareRuntimeSafety = true;

  window.IndiCareSafe = {
    run(label, fn) {
      try { return typeof fn === 'function' ? fn() : undefined; }
      catch (error) { console.error(`[IndiCare] ${label || 'safe run'} failed`, error); return undefined; }
    },
    async runAsync(label, fn) {
      try { return typeof fn === 'function' ? await fn() : undefined; }
      catch (error) { console.error(`[IndiCare] ${label || 'safe async'} failed`, error); return undefined; }
    },
    css(value) {
      const raw = String(value ?? '');
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(raw);
      return raw.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    },
    debounce(key, fn, wait = 100) {
      window.__indicareDebounceTimers ||= {};
      clearTimeout(window.__indicareDebounceTimers[key]);
      window.__indicareDebounceTimers[key] = setTimeout(() => this.run(key, fn), wait);
    },
    emit(name, detail = {}) {
      try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch (error) { console.error(`[IndiCare] emit ${name} failed`, error); }
    }
  };

  window.addEventListener('error', (event) => {
    console.error('[IndiCare] runtime error', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[IndiCare] unhandled promise rejection', event.reason);
  });
})();
