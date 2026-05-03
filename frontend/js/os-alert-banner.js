(() => {
  function makeBanner(payload) {
    const existing = document.getElementById('indicareLiveAlertBanner');
    if (existing) existing.remove();

    const banner = payload && payload.banner ? payload.banner : null;
    if (!banner || !banner.visible) return;

    const el = document.createElement('section');
    el.id = 'indicareLiveAlertBanner';
    el.setAttribute('role', 'alert');
    el.style.position = 'sticky';
    el.style.top = '0';
    el.style.zIndex = '9999';
    el.style.margin = '0';
    el.style.padding = '12px 18px';
    el.style.background = banner.level === 'critical' ? '#7f1d1d' : '#92400e';
    el.style.color = '#ffffff';
    el.style.boxShadow = '0 12px 30px rgba(0,0,0,.18)';

    const link = document.createElement('a');
    link.href = '/os-dashboard';
    link.style.color = '#ffffff';
    link.style.textDecoration = 'none';
    link.style.display = 'flex';
    link.style.justifyContent = 'space-between';
    link.style.gap = '12px';
    link.style.alignItems = 'center';

    const copy = document.createElement('span');
    copy.innerHTML = '<strong>' + banner.title + '</strong> - ' + banner.message;

    const action = document.createElement('span');
    action.textContent = 'Open dashboard';
    action.style.fontWeight = '800';

    link.appendChild(copy);
    link.appendChild(action);
    el.appendChild(link);
    document.body.prepend(el);
  }

  async function loadAlerts() {
    try {
      let url = '/alerts/me';
      const homeId = document.body.dataset.homeId || new URLSearchParams(location.search).get('home_id');
      if (homeId) url = '/alerts/home/' + encodeURIComponent(homeId);
      const res = await fetch(url, { credentials: 'include' });
      const payload = await res.json();
      makeBanner(payload);
    } catch (error) {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadAlerts();
    window.setInterval(loadAlerts, 30000);
  });
})();
