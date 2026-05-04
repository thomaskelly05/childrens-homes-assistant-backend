import { bootYoungPeopleShell } from "./boot.js";

function modularShellEnabled() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("modular_shell") === "1" ||
    document.body?.dataset?.modularShell === "true" ||
    window.localStorage?.getItem("indicare.modularYoungPeopleShell") === "true"
  );
}

async function start() {
  if (!modularShellEnabled()) return;

  if (window.__INDICARE_YOUNG_PEOPLE_SHELL_BOOTED__) return;
  window.__INDICARE_YOUNG_PEOPLE_SHELL_BOOTED__ = true;

  try {
    await bootYoungPeopleShell();
  } catch (error) {
    window.__INDICARE_YOUNG_PEOPLE_SHELL_BOOTED__ = false;
    console.error("[young-people-shell/modular-entry] boot failed", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
