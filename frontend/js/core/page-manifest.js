(() => {
  const PAGES = Object.freeze({
    "/my-profile": {
      owner: "staff-profile",
      scripts: ["/js/staff-profile.js"],
      description: "Staff profile and OS hub.",
    },
    "/staff-profile.html": {
      owner: "staff-profile",
      scripts: ["/js/staff-profile.js"],
      description: "Staff profile and OS hub.",
    },
    "/young-people-shell": {
      owner: "young-people-shell",
      scripts: ["/js/young-people-shell.js"],
      description: "Young people care records shell.",
    },
    "/young-people-shell.html": {
      owner: "young-people-shell",
      scripts: ["/js/young-people-shell.js"],
      description: "Legacy young people care records shell.",
    },
    "/young-people": {
      owner: "young-people-index",
      scripts: ["/js/young-people.js"],
      description: "Young people index/list page.",
    },
    "/young-people.html": {
      owner: "young-people-index",
      scripts: ["/js/young-people.js"],
      description: "Legacy young people index/list page.",
    },
    "/academy": {
      owner: "academy",
      scripts: ["/academy.js"],
      description: "Learning and evidence home.",
    },
    "/academy.html": {
      owner: "academy",
      scripts: ["/academy.js"],
      description: "Legacy learning and evidence home.",
    },
    "/quality-hub": {
      owner: "quality-hub",
      scripts: [],
      description: "Quality and assurance hub.",
    },
    "/documents-hub": {
      owner: "documents-hub",
      scripts: [],
      description: "Documents and evidence hub.",
    },
    "/safeguarding-hub": {
      owner: "safeguarding-hub",
      scripts: [],
      description: "Safeguarding hub.",
    },
    "/os-dashboard": {
      owner: "os-dashboard",
      scripts: [],
      description: "Operational dashboard.",
    },
  });

  function currentPath() {
    return window.location.pathname.replace(/\/$/, "") || "/";
  }

  function currentPage() {
    return PAGES[currentPath()] || null;
  }

  window.IndiCarePageManifest = Object.freeze({
    PAGES,
    currentPath,
    currentPage,
  });
})();
