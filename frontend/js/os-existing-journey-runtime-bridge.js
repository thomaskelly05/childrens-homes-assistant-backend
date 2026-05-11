(() => {
  const FLAG = '__indicareExistingJourneyRuntimeBridge';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const CANONICAL_CONTAINER_ID = 'indicare-existing-journey-runtime';

  const SHELL_WORKSPACES = {
    'daily-recording': {
      title: 'Daily Recording',
      subtitle: 'Daily logs, observations, handover notes and shift continuity records.',
      sections: [
        ['Daily log', 'Record the day clearly: presentation, routines, support offered, child voice and outcome.'],
        ['Observations', 'Capture factual observations that build the chronology without duplicating records.'],
        ['Handover continuity', 'Promises, worries, routines and follow-up points that must carry into the next shift.']
      ],
      actions: ['Daily record', 'Observation', 'Handover note']
    },
    'direct-work': {
      title: 'Direct Work',
      subtitle: 'Key work, therapeutic conversations, life-story work and outcome-focused sessions.',
      sections: [
        ['Session record', 'Who was involved, what was explored, what the child said and what changed.'],
        ['Themes', 'Identity, relationships, safety, emotions, family, education and future planning.'],
        ['Follow-up', 'Actions, linked plans, documents and manager review points.']
      ],
      actions: ['Key work session', 'Life-story note', 'Outcome update']
    },
    incidents: {
      title: 'Incidents & Safeguarding',
      subtitle: 'Incident recording, missing from care, safeguarding concerns, notifications and review.',
      sections: [
        ['Incident record', 'What happened, who was present, de-escalation, physical intervention and outcome.'],
        ['Safeguarding concern', 'Risk, immediate action, notifications, strategy discussion and review needs.'],
        ['Missing from care', 'Trigger, timeline, return conversation, notifications and prevention learning.']
      ],
      actions: ['Incident', 'Safeguarding concern', 'Missing episode']
    },
    health: {
      title: 'Health & Medication',
      subtitle: 'Health notes, medication, appointments, sleep, emotional wellbeing and regulation.',
      sections: [
        ['Health note', 'Physical and emotional wellbeing updates linked back to the child chronology.'],
        ['Medication', 'Medication support, refusal, errors, side effects and review needs.'],
        ['Regulation', 'Sleep, sensory needs, routines, anxiety and what helped the child settle.']
      ],
      actions: ['Health note', 'Medication note', 'Wellbeing update']
    },
    education: {
      title: 'Education',
      subtitle: 'Attendance, school updates, PEP, achievements, exclusions, transitions and aspirations.',
      sections: [
        ['Education update', 'Attendance, engagement, relationships, achievements and support needs.'],
        ['School communication', 'Messages, meetings, professionals, actions and document links.'],
        ['Progress', 'Learning, aspirations, barriers and next steps.']
      ],
      actions: ['Education note', 'PEP update', 'Achievement']
    },
    contact: {
      title: 'Family & Contact',
      subtitle: 'Family time, calls, visits, responses, emotional impact and follow-up support.',
      sections: [
        ['Contact record', 'Who, when, where, what happened and how the child experienced it.'],
        ['Emotional impact', 'Presentation before and after contact, what helped and what needs follow-up.'],
        ['Planning', 'Arrangements, decisions, documents, risks and review points.']
      ],
      actions: ['Family contact', 'Phone call', 'Contact review']
    },
    documents: {
      title: 'Documents',
      subtitle: 'Plans, assessments, reports, policies, evidence, review dates and signatures.',
      sections: [
        ['Care documents', 'Care plans, placement plans, risk assessments, PEPs and health documents.'],
        ['Evidence library', 'Professional reports, Reg 44/45, meeting minutes, inspection evidence and uploads.'],
        ['Review control', 'Expiry dates, review reminders, manager sign-off and version control.']
      ],
      actions: ['Upload document', 'Review document', 'Link to chronology']
    }
  };

  function osContext() {
    return window.IndiCareOSContext || {};
  }

  function ensureWorkspaceShell() {
    const shell = document.getElementById(CANONICAL_CONTAINER_ID);
    if (!shell) return null;
    if (!document.getElementById('workspace-main')) {
      const main = document.createElement('section');
      main.id = 'workspace-main';
      main.className = 'ic365-content-panel';
      main.innerHTML = '<div class="ic365-empty-state">Waiting for home and young person context...</div>';
      shell.appendChild(main);
    }
    return shell;
  }

  function updateContextChrome(ctx) {
    document.querySelectorAll('[data-os-context-home],[data-os-side-home]').forEach((node) => {
      node.textContent = ctx.homeName || (ctx.homeId ? `Home ${ctx.homeId}` : 'Choose home');
    });
    document.querySelectorAll('[data-os-context-child],[data-os-side-child]').forEach((node) => {
      node.textContent = ctx.childName || (ctx.childId ? `Young person ${ctx.childId}` : 'Choose young person');
    });
  }

  function syncContext() {
    const ctx = osContext();
    updateContextChrome(ctx);
    if (!ctx.homeId || !ctx.childId) return null;

    const next = {
      homeId: String(ctx.homeId || ''),
      homeName: ctx.homeName || `Home ${ctx.homeId}`,
      childId: String(ctx.childId || ''),
      childName: ctx.childName || `Young person ${ctx.childId}`,
      childSummary: 'Selected through the OS context wall.',
      childRiskLevel: ctx.childRiskLevel || '',
      childPlacementStatus: ctx.childPlacementStatus || 'active journey'
    };

    if (window.IndiCareContext?.set) {
      window.IndiCareContext.set(next);
    } else {
      let current = { ...next };
      window.IndiCareContext = {
        get: () => current,
        set: (value) => {
          current = { ...current, ...(value || {}) };
          return current;
        },
        clear: () => {
          current = { ...next };
          return current;
        }
      };
    }

    return next;
  }

  function setHeader(titleText, subtitleText) {
    const title = document.getElementById('view-title');
    const subtitle = document.getElementById('view-subtitle');
    if (title) title.textContent = titleText;
    if (subtitle) subtitle.textContent = subtitleText;
  }

  function setHeaderForView(view) {
    const labels = {
      'today-child': ['Today', 'Daily recording, support and continuity for the selected young person.'],
      'child-life': ['Young Person', 'Profile, routines, identity, relationships and whole-child understanding.'],
      'child-journey': ['Journey', 'Narrative journey, direct work, outcomes and lived experience.'],
      'child-timeline': ['Timeline', 'Chronology, records, events, documents and manager review history.'],
      'adult-profile': ['Adults', 'Reflective workforce profile, supervision, consistency and wellbeing.'],
      'home-profile': ['Home', 'Home profile, atmosphere, routines, continuity and safeguarding environment.'],
      'standards-ofsted': ['Standards & Ofsted', 'Quality standards, documents, Reg 44/45 and inspection readiness.'],
      review: ['Oversight', 'Manager comments, returns, approvals, actions and sign-off.']
    };
    const [nextTitle, nextSubtitle] = labels[view] || labels['today-child'];
    setHeader(nextTitle, nextSubtitle);
  }

  function setActive(button) {
    document.querySelectorAll('[data-view],[data-shell]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function shellWorkspaceCard(workspace) {
    return `
      <section class="hero-card">
        <div>
          <p class="eyebrow">Shell workspace</p>
          <h3>${workspace.title}</h3>
          <p>${workspace.subtitle}</p>
        </div>
        <div class="hero-actions">
          ${workspace.actions.map((action) => `<button type="button" class="ic365-button">${action}</button>`).join('')}
        </div>
      </section>
      <section class="card-grid">
        ${workspace.sections.map(([title, text]) => `<article class="metric-card"><strong>${title}</strong><span>${text}</span></article>`).join('')}
      </section>
      <section class="two-column">
        <article class="panel">
          <h3>Recording structure</h3>
          <div class="check-row done">Context: home, young person, date/time and adults involved</div>
          <div class="check-row done">Narrative: what happened, support offered, child voice and outcome</div>
          <div class="check-row todo">Manager review, comments, returns and sign-off pending deeper wiring</div>
        </article>
        <article class="panel">
          <h3>Shell-only integration</h3>
          <p>This area is now present in the operating system shell. Existing backend workflows will be reused and wired after the shell is stable.</p>
        </article>
      </section>`;
  }

  function activateShell(key) {
    const shell = ensureWorkspaceShell();
    const workspace = SHELL_WORKSPACES[key];
    if (!shell || !workspace) return;
    setHeader(workspace.title, workspace.subtitle);
    const main = document.getElementById('workspace-main');
    if (main) main.innerHTML = shellWorkspaceCard(workspace);
  }

  function activate(view) {
    const shell = ensureWorkspaceShell();
    if (!shell) return;
    setHeaderForView(view);

    if (view === 'today-child' && typeof window.loadTodayForChild === 'function') return window.loadTodayForChild();
    if (view === 'child-life' && typeof window.loadChildLifeEcosystem === 'function') return window.loadChildLifeEcosystem();
    if (view === 'child-journey' && typeof window.loadChildJourneyExperience === 'function') return window.loadChildJourneyExperience();
    if (view === 'child-timeline' && typeof window.loadChildTimeline === 'function') return window.loadChildTimeline();
    if (view === 'adult-profile' && typeof window.loadAdultJourneyProfile === 'function') return window.loadAdultJourneyProfile();
    if (view === 'home-profile' && typeof window.loadHomeJourneyProfile === 'function') return window.loadHomeJourneyProfile();
    if (view === 'standards-ofsted' && typeof window.loadStandardsOfstedReadiness === 'function') return window.loadStandardsOfstedReadiness();
    if (view === 'review' && typeof window.loadManagerOversight === 'function') return window.loadManagerOversight();
  }

  function bindNav() {
    if (document.body.dataset.ic365NavBound === 'true') return;
    document.body.dataset.ic365NavBound = 'true';
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        setActive(button);
        syncContext();
        activate(button.dataset.view);
      });
    });
    document.querySelectorAll('[data-shell]').forEach((button) => {
      button.addEventListener('click', () => {
        setActive(button);
        syncContext();
        activateShell(button.dataset.shell);
      });
    });
  }

  function bootExistingModules() {
    ensureWorkspaceShell();
    bindNav();
    const ctx = syncContext();
    if (!ctx) return;
    setTimeout(() => activate(document.querySelector('[data-view].active')?.dataset.view || 'today-child'), 100);
  }

  function boot() {
    ensureWorkspaceShell();
    bindNav();
    bootExistingModules();
    document.addEventListener('indicare:os-context-ready', bootExistingModules);
    document.addEventListener('indicare:care-data-changed', () => {
      const activeView = document.querySelector('[data-view].active')?.dataset.view;
      const activeShell = document.querySelector('[data-shell].active')?.dataset.shell;
      syncContext();
      if (activeShell) activateShell(activeShell);
      else activate(activeView || 'today-child');
    });
    console.info('[IndiCare OS] SharePoint shell bridge with shell-only workspaces active');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();