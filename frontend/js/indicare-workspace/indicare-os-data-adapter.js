const ENDPOINT_GROUPS = {
  children: ["/api/children", "/api/young-people", "/api/young_people", "/children"],
  homes: ["/api/homes", "/api/provider/homes", "/homes"],
  documents: ["/api/documents", "/api/records", "/api/children/documents"],
  chronology: ["/api/chronology", "/api/timeline", "/api/events"],
  safeguarding: ["/api/safeguarding", "/api/risks", "/api/concerns"],
  workforce: ["/api/workforce", "/api/staff", "/api/users"],
};

const cache = new Map();

async function tryJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, credentials: "include" });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  return payload ? [payload] : [];
}

async function loadGroup(name) {
  if (cache.has(name)) return cache.get(name);
  const urls = ENDPOINT_GROUPS[name] || [];
  for (const url of urls) {
    try {
      const items = await tryJson(url);
      cache.set(name, items);
      window.dispatchEvent(new CustomEvent("indicare:data-loaded", { detail: { name, source: url, count: items.length } }));
      return items;
    } catch (error) {
      // Try the next known endpoint. The active deployment may expose only one.
    }
  }
  cache.set(name, []);
  window.dispatchEvent(new CustomEvent("indicare:data-empty", { detail: { name } }));
  return [];
}

function clearCache() {
  cache.clear();
}

window.IndiCareData = {
  load: loadGroup,
  clear: clearCache,
  endpoints: ENDPOINT_GROUPS,
};
