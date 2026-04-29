import { RECORD_CONTRACT_LIST, getRecordRoute } from "./record-contracts.js";

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function safeId(value) {
  return hasValue(value) ? String(value).trim() : "";
}

async function checkUrl(url) {
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const finishedAt = performance.now();

    let body = null;
    const contentType = response.headers.get("content-type") || "";

    try {
      if (contentType.includes("application/json")) {
        body = await response.json();
      } else {
        body = await response.text();
      }
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url,
      ms: Math.round(finishedAt - startedAt),
      response: body,
      error: response.ok
        ? null
        : body?.detail || body?.message || response.statusText || "Request failed",
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      statusText: "",
      url,
      ms: null,
      response: null,
      error: error?.message || "Network error",
    };
  }
}

export async function checkRecordRoutes(ids = {}) {
  const youngPersonId = safeId(ids.youngPersonId ?? ids.childId);
  const homeId = safeId(ids.homeId);

  const results = [];

  for (const contract of RECORD_CONTRACT_LIST) {
    if (contract.requiresYoungPerson && !youngPersonId) {
      results.push({
        type: contract.type,
        label: contract.label,
        ok: false,
        skipped: true,
        reason: "Missing youngPersonId",
        url: null,
      });
      continue;
    }

    if (contract.requiresHome && !homeId) {
      results.push({
        type: contract.type,
        label: contract.label,
        ok: false,
        skipped: true,
        reason: "Missing homeId",
        url: null,
      });
      continue;
    }

    const url = getRecordRoute(contract.type, {
      youngPersonId,
      childId: youngPersonId,
      homeId,
    });

    const result = await checkUrl(url);

    results.push({
      type: contract.type,
      label: contract.label,
      table: contract.table,
      section: contract.section,
      ...result,
    });
  }

  return results;
}

export async function checkCoreRoutes(ids = {}) {
  const youngPersonId = safeId(ids.youngPersonId ?? ids.childId);
  const homeId = safeId(ids.homeId);

  const routes = [];

  if (youngPersonId) {
    routes.push({
      key: "visibility",
      label: "Visibility context",
      url: `/visibility/young-people/${encodeURIComponent(youngPersonId)}`,
    });

    routes.push({
      key: "assistant-child-context",
      label: "Assistant child context",
      url: `/young-people/${encodeURIComponent(
        youngPersonId
      )}/assistant/context`,
    });
  }

  if (homeId) {
    routes.push({
      key: "assistant-home-context",
      label: "Assistant home context",
      url: `/homes/${encodeURIComponent(homeId)}/assistant/context`,
    });
  }

  routes.push({
    key: "assistant-global-context",
    label: "Assistant global context",
    url: "/assistant/context",
  });

  const results = [];

  for (const route of routes) {
    const result = await checkUrl(route.url);
    results.push({
      ...route,
      ...result,
    });
  }

  return results;
}

export async function runRouteHealthCheck(ids = {}) {
  const [coreRoutes, recordRoutes] = await Promise.all([
    checkCoreRoutes(ids),
    checkRecordRoutes(ids),
  ]);

  const all = [...coreRoutes, ...recordRoutes];

  return {
    checked_at: new Date().toISOString(),
    summary: {
      total: all.length,
      ok: all.filter((item) => item.ok).length,
      failed: all.filter((item) => !item.ok && !item.skipped).length,
      skipped: all.filter((item) => item.skipped).length,
    },
    coreRoutes,
    recordRoutes,
    all,
  };
}

export function logRouteHealthReport(report) {
  if (!report) return;

  console.group("[IndiCare] Route health check");

  console.table(
    report.all.map((item) => ({
      key: item.key || item.type,
      label: item.label,
      ok: item.ok,
      skipped: Boolean(item.skipped),
      status: item.status,
      statusText: item.statusText || "",
      ms: item.ms,
      url: item.url,
      error: item.error || item.reason || "",
    }))
  );

  console.log("Summary:", report.summary);
  console.groupEnd();
}

export async function runAndLogRouteHealthCheck(ids = {}) {
  const report = await runRouteHealthCheck(ids);
  logRouteHealthReport(report);
  return report;
}
