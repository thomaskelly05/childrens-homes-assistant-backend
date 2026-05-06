const root = document.documentElement;
const nav = document.getElementById('workspace-nav');
const main = document.getElementById('workspace-main');

if (window.innerWidth <= 900) {
  root.classList.add('mobile-care-mode');
}

window.addEventListener('resize', () => {
  if (window.innerWidth <= 900) root.classList.add('mobile-care-mode');
  else root.classList.remove('mobile-care-mode');
});

if (nav) {
  nav.addEventListener('click', (event) => {
    const button = event.target.closest("button[data-view='mobile']");
    if (!button) return;
    event.preventDefault();
    loadMobileShiftExperience();
  });
}

window.loadMobileShiftExperience = loadMobileShiftExperience;

function loadMobileShiftExperience() {
  if (!main) return;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  main.innerHTML = `
    <section class="mobile-shift-shell">
      <div class="mobile-shift-header">
        <p class="eyebrow">Live shift workspace</p>
        <h2>${greeting}, Sarah</h2>
        <p>Everything you need for this shift in one calm, mobile-first space.</p>
      </div>

      <section class="mobile-priority-card">
        <div>
          <span class="priority-pill high">Priority today</span>
          <h3>Child A appears emotionally overwhelmed after family contact.</h3>
          <p>Use calm communication, reduce demands and offer decompression time after school.</p>
        </div>
        <button type="button" class="primary-action">Open child</button>
      </section>

      <section class="mobile-action-grid">
        ${actionCard('💬','Child voice','Capture what the child said')}
        ${actionCard('🧠','Daily record','Quick therapeutic recording')}
        ${actionCard('⚠️','Safeguarding','Raise a concern quickly')}
        ${actionCard('🌟','Positive moment','Celebrate progress')}
        ${actionCard('📞','Contact update','Log family/contact impact')}
        ${actionCard('💊','Medication','Record medication support')}
      </section>

      <section class="mobile-feed-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Live home feed</p>
            <h3>What’s happening today</h3>
          </div>
        </div>

        ${feed('🌟','Child completed a full school session','Positive engagement improved after quieter morning transition.')}
        ${feed('💬','“I felt calmer today”','Child voice captured after direct work session.')}
        ${feed('🧠','Pattern emerging around school anxiety','Support plan review suggested by care intelligence.')}
      </section>

      <section class="mobile-checklist-card">
        <p class="eyebrow">Before ending shift</p>
        <h3>Shift reflection</h3>
        <div class="check-row done"><span>✔</span><div><strong>Emotional presentation updated</strong><p>Today's emotional state has been recorded.</p></div></div>
        <div class="check-row"><span>☐</span><div><strong>Complete handover</strong><p>Share emotional risks and safeguarding concerns.</p></div></div>
        <div class="check-row"><span>☐</span><div><strong>Reflective practice</strong><p>What did the child need from adults today?</p></div></div>
      </section>
    </section>
  `;
}

function actionCard(icon, title, text) {
  return `<button class="mobile-action-card"><span>${icon}</span><strong>${title}</strong><small>${text}</small></button>`;
}

function feed(icon, title, text) {
  return `<article class="mobile-feed-item"><div class="feed-icon">${icon}</div><div><strong>${title}</strong><p>${text}</p></div></article>`;
}
