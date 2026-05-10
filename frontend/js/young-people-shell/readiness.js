import { missingRequiredIds } from "./contract.js";
import { state } from "./state.js";

function check(name, passed, detail = "") {
  return { name, passed: Boolean(passed), detail };
}

export function runYoungPeopleShellReadinessChecks() {
  const missing = missingRequiredIds(document);
  const selector = document.getElementById("ypSelector");
  const tabs = [...document.querySelectorAll("#ypTabs [data-tab]")].map((button) => button.dataset.tab);

  const checks = [
    check("DOM contract", missing.length === 0, missing.length ? `Missing: ${missing.join(", ")}` : "All required elements present"),
    check("Modular ownership", document.body?.dataset?.modularShellActive === "true", document.body?.dataset?.modularShellActive || "not set"),
    check("Selector present", Boolean(selector), selector ? "ypSelector found" : "ypSelector missing"),
    check("Selector has options", Boolean(selector && selector.options.length > 0), selector ? `${selector.options.length} option(s)` : "no selector"),
    check("Young person state", Boolean(state.youngPersonId || document.body?.dataset?.youngPersonId), state.youngPersonId || document.body?.dataset?.youngPersonId || "no selected young person"),
    check("Tabs present", tabs.length >= 6, tabs.join(", ")),
    check("Assistant binding surface", Boolean(document.getElementById("ypAssistantInput") && document.getElementById("ypAssistantSend")), "assistant input/send controls"),
    check("Composer binding surface", Boolean(document.getElementById("ypComposer") && document.querySelector("[data-composer-type]")), "composer modal and open buttons"),
    check("Public boot handle", Boolean(window.IndiCareYoungPeopleBoot?.bootYoungPeopleShell), "window.IndiCareYoungPeopleBoot"),
    check("Public assistant handle", Boolean(window.IndiCareYoungPeopleAssistant?.sendAssistantMessage), "window.IndiCareYoungPeopleAssistant"),
    check("Public composer handle", Boolean(window.IndiCareYoungPeopleComposer?.openComposer), "window.IndiCareYoungPeopleComposer"),
  ];

  const passed = checks.every((item) => item.passed);
  window.__INDICARE_YOUNG_PEOPLE_SHELL_READINESS__ = { passed, checks, checkedAt: new Date().toISOString() };

  const method = passed ? "info" : "warn";
  console[method]("[young-people-shell/readiness]", passed ? "ready" : "not ready", window.__INDICARE_YOUNG_PEOPLE_SHELL_READINESS__);

  return window.__INDICARE_YOUNG_PEOPLE_SHELL_READINESS__;
}

window.IndiCareYoungPeopleReadiness = Object.freeze({ runYoungPeopleShellReadinessChecks });
