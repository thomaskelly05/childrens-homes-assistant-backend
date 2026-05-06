const STORAGE_KEY = "indicare.workspace.context";

const defaultContext = {
  homeId: "",
  homeName: "Select home",
  childId: "",
  childName: "Select child",
  childSummary: "Choose a child to make records, plans and evidence part of their journey.",
  childRiskLevel: "",
  childPlacementStatus: "",
};

window.IndiCareContext = {
  get() {
    try {
      return { ...defaultContext, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")) };
    } catch {
      return { ...defaultContext };
    }
  },
  set(next) {
    const current = this.get();
    const updated = { ...current, ...next };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("indicare:context-change", { detail: updated }));
    return updated;
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("indicare:context-change", { detail: { ...defaultContext } }));
    return { ...defaultContext };
  },
};
