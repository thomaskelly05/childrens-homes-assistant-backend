function detectOwner({ modularActive, legacyScriptPresent, modularEntryPresent, legacyLoaderPresent }) {
  if (modularActive && !legacyScriptPresent) return "modular";
  if (legacyScriptPresent && !modularActive) return "legacy";
  if (modularActive && legacyScriptPresent) return "conflict";
  if (modularEntryPresent || legacyLoaderPresent) return "pending";
  return "unknown";
}

export function getYoungPeopleShellDiagnostics() {
  const params = new URLSearchParams(window.location.search);
  const scripts = [...document.scripts].map((script) => script.src || "inline");

  const modularActive = document.body?.dataset?.modularShellActive === "true";
  const legacyScriptPresent = scripts.some((src) => src.includes("/js/young-people-shell.js"));
  const modularEntryPresent = scripts.some((src) => src.includes("/js/young-people-shell/modular-entry.js"));
  const legacyLoaderPresent = scripts.some((src) => src.includes("/js/young-people-shell/legacy-loader.js"));

  const owner = detectOwner({
    modularActive,
    legacyScriptPresent,
    modularEntryPresent,
    legacyLoaderPresent,
  });

  return {
    url: window.location.pathname + window.location.search,
    owner,
    modularQuery: params.get("modular_shell") === "1",
    smokeQuery: params.get("smoke_shell") === "1",
    legacyQuery: params.get("legacy_shell") === "1",
    modularActive,
    legacyScriptPresent,
    modularEntryPresent,
    legacyLoaderPresent,
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
