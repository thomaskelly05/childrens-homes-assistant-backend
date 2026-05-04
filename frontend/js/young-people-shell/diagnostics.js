export function getYoungPeopleShellDiagnostics() {
  const params = new URLSearchParams(window.location.search);
  const scripts = [...document.scripts].map((script) => script.src || "inline");

  return {
    url: window.location.pathname + window.location.search,
    modularQuery: params.get("modular_shell") === "1",
    smokeQuery: params.get("smoke_shell") === "1",
    legacyQuery: params.get("legacy_shell") === "1",
    modularActive: document.body?.dataset?.modularShellActive === "true",
    legacyScriptPresent: scripts.some((src) => src.includes("/js/young-people-shell.js")),
    modularEntryPresent: scripts.some((src) => src.includes("/js/young-people-shell/modular-entry.js")),
    legacyLoaderPresent: scripts.some((src) => src.includes("/js/young-people-shell/legacy-loader.js")),
    readiness: window.__INDICARE_YOUNG_PEOPLE_SHELL_READINESS__ || null,
    smokeTest: window.__INDICARE_YOUNG_PEOPLE_SHELL_SMOKE_TEST__ || null,
    handles: {
      boot: Boolean(window.IndiCareYoungPeopleBoot?.bootYoungPeopleShell),
      assistant: Boolean(window.IndiCareYoungPeopleAssistant?.sendAssistantMessage),
      composer: Boolean(window.IndiCareYoungPeopleComposer?.openComposer),
      smoke: Boolean(window.IndiCareYoungPeopleSmokeTest?.runYoungPeopleShellSmokeTest),
    },
  };
}

window.IndiCareYoungPeopleDiagnostics = Object.freeze({ getYoungPeopleShellDiagnostics });
