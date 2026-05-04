(() => {
  function safeLocalStorageFlag(key) {
    try {
      return window.localStorage?.getItem(key) === "true";
    } catch (_) {
      return false;
    }
  }

  function queryFlag(name) {
    return new URLSearchParams(window.location.search).get(name) === "1";
  }

  function legacyShellForced() {
    return queryFlag("legacy_shell") || document.body?.dataset?.legacyShell === "true";
  }

  function modularShellEnabled() {
    if (legacyShellForced()) return false;
    return (
      queryFlag("modular_shell") ||
      document.body?.dataset?.modularShell === "true" ||
      safeLocalStorageFlag("indicare.modularYoungPeopleShell")
    );
  }

  if (modularShellEnabled()) {
    document.body.dataset.modularShellActive = "true";
    console.info("[young-people-shell] Legacy shell skipped because modular shell is active.");
    return;
  }

  const script = document.createElement("script");
  script.src = "/js/young-people-shell.js";
  script.defer = false;
  document.body.appendChild(script);
})();
