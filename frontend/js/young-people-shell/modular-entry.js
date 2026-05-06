import { bootYoungPeopleShell } from "./boot.js";
import "./diagnostics.js";
import { runYoungPeopleShellReadinessChecks } from "./readiness.js";
import { runYoungPeopleShellSmokeTest } from "./smoke-test.js";

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

function autoSmokeEnabled() {
  return queryFlag("smoke_shell") || safeLocalStorageFlag("indicare.smokeYoungPeopleShell");
}

async function start() {
  document.body.dataset.modularShellActive = "true";

  if (window.__INDICARE_YOUNG_PEOPLE_SHELL_BOOTED__) return;
  window.__INDICARE_YOUNG_PEOPLE_SHELL_BOOTED__ = true;

  try {
    await bootYoungPeopleShell();

    try {
      runYoungPeopleShellReadinessChecks();
    } catch (e) {
      console.warn("[young-people-shell/modular-entry] readiness checks failed to run", e);
    }

    window.IndiCareYoungPeopleSmokeTest = Object.freeze({ runYoungPeopleShellSmokeTest });

    if (autoSmokeEnabled()) {
      try {
        await runYoungPeopleShellSmokeTest();
      } catch (e) {
        console.warn("[young-people-shell/modular-entry] smoke test failed to run", e);
      }
    }
  } catch (error) {
    window.__INDICARE_YOUNG_PEOPLE_SHELL_BOOTED__ = false;
    document.body.dataset.modularShellActive = "false";
    console.error("[young-people-shell/modular-entry] boot failed", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
