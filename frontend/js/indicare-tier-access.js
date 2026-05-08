/* IndiCare standalone tier UI
   Reads /standalone-tiers/me and softly gates advanced intelligence without cluttering the UX. */

(function () {
  const FALLBACK = {
    tier: 'assistant',
    features: {
      docs: true,
      notes: true,
      projects: true,
      templates: true,
      exports: true,
      basic_chronology: true,
      basic_safeguarding_prompts: true,
      timeline_dock: false,
      inspection_workspace: false,
      operational_copilots: false,
      operational_search: false,
      readiness_scoring: false,
      evidence_gap_analysis: false,
      relationship_awareness: false,
      proactive_suggestions: false
    },
    locked: {}
  };

  function $(id) { return document.getElementById(id); }

  async function loadTier() {
    try {
      const response = await fetch('/standalone-tiers/me', { credentials: 'include' });
      if (!response.ok) throw new Error('tier unavailable');
      return await response.json();
    } catch {
      return { ok: true, ...FALLBACK };
    }
  }

  function featureEnabled(access, feature) {
    return Boolean(access?.features?.[feature]);
  }

  function applyTier(access) {
    document.body.dataset.indicareTier = access.tier || 'assistant';
    document.querySelectorAll('[data-tier-feature]').forEach((node) => {
      const feature = node.dataset.tierFeature;
      const enabled = featureEnabled(access, feature);
      node.classList.toggle('ic-feature-locked', !enabled);
      node.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      if (!enabled && !node.querySelector('.ic-lock-badge')) {
        const badge = document.createElement('span');
        badge.className = 'ic-lock-badge';
        const required = access.locked?.[feature]?.required_tier || 'higher';
        badge.textContent = `${required}`;
        node.appendChild(badge);
      }
    });

    const timelineDock = document.querySelector('.ic-live-timeline');
    if (timelineDock) {
      timelineDock.dataset.tierFeature = 'timeline_dock';
      timelineDock.classList.toggle('ic-feature-locked', !featureEnabled(access, 'timeline_dock'));
      if (!featureEnabled(access, 'timeline_dock')) {
        const list = $('suiteTimelineList');
        const alerts = $('suiteTimelineAlerts');
        if (alerts) alerts.innerHTML = '<span>Advanced chronology alerts unlock with Professional.</span>';
        if (list) list.innerHTML = '<p class="ic-muted-mini">Basic chronology is available in chat. Live timeline intelligence unlocks with Professional.</p>';
      }
    }

    const role = $('icUserRole');
    const roleSidebar = $('icUserRoleSidebar');
    const label = tierLabel(access.tier);
    if (role) role.textContent = label;
    if (roleSidebar) roleSidebar.textContent = label;
  }

  function tierLabel(tier) {
    const map = {
      assistant: 'Assistant tier',
      professional: 'Professional tier',
      enterprise: 'Enterprise tier'
    };
    return map[tier] || 'Assistant tier';
  }

  function handleLockedClick(event) {
    const locked = event.target.closest('.ic-feature-locked');
    if (!locked) return;
    const interactive = event.target.closest('button, a, input, textarea, select');
    if (!interactive && locked !== event.target) return;
    event.preventDefault();
    event.stopPropagation();
    showUpgradeNudge(locked.dataset.tierFeature || 'this feature');
  }

  function showUpgradeNudge(feature) {
    let toast = $('tierUpgradeToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tierUpgradeToast';
      toast.className = 'ic-tier-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<strong>Advanced intelligence</strong><span>${humanise(feature)} is available on a higher tier.</span>`;
    toast.classList.add('visible');
    window.clearTimeout(showUpgradeNudge.timer);
    showUpgradeNudge.timer = window.setTimeout(() => toast.classList.remove('visible'), 3600);
  }

  function humanise(value) {
    return String(value || 'This feature').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  window.IndiCareTierAccess = { loadTier, applyTier, featureEnabled };

  window.addEventListener('DOMContentLoaded', async () => {
    const access = await loadTier();
    applyTier(access);
    document.addEventListener('click', handleLockedClick, true);
  });
})();
