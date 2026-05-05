const STORAGE_KEY = "indicare.workspace.context";

const defaultContext = {
  homeId: "1",
  homeName: "Main home",
  childId: "1",
  childName: "Selected child",
  childSummary: "Choose a child to make records, plans and evidence part of their journey.",
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
};
