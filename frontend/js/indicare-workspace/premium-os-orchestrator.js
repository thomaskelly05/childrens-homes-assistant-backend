const root = document.documentElement;
const shell = document.querySelector('.premium-os-shell');
const statusStrip = document.getElementById('status-strip');
const nav = document.getElementById('workspace-nav');

root.classList.add('premium-os-active');

removeLegacyChrome();
createLiveWorkspaceStatus();
loadLiveTherapeuticOrchestration();
loadOutcomeStorytelling();
loadCareCopilotChat();
loadLiveChildProfile();
loadChildLifeModel();
enhanceChildNavigation();
enhanceReportsNavigation();
enhanceNavigation();
watchWorkspaceTransitions();

function removeLegacyChrome() {
  document.querySelectorAll('.legacy-topnav, .legacy-header, .old-toolbar, .topbar').forEach((element) => {
    element.style.display = 'none';
  });
}

function createLiveWorkspaceStatus() {
  if (!statusStrip || statusStrip.dataset.live === 'true') return;
  statusStrip.dataset.live = 'true';
  statusStrip.innerHTML = `
    <div class="os-live-pill">Therapeutic workspace live</div>
    <div class="os-live-pill">Inspection evidence connected</div>
    <div class="os-live-pill">Child voice monitoring active</div>
    <div class="os-live-pill">Care Copilot ready</div>
    <div class="os-live-pill">Live child profile active</div>
  `;
}

function loadLiveTherapeuticOrchestration() {
  import('./live-therapeutic-orchestration.js').catch(() => {
    if (statusStrip) statusStrip.innerHTML += `<div class="os-live-pill">Live orchestration warming up</div>`;
  });
}

function loadOutcomeStorytelling() {
  import('./visual-outcome-storytelling.js').catch(() => {
    if (statusStrip) statusStrip.innerHTML += `<div class="os-live-pill">Outcome storytelling warming up</div>`;
  });
}

function loadCareCopilotChat() {
  import('./contextual-care-copilot.js').catch(() => {
    if (statusStrip) statusStrip.innerHTML += `<div class="os-live-pill">Care Copilot warming up</div>`;
  });
}

function loadLiveChildProfile() {
  import('./live-child-profile.js').catch(() => {
    if (statusStrip) statusStrip.innerHTML += `<div class="os-live-pill">Child profile warming up</div>`;
  });
}

function loadChildLifeModel() {
  import('./child-life-model.js').catch(() => {
    if (statusStrip) statusStrip.innerHTML += `<div class="os-live-pill">Child life model warming up</div>`;
  });
}

function enhanceChildNavigation() {
  if (!nav || nav.dataset.childEnhanced === 'true') return;
  const childBody = [...nav.querySelectorAll('.nav-section')]
    .find((section) => section.querySelector('summary')?.textContent?.trim() === 'Children')
    ?.querySelector('.nav-section-body');
  if (!childBody || childBody.querySelector("[data-view='child-life-model']")) return;

  const button = document.createElement('button');
  button.className = 'nav-item';
  button.dataset.view = 'child-life-model';
  button.textContent = 'Whole life model';
  childBody.insertBefore(button, childBody.querySelector("[data-view='child-life']"));
  nav.dataset.childEnhanced = 'true';
}

function enhanceReportsNavigation() {
  if (!nav || nav.dataset.reportsEnhanced === 'true') return;
  const reportsBody = [...nav.querySelectorAll('.nav-section')]
    .find((section) => section.querySelector('summary')?.textContent?.trim() === 'Reports')
    ?.querySelector('.nav-section-body');
  if (!reportsBody || reportsBody.querySelector("[data-view='outcome-storytelling']")) return;

  const button = document.createElement('button');
  button.className = 'nav-item';
  button.dataset.view = 'outcome-storytelling';
  button.textContent = 'Outcome storytelling';
  reportsBody.insertBefore(button, reportsBody.querySelector("[data-view='reg45']"));
  nav.dataset.reportsEnhanced = 'true';
}

function enhanceNavigation() {
  if (!nav) return;

  nav.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      nav.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      pulseWorkspace();
    });
  });
}

function watchWorkspaceTransitions() {
  const workspace = document.getElementById('workspace-main');
  if (!workspace) return;

  const observer = new MutationObserver(() => {
    workspace.classList.remove('workspace-enter');
    requestAnimationFrame(() => workspace.classList.add('workspace-enter'));
    improveEmptyStates(workspace);
    elevateCards(workspace);
  });

  observer.observe(workspace, { childList: true, subtree: true });
}

function improveEmptyStates(workspace) {
  workspace.querySelectorAll('.empty-state').forEach((state) => {
    if (state.dataset.upgraded === 'true') return;
    state.dataset.upgraded = 'true';
    state.innerHTML = `
      <div class="empty-state-premium">
        <div class="empty-state-icon">Care</div>
        <div>${state.innerHTML}</div>
      </div>
    `;
  });
}

function elevateCards(workspace) {
  workspace.querySelectorAll('.panel, .record-card, .metric-card, .life-area-card').forEach((card) => {
    card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-2px)');
    card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
  });
}

function pulseWorkspace() {
  if (!shell) return;
  shell.classList.remove('os-pulse');
  requestAnimationFrame(() => shell.classList.add('os-pulse'));
}
