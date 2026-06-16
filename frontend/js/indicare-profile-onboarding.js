/* IndiCare AI profile, settings and onboarding
   Clean first-run setup for standalone IndiCare AI.
*/

(function () {
  const PROFILE_KEY = 'indicare_ai_profile';
  const ONBOARDING_KEY = 'indicare_ai_onboarding_complete';

  const DEFAULT_PROFILE = {
    name: 'Tom',
    role: 'Registered Manager',
    organisation: '',
    defaultMode: 'ofsted',
    tone: 'professional',
    experience: 'manager',
    plan: 'Professional plan'
  };

  function $(id) {
    return document.getElementById(id);
  }

  function profile() {
    try {
      return { ...DEFAULT_PROFILE, ...(JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')) };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  function saveProfile(next) {
    const updated = { ...profile(), ...next };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    applyProfile(updated);
    return updated;
  }

  function onboardingComplete() {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  }

  function completeOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  }

  function injectStyles() {
    if ($('icProfileOnboardingStyles')) return;

    const style = document.createElement('style');
    style.id = 'icProfileOnboardingStyles';
    style.textContent = `
      .ic-profile-onboarding {
        position: fixed;
        inset: 0;
        z-index: 6000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(248, 251, 255, .92);
        backdrop-filter: blur(16px);
      }

      .ic-profile-onboarding.visible {
        display: flex;
      }

      .ic-onboarding-card {
        width: min(760px, 100%);
        border: 1px solid var(--ic-clean-border, #e6edf6);
        border-radius: 30px;
        background: #fff;
        box-shadow: 0 30px 90px rgba(15,31,58,.16);
        overflow: hidden;
      }

      .ic-onboarding-main {
        padding: clamp(24px, 5vw, 44px);
      }

      .ic-onboarding-logo {
        width: 58px;
        height: 58px;
        display: grid;
        place-items: center;
        border-radius: 20px;
        color: #fff;
        font-weight: 900;
        background: linear-gradient(135deg,#0b6fff,#7aa8ff);
        box-shadow: 0 18px 40px rgba(11,111,255,.25);
        margin-bottom: 24px;
      }

      .ic-onboarding-main h2 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3rem);
        letter-spacing: -.065em;
        line-height: 1.03;
        color: #0f1f3a;
      }

      .ic-onboarding-main p {
        margin: 12px 0 0;
        color: #65748b;
        line-height: 1.6;
        max-width: 590px;
      }

      .ic-onboarding-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 28px;
      }

      .ic-onboarding-form label {
        display: grid;
        gap: 7px;
        color: #334155;
        font-size: .82rem;
        font-weight: 800;
      }

      .ic-onboarding-form input,
      .ic-onboarding-form select,
      .ic-settings-grid input,
      .ic-settings-grid select {
        width: 100%;
        border: 1px solid #e6edf6;
        border-radius: 14px;
        padding: 12px 13px;
        outline: none;
        font: inherit;
        background: #fff;
        color: #0f1f3a;
      }

      .ic-onboarding-form input:focus,
      .ic-onboarding-form select:focus,
      .ic-settings-grid input:focus,
      .ic-settings-grid select:focus {
        border-color: rgba(11,111,255,.45);
        box-shadow: 0 0 0 4px rgba(11,111,255,.08);
      }

      .ic-onboarding-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 18px 22px;
        border-top: 1px solid #e6edf6;
        background: #fbfdff;
      }

      .ic-onboarding-actions small {
        color: #65748b;
        line-height: 1.4;
      }

      .ic-onboarding-actions button,
      .ic-settings-secondary {
        border: 1px solid #e6edf6;
        background: #fff;
        color: #334155;
        border-radius: 999px;
        padding: 10px 14px;
        font-weight: 850;
      }

      .ic-onboarding-actions .primary,
      .ic-profile-save-primary {
        border-color: #0b6fff;
        background: #0b6fff;
        color: #fff;
        box-shadow: 0 14px 32px rgba(11,111,255,.22);
      }

      .ic-profile-section-title {
        grid-column: 1 / -1;
        margin: 10px 0 0;
        color: #65748b;
        font-size: .72rem;
        text-transform: uppercase;
        letter-spacing: .09em;
        font-weight: 900;
      }

      .ic-settings-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .ic-settings-grid label {
        display: grid;
        gap: 7px;
        font-size: .82rem;
        font-weight: 800;
        color: #334155;
      }

      .ic-modal-card {
        width: min(680px, calc(100vw - 28px)) !important;
      }

      .ic-profile-plan-card {
        grid-column: 1 / -1;
        border: 1px solid #e6edf6;
        border-radius: 18px;
        padding: 14px;
        background: #fbfdff;
      }

      .ic-profile-plan-card strong {
        display: block;
        color: #0f1f3a;
      }

      .ic-profile-plan-card span {
        display: block;
        margin-top: 4px;
        color: #65748b;
        font-size: .8rem;
        line-height: 1.45;
      }

      @media (max-width: 700px) {
        .ic-onboarding-form,
        .ic-settings-grid {
          grid-template-columns: 1fr;
        }

        .ic-onboarding-actions {
          align-items: stretch;
          flex-direction: column;
        }

        .ic-onboarding-actions button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureOnboarding() {
    if ($('icProfileOnboarding')) return;

    const current = profile();
    const overlay = document.createElement('section');
    overlay.id = 'icProfileOnboarding';
    overlay.className = 'ic-profile-onboarding';
    overlay.setAttribute('aria-label', 'Set up IndiCare AI profile');
    overlay.innerHTML = `
      <div class="ic-onboarding-card">
        <div class="ic-onboarding-main">
          <div class="ic-onboarding-logo">AI</div>
          <h2>Set up IndiCare AI</h2>
          <p>Personalise the assistant around your role, tone and residential care workflow. You can change this anytime in settings.</p>

          <form id="icProfileOnboardingForm" class="ic-onboarding-form">
            <label>Name
              <input name="name" value="${escapeHtml(current.name)}" autocomplete="given-name" />
            </label>

            <label>Role
              <select name="role">
                ${option('Registered Manager', current.role)}
                ${option('Deputy Manager', current.role)}
                ${option('Responsible Individual', current.role)}
                ${option('Senior Residential Worker', current.role)}
                ${option('Residential Worker', current.role)}
                ${option('Provider Lead', current.role)}
              </select>
            </label>

            <label>Organisation or home
              <input name="organisation" value="${escapeHtml(current.organisation)}" placeholder="Optional" />
            </label>

            <label>Default focus
              <select name="defaultMode">
                ${option('ofsted', current.defaultMode, 'Inspection and Ofsted')}
                ${option('safeguarding', current.defaultMode, 'Safeguarding')}
                ${option('records', current.defaultMode, 'Recording quality')}
                ${option('operations', current.defaultMode, 'Operations')}
              </select>
            </label>

            <div class="ic-profile-section-title">Assistant style</div>

            <label>Tone
              <select name="tone">
                ${option('professional', current.tone, 'Professional')}
                ${option('supportive', current.tone, 'Supportive')}
                ${option('concise', current.tone, 'Concise')}
                ${option('inspection evidence preparation', current.tone, 'inspection evidence preparation')}
              </select>
            </label>

            <label>Experience level
              <select name="experience">
                ${option('new', current.experience, 'New to residential care')}
                ${option('experienced', current.experience, 'Experienced practitioner')}
                ${option('manager', current.experience, 'Manager / leader')}
                ${option('provider', current.experience, 'Provider / executive')}
              </select>
            </label>
          </form>
        </div>

        <div class="ic-onboarding-actions">
          <small>IndiCare AI keeps the interface calm and only surfaces operational intelligence when it helps your work.</small>
          <div>
            <button type="button" id="icSkipOnboarding">Skip</button>
            <button type="button" class="primary" id="icCompleteOnboarding">Start using IndiCare AI</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function option(value, selected, label) {
    return `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label || value)}</option>`;
  }

  function showOnboarding(force = false) {
    ensureOnboarding();
    if (force || !onboardingComplete()) {
      $('icProfileOnboarding')?.classList.add('visible');
    }
  }

  function hideOnboarding() {
    $('icProfileOnboarding')?.classList.remove('visible');
  }

  function readForm(form) {
    const data = new FormData(form);
    return {
      name: String(data.get('name') || '').trim() || 'Assistant user',
      role: String(data.get('role') || '').trim() || 'Residential care professional',
      organisation: String(data.get('organisation') || '').trim(),
      defaultMode: String(data.get('defaultMode') || 'ofsted'),
      tone: String(data.get('tone') || 'professional'),
      experience: String(data.get('experience') || 'manager')
    };
  }

  function applyProfile(current = profile()) {
    const initials = initialsFrom(current.name);
    setText('icUserName', current.name);
    setText('icUserNameSidebar', current.name);
    setText('icUserRole', current.plan || 'Professional plan');
    setText('icUserRoleSidebar', current.plan || 'Professional plan');
    setText('icUserAvatar', initials);
    setText('icUserAvatarSidebar', initials);

    const greeting = document.querySelector('.ic-empty-state h2');
    if (greeting && !greeting.dataset.customGreetingLocked) {
      greeting.textContent = greetingText(current.name);
    }

    const description = $('workspaceDescription');
    if (description) {
      description.textContent = descriptionFor(current);
    }

    populateSettings(current);
  }

  function greetingText(name) {
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${period}, ${firstName(name)}`;
  }

  function descriptionFor(current) {
    const mode = current.defaultMode;
    if (mode === 'safeguarding') return 'How can I support safeguarding thinking, recording and follow-up today?';
    if (mode === 'records') return 'How can I help improve recording quality today?';
    if (mode === 'operations') return 'How can I support your home’s operational work today?';
    return 'How can I help with your residential care work today?';
  }

  function firstName(name) {
    return String(name || 'there').trim().split(/\s+/)[0] || 'there';
  }

  function initialsFrom(name) {
    return String(name || 'AI')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'AI';
  }

  function setText(id, text) {
    const node = $(id);
    if (node) node.textContent = text;
  }

  function enhanceSettingsModal() {
    const grid = document.querySelector('.ic-settings-grid');
    if (!grid || grid.dataset.profileEnhanced === 'true') return;

    grid.dataset.profileEnhanced = 'true';
    grid.innerHTML = `
      <label><span>Name</span><input id="settingsName" type="text" placeholder="Your name" /></label>
      <label><span>Role</span>
        <select id="settingsRole">
          <option>Registered Manager</option>
          <option>Deputy Manager</option>
          <option>Responsible Individual</option>
          <option>Senior Residential Worker</option>
          <option>Residential Worker</option>
          <option>Provider Lead</option>
        </select>
      </label>
      <label><span>Organisation or home</span><input id="settingsOrganisation" type="text" placeholder="Optional" /></label>
      <label><span>Default focus</span>
        <select id="settingsDefaultMode">
          <option value="ofsted">Inspection and Ofsted</option>
          <option value="safeguarding">Safeguarding</option>
          <option value="records">Recording quality</option>
          <option value="operations">Operations</option>
        </select>
      </label>
      <label><span>Tone</span>
        <select id="settingsTone">
          <option value="professional">Professional</option>
          <option value="supportive">Supportive</option>
          <option value="concise">Concise</option>
          <option value="inspection evidence preparation">inspection evidence preparation</option>
        </select>
      </label>
      <label><span>Experience level</span>
        <select id="settingsExperience">
          <option value="new">New to residential care</option>
          <option value="experienced">Experienced practitioner</option>
          <option value="manager">Manager / leader</option>
          <option value="provider">Provider / executive</option>
        </select>
      </label>
      <div class="ic-profile-plan-card">
        <strong id="settingsPlanLabel">Professional plan</strong>
        <span>Plan controls which intelligence layers are available across IndiCare AI.</span>
      </div>
      <button type="button" class="ic-settings-secondary" id="restartOnboarding">Restart onboarding</button>
    `;
  }

  function populateSettings(current = profile()) {
    enhanceSettingsModal();
    setValue('settingsName', current.name);
    setValue('settingsRole', current.role);
    setValue('settingsOrganisation', current.organisation);
    setValue('settingsDefaultMode', current.defaultMode);
    setValue('settingsTone', current.tone);
    setValue('settingsExperience', current.experience);
    setText('settingsPlanLabel', current.plan || 'Professional plan');
  }

  function setValue(id, value) {
    const node = $(id);
    if (node) node.value = value || '';
  }

  function saveSettings() {
    saveProfile({
      name: $('settingsName')?.value || DEFAULT_PROFILE.name,
      role: $('settingsRole')?.value || DEFAULT_PROFILE.role,
      organisation: $('settingsOrganisation')?.value || '',
      defaultMode: $('settingsDefaultMode')?.value || DEFAULT_PROFILE.defaultMode,
      tone: $('settingsTone')?.value || DEFAULT_PROFILE.tone,
      experience: $('settingsExperience')?.value || DEFAULT_PROFILE.experience
    });
  }

  function bind() {
    document.addEventListener('click', (event) => {
      if (event.target.id === 'icCompleteOnboarding') {
        const form = $('icProfileOnboardingForm');
        if (form) saveProfile(readForm(form));
        completeOnboarding();
        hideOnboarding();
      }

      if (event.target.id === 'icSkipOnboarding') {
        completeOnboarding();
        hideOnboarding();
      }

      if (event.target.id === 'saveSettings') {
        saveSettings();
      }

      if (event.target.id === 'openSettings') {
        populateSettings();
      }

      if (event.target.id === 'restartOnboarding') {
        showOnboarding(true);
      }
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.IndiCareProfile = {
    profile,
    saveProfile,
    applyProfile,
    showOnboarding
  };

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    enhanceSettingsModal();
    ensureOnboarding();
    applyProfile();
    bind();
    setTimeout(() => showOnboarding(false), 700);
  });
})();
