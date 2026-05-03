(() => {
  function addLink(container, href, title, subtitle) {
    if (!container) return;
    const link = document.createElement('a');
    link.href = href;
    link.style.display = 'block';
    link.style.padding = '12px 14px';
    link.style.marginTop = '8px';
    link.style.border = '1px solid rgba(255,255,255,.16)';
    link.style.borderRadius = '14px';
    link.style.textDecoration = 'none';
    link.style.color = 'inherit';

    const strong = document.createElement('span');
    strong.textContent = title;
    strong.style.display = 'block';
    strong.style.fontWeight = '700';

    const small = document.createElement('small');
    small.textContent = subtitle;
    small.style.display = 'block';
    small.style.opacity = '.75';

    link.appendChild(strong);
    link.appendChild(small);
    container.appendChild(link);
  }

  async function loadStaffAlert() {
    const footer = document.querySelector('.yp-sidebar-footer');
    if (!footer) return;

    addLink(footer, '/my-profile', 'My Profile', 'Training, supervision and actions');
    addLink(footer, '/staff-profiles', 'Staff Hub', 'Team learning and oversight');

    try {
      const res = await fetch('/staff/me', { credentials: 'include' });
      const json = await res.json();
      const data = json.data || {};
      const intelligence = ((data.academy || {}).intelligence) || {};
      const score = intelligence.priority_score || 0;
      const needs = intelligence.learning_needs || [];
      const actions = data.manager_actions || [];

      const card = document.createElement('div');
      card.style.marginTop = '10px';
      card.style.padding = '12px';
      card.style.borderRadius = '14px';
      card.style.background = 'rgba(255,255,255,.08)';
      card.style.fontSize = '13px';

      const title = document.createElement('strong');
      title.textContent = 'My attention score: ' + score;
      const details = document.createElement('span');
      details.textContent = needs.length + ' learning needs | ' + actions.length + ' actions';
      details.style.display = 'block';

      card.appendChild(title);
      card.appendChild(details);
      footer.appendChild(card);
    } catch (error) {}
  }

  document.addEventListener('DOMContentLoaded', loadStaffAlert);
})();
