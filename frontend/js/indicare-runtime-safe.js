(() => {
  if (window.IndiCareSafe) return;

  const debounceMap = new Map();

  function run(label, fn, fallback = null) {
    try {
      return typeof fn === 'function' ? fn() : undefined;
    } catch (error) {
      console.error(`[IndiCareSafe] ${label}`, error);
      if (typeof fallback === 'function') {
        try {
          return fallback(error);
        } catch (fallbackError) {
          console.error('[IndiCareSafe:fallback]', fallbackError);
        }
      }
      return undefined;
    }
  }

  function debounce(key, fn, wait = 200) {
    clearTimeout(debounceMap.get(key));
    const timer = setTimeout(() => {
      debounceMap.delete(key);
      run(`debounce:${key}`, fn);
    }, wait);
    debounceMap.set(key, timer);
  }

  function css(value) {
    const input = String(value ?? '');
    if (window.CSS?.escape) return CSS.escape(input);
    return input.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function emit(eventName, detail = {}) {
    document.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  function on(eventName, handler, options) {
    document.addEventListener(eventName, (event) => run(`event:${eventName}`, () => handler(event)), options);
  }

  window.IndiCareSafe = {
    run,
    debounce,
    css,
    emit,
    on,
  };

  window.addEventListener('error', (event) => {
    console.error('[IndiCare Runtime Error]', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[IndiCare Promise Rejection]', event.reason);
  });
})();
