import {
  getOsContext,
  getOperationalSession,
  scopeContextToSession,
  escapeHtml,
  formatDate,
} from './indicare-os-context.js';

const ACADEMY = [
  {
    id: 'safeguarding-foundations',
    title: 'Safeguarding Foundations',
    category: 'Safeguarding',
    duration: '45 mins',
    level: 'Core',
    description: 'Residential safeguarding, escalation pathways, contextual safeguarding and recording expectations.',
  },
  {
    id: 'child-voice-recording',
    title: 'Child Voice & Recording',
    category: 'Recording',
    duration: '30 mins',
    level: 'Operational',
    description: 'Writing calm, reflective and evidence-based records using trauma-informed language.',
  },
  {
    id: 'missing-from-home',
    title: 'Missing From Home Response',
    category: 'Missing Episodes',
    duration: '35 mins',
    level: 'Advanced',
    description: 'Operational response, chronology linkage and return-home conversations.',
  },
  {
    id: 'manager-review-quality',
    title: 'Manager Review & Quality Assurance',
    category: 'Leadership',
    duration: '40 mins',
    level: 'Manager',
    description: 'How to review records, request amendments and evidence management oversight.',
  },
];

const PEOPLE_STATE = {
  adults: [],
};

bootPeopleAcademy();

function bootPeopleAcademy() {
  window.addEventListener('indicare:os-context-ready', renderEnhancements);
  window.addEventListener('indicare:refresh-live-os', renderEnhancements);
  document.addEventListener('click', handleClicks, true);
  const observer = new MutationObserver(() => renderEnhancements());
  observer.observe(document.body, { childList: true, subtree: true });
  renderEnhancements();
}

function renderEnhancements() {
  renderAdultsPanel();
  renderAcademyPanel();
}

function renderAdultsPanel() {
  const main = document.getElementById('sp-main');
  if (!main) return;
  const title = main.querySelector('.sp-page-head h1')?.textContent?.trim();
  if (title !== 'Dashboard') return;

  const existing = main.querySelector('[data-os-adults-panel]');
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const adults = buildAdults(context);
  PEOPLE_STATE.adults = adults;

  const html = `
    <section class="sp-card" data-os-adults-panel>
      <div class="sp-card-head">
        <div>
          <h2>Adults & professionals</h2>
          <p>Operational staff, managers and linked professionals connected to the current home and session.</p>
        </div>
      </div>
      <div class="os-adults-grid">
        ${adults.map((adult, index) => `
          <article class="os-adult-card">
            <div class="os-adult-top">
              <span class="sp-child-avatar">${escapeHtml(initials(adult.name))}</span>
              <div>
                <strong>${escapeHtml(adult.name)}</strong>
                <small>${escapeHtml(adult.role)}</small>
              </div>
            </div>
            <div class="os-adult-meta">
              <p><span>Home</span><strong>${escapeHtml(adult.home)}</strong></p>
              <p><span>Shift</span><strong>${escapeHtml(adult.shift)}</strong></p>
              <p><span>Last active</span><strong>${escapeHtml(formatDate(adult.lastActive, 'Today'))}</strong></p>
            </div>
            <div class="os-adult-actions">
              <button type="button" class="sp-secondary" data-open-adult-profile="${index}">Open profile</button>
              <button type="button" class="sp-primary" data-message-adult="${index}">Message</button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>`;

  if (existing) existing.outerHTML = html;
  else main.insertAdjacentHTML('beforeend', html);
}

function renderAcademyPanel() {
  const rail = document.getElementById('ic-os-context-rail-body');
  if (!rail || rail.querySelector('[data-os-academy]')) return;

  rail.insertAdjacentHTML('beforeend', `
    <section class="os-rail-section" data-os-academy>
      <h3>IndiCare Academy</h3>
      <div class="os-academy-list">
        ${ACADEMY.map((course) => `
          <button type="button" class="os-academy-card" data-open-academy="${escapeHtml(course.id)}">
            <strong>${escapeHtml(course.title)}</strong>
            <span>${escapeHtml(course.category)} · ${escapeHtml(course.duration)}</span>
            <small>${escapeHtml(course.description)}</small>
            <em>${escapeHtml(course.level)}</em>
          </button>
        `).join('')}
      </div>
    </section>
  `);
}

function buildAdults(context) {
  const session = getOperationalSession();
  const staff = [
    ...arrayFrom(context.workforce),
    ...arrayFrom(context.staff),
    ...arrayFrom(context.users),
  ];

  if (staff.length) {
    return dedupeAdults(staff).slice(0, 8).map((person) => ({
      name: person.name || person.full_name || [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email || 'Staff member',
      role: person.role || person.job_title || person.position || 'Residential staff',
      home: person.home_name || session?.homeName || 'Operational home',
      shift: person.shift || person.shift_type || person.current_shift || 'Current shift',
      lastActive: person.last_active || person.updated_at || person.created_at || new Date().toISOString(),
      email: person.email || '',
      phone: person.phone || person.mobile || '',
      status: person.status || person.availability || 'Available',
      raw: person,
    }));
  }

  return [
    {
      name: 'Shift Lead',
      role: 'Residential Team Leader',
      home: session?.homeName || 'Selected home',
      shift: 'Current shift',
      lastActive: new Date().toISOString(),
      email: '',
      phone: '',
      status: 'Fallback profile',
      raw: {},
    },
  ];
}

function handleClicks(event) {
  const profile = event.target.closest('[data-open-adult-profile]');
  if (profile) {
    event.preventDefault();
    openAdultProfile(Number(profile.dataset.openAdultProfile));
    return;
  }

  const message = event.target.closest('[data-message-adult]');
  if (message) {
    event.preventDefault();
    openAdultMessage(Number(message.dataset.messageAdult));
    return;
  }

  const academy = event.target.closest('[data-open-academy]');
  if (!academy) return;

  event.preventDefault();
  const course = ACADEMY.find((item) => item.id === academy.dataset.openAcademy);
  if (!course) return;
  openAssistantPrompt(`Open an IndiCare Academy learning session for ${course.title}. Include operational examples for residential children's homes, safeguarding considerations, recording expectations and reflective practice guidance.`);
}

