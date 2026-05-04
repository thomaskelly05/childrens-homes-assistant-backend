(() => {
  function safeLocalStorageFlag(key) {
    try {
      return window.localStorage?.getItem(key) === "true";
    } catch (_) {
      return false;
    }
  }

  function modularShellEnabled() {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("modular_shell") === "1" ||
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
