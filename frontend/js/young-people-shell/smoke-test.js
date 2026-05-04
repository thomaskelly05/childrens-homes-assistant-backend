import { runYoungPeopleShellReadinessChecks } from "./readiness.js";
import { state } from "./state.js";

async function waitFor(condition, { timeoutMs = 5000, intervalMs = 100 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

function result(name, passed, detail = "") {
  return { name, passed: Boolean(passed), detail };
}

export async function runYoungPeopleShellSmokeTest() {
  const checks = [];

  const readiness = runYoungPeopleShellReadinessChecks();
  checks.push(result("Readiness passed", readiness.passed, readiness.checkedAt));

  const selectorReady = await waitFor(() => {
    const selector = document.getElementById("ypSelector");
    return selector && selector.options.length > 0 && !selector.disabled;
  });
  const selector = document.getElementById("ypSelector");
  checks.push(result("Selector ready", selectorReady, selector ? `${selector.options.length} option(s)` : "missing"));

  checks.push(result("Young person selected", Boolean(state.youngPersonId || document.body?.dataset?.youngPersonId), state.youngPersonId || document.body?.dataset?.youngPersonId || "missing"));

  if (window.IndiCareYoungPeopleBoot?.setCurrentTab) {
    await window.IndiCareYoungPeopleBoot.setCurrentTab("daily");
    checks.push(result("Daily tab can load", document.getElementById("ypRecordsPanel") && !document.getElementById("ypRecordsPanel").classList.contains("hidden"), document.getElementById("ypStatus")?.textContent || ""));

    await window.IndiCareYoungPeopleBoot.setCurrentTab("assistant");
    checks.push(result("Assistant tab can open", document.getElementById("ypAssistantPanel") && !document.getElementById("ypAssistantPanel").classList.contains("hidden"), "assistant panel visible"));
  } else {
    checks.push(result("Boot handle available", false, "window.IndiCareYoungPeopleBoot missing"));
  }

  checks.push(result("Assistant send available", Boolean(window.IndiCareYoungPeopleAssistant?.sendAssistantMessage), "assistant module handle"));
  checks.push(result("Composer open available", Boolean(window.IndiCareYoungPeopleComposer?.openComposer), "composer module handle"));

  const passed = checks.every((item) => item.passed);
  const report = { passed, checks, checkedAt: new Date().toISOString() };
  window.__INDICARE_YOUNG_PEOPLE_SHELL_SMOKE_TEST__ = report;
  console[passed ? "info" : "warn"]("[young-people-shell/smoke-test]", passed ? "passed" : "failed", report);
  return report;
}

window.IndiCareYoungPeopleSmokeTest = Object.freeze({ runYoungPeopleShellSmokeTest });