function openAdultProfile(index) {
  const adult = PEOPLE_STATE.adults[index];
  if (!adult) return;
  const main = document.getElementById('sp-main');
  if (!main) return;
  main.innerHTML = `
    <section class="record-view-hero indicare-doc-hero">
      <div>
        <button class="sp-back" type="button" data-sp-view="dashboard">‹ Back to dashboard</button>
        <span class="record-kicker">Adults & professionals</span>
        <h1>${escapeHtml(adult.name)}</h1>
        <p>${escapeHtml(adult.role)} · ${escapeHtml(adult.home)} · ${escapeHtml(adult.status)}</p>
      </div>
      <div class="record-view-actions">
        <button class="sp-secondary" type="button" data-message-adult="${index}">Message</button>
        <button class="sp-primary" type="button" data-open-adult-academy="${index}">Assign learning</button>
      </div>
    </section>
    <section class="record-view-grid">
      <article class="record-paper indicare-doc-paper">
        <section class="record-section"><h2>Profile summary</h2><div class="record-field-list">
          <p><span>Name</span><strong>${escapeHtml(adult.name)}</strong></p>
          <p><span>Role</span><strong>${escapeHtml(adult.role)}</strong></p>
          <p><span>Home</span><strong>${escapeHtml(adult.home)}</strong></p>
          <p><span>Shift</span><strong>${escapeHtml(adult.shift)}</strong></p>
          <p><span>Email</span><strong>${escapeHtml(adult.email || 'Not set')}</strong></p>
          <p><span>Phone</span><strong>${escapeHtml(adult.phone || 'Not set')}</strong></p>
        </div></section>
        <section class="record-section"><h2>Operational responsibilities</h2><div class="record-field-list">
          <p><span>Safeguarding</span><strong>Follow escalation pathways and record factual actions.</strong></p>
          <p><span>Recording</span><strong>Complete child-centred records and submit for manager review where required.</strong></p>
          <p><span>Handover</span><strong>Share significant events, risks and actions with the next shift.</strong></p>
        </div></section>
      </article>
      <aside class="record-context-panel">
        <section class="sp-card"><h2>Academy suggestions</h2>${academySuggestions()}</section>
        <section class="sp-card"><h2>Assistant support</h2><p>Use IndiCare AI to plan supervision, reflective practice or learning support for this staff member.</p></section>
      </aside>
    </section>`;
}

function openAdultMessage(index) {
  const adult = PEOPLE_STATE.adults[index];
  if (!adult) return;
  openAssistantPrompt(`Draft a professional operational message to ${adult.name}, ${adult.role}. Keep it clear, respectful and suitable for a children's home shift context.`);
}

function academySuggestions() {
  return `<div class="os-academy-list">${ACADEMY.map((course) => `<button type="button" class="os-academy-card" data-open-academy="${escapeHtml(course.id)}"><strong>${escapeHtml(course.title)}</strong><span>${escapeHtml(course.category)} · ${escapeHtml(course.duration)}</span><small>${escapeHtml(course.description)}</small><em>${escapeHtml(course.level)}</em></button>`).join('')}</div>`;
}

function openAssistantPrompt(prompt) {
  document.querySelector('.sp-ai-bubble')?.click();
  setTimeout(() => {
    const input = document.getElementById('ic-assistant-input');
    if (!input) return;
    input.value = prompt;
    document.getElementById('ic-send-assistant')?.click();
  }, 160);
}

function dedupeAdults(staff) {
  const seen = new Set();
  return staff.filter((person) => {
    const key = String(person.id || person.user_id || person.email || person.name || person.full_name || Math.random());
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function arrayFrom(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.results)) return value.results;
  if (value && Array.isArray(value.data)) return value.data;
  return [];
}

function initials(value) {
  return String(value || 'A').split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join('').toUpperCase();
}
