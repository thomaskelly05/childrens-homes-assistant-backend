const mobile = window.matchMedia('(max-width: 920px)');

if (mobile.matches) {
  buildMobileShell();
}

mobile.addEventListener('change', (event) => {
  if (event.matches) buildMobileShell();
  else destroyMobileShell();
});

function buildMobileShell() {
  if (document.querySelector('.native-mobile-nav')) return;

  const nav = document.createElement('nav');
  nav.className = 'native-mobile-nav';
  nav.innerHTML = `
    ${mobileButton('🏠', 'Home', 'today-child')}
    ${mobileButton('👶', 'Journey', 'my-voice')}
    ${mobileButton('🧠', 'Insights', 'care-intelligence')}
    ${mobileButton('⚠️', 'Alerts', 'alerts')}
    ${mobileButton('👤', 'Profile', 'staff-profile')}
  `;

  const quickButton = document.createElement('button');
  quickButton.className = 'native-record-trigger';
  quickButton.type = 'button';
  quickButton.setAttribute('aria-label', 'Quick record');
  quickButton.innerHTML = '+';

  const overlay = document.createElement('div');
  overlay.className = 'quick-capture-overlay';
  overlay.innerHTML = `
    <div class="quick-capture-sheet">
      <div class="os-live-pill">Quick therapeutic recording</div>
      <h3>Capture what matters now</h3>
      <p>Fast recording designed around the child, not forms.</p>
      <div class="quick-capture-grid">
        ${captureCard('💬', 'Child voice', 'Capture words, feelings or communication', 'voice')}
        ${captureCard('🧠', 'Daily lived experience', 'Mood, routines, regulation and support', 'daily')}
        ${captureCard('⚠️', 'Safeguarding concern', 'Immediate concern or risk', 'safeguarding')}
        ${captureCard('🌟', 'Positive moment', 'Achievement, praise or success', 'positive')}
        ${captureCard('📞', 'Contact impact', 'How family contact affected the child', 'contact')}
        ${captureCard('🏃', 'Missing from care', 'Record missing episodes and return', 'missing')}
      </div>
    </div>
  `;

  document.body.append(nav, quickButton, overlay);

  quickButton.addEventListener('click', () => overlay.classList.toggle('open'));

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.classList.remove('open');
  });

  overlay.querySelectorAll('[data-record]').forEach((button) => {
    button.addEventListener('click', () => {
      overlay.classList.remove('open');
      const type = button.dataset.record;
      if (window.openWorkspaceForm) {
        window.openWorkspaceForm(type === 'voice' ? 'daily' : type, type);
      } else {
        document.getElementById('new-record-button')?.click();
      }
    });
  });

  nav.querySelectorAll('button[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.querySelector(`.nav-item[data-view='${button.dataset.view}']`);
      if (target) target.click();
      nav.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
  });
}

function destroyMobileShell() {
  document.querySelector('.native-mobile-nav')?.remove();
  document.querySelector('.native-record-trigger')?.remove();
  document.querySelector('.quick-capture-overlay')?.remove();
}

function mobileButton(icon, label, view) {
  return `<button type="button" data-view="${view}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`;
}

function captureCard(icon, title, text, type) {
  return `<button type="button" class="quick-capture-card" data-record="${type}"><div><strong>${icon} ${title}</strong><p>${text}</p></div><span>Open</span></button>`;
}
