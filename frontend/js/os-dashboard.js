(() => {
  'use strict';

  let currentScope = 'staff';
  let currentDays = 30;
  let latestReport = null;

  const roleMeta = {
    staff: ['Staff daily view', 'What needs attention today, why it matters, and what to do next.'],
    manager: ['Manager home view', 'Home-level risk, recording quality, safeguarding and leadership actions.'],
    ri: ['Responsible Individual view', 'Multi-home assurance, Inspection evidence preparation and safeguarding oversight.'],
    provider: ['Provider view', 'Organisation-wide risk, trends and leadership focus.'],
  };

  function byId(id) { return document.getElementById(id); }
  function safe(value, fallback = '—') {
    if (value === null || value === undefined || value === '') return fallback;
    return String(value);
  }
  function number(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function setText(id, value, fallback = '—') {
    const el = byId(id);
    if (el) el.textContent = safe(value, fallback);
  }
  function clear(el) { if (el) el.textContent = ''; }
  function item(className, title, summary) {
    const div = document.createElement('div');
    div.className = className || '';
    const strong = document.createElement('strong');
    strong.textContent = safe(title, 'Review');
    div.appendChild(strong);
    if (summary) {
      const span = document.createElement('span');
      span.textContent = safe(summary);
      div.appendChild(span);
    }
    return div;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();
    if (!res.ok || json.ok === false) throw new Error(json.detail || json.error || `Request failed ${res.status}`);
    return json;
  }

  function init() {
    document.querySelectorAll('[data-scope]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-scope]').forEach((node) => node.classList.remove('active'));
        btn.classList.add('active');
        currentScope = btn.dataset.scope || 'staff';
        load();
      });
    });

    const days = byId('daysSelect');
    if (days) days.addEventListener('change', () => { currentDays = Number(days.value || 30); load(); });

    byId('generateReportBtn')?.addEventListener('click', () => {
      renderReportDialog();
      byId('reportDialog')?.showModal();
    });
    byId('copyReportBtn')?.addEventListener('click', async () => {
      const text = byId('reportBody')?.innerText || '';
      if (navigator.clipboard && text) await navigator.clipboard.writeText(text);
    });
    byId('printReportBtn')?.addEventListener('click', () => window.print());

    load();
  }

  async function load() {
    setText('statusText', 'Loading intelligence…');
    const meta = roleMeta[currentScope] || roleMeta.staff;
    setText('dashboardTitle', meta[0]);
    setText('dashboardSubtitle', meta[1]);

    try {
      const data = await fetchJson(`/os/intelligence/${currentScope}?days=${currentDays}`);
      latestReport = data.inspection_report || null;
      renderPriority(data);
      renderMetrics(data.summary || {});
      renderAlerts(data.alerts || []);
      renderActions(data.recommended_actions || []);
      renderSignals(data.predictive_signals || []);
      renderTrends(data.trends || []);
      renderHomes(data.ranked_homes || data.homes || []);
      renderInspection(data.inspection_report || {});
      setText('statusText', 'Up to date');
    } catch (error) {
      renderError(error.message);
      setText('statusText', 'Unable to load intelligence');
    }
  }

  function renderPriority(data) {
    const score = number(data.risk_score);
    const band = safe(data.risk_band, 'review').toLowerCase();
    const strip = byId('priorityStrip');
    if (strip) {
      strip.classList.remove('high', 'warning', 'review', 'strong', 'urgent', 'improving');
      strip.classList.add(band);
    }
    setText('riskScore', score);
    const highHomes = number(data.summary?.high_risk_homes);
    const alerts = Array.isArray(data.alerts) ? data.alerts.length : 0;
    const signals = Array.isArray(data.predictive_signals) ? data.predictive_signals.length : 0;
    setText('priorityTitle', `${band.toUpperCase()} risk — ${highHomes} high-risk home(s)`);
    setText('prioritySummary', `${alerts} live alert(s), ${signals} predictive signal(s), ${number(data.summary?.total_events)} evidence item(s) in this window.`);
  }

  function renderMetrics(summary) {
    setText('metricTotal', number(summary.total_events));
    setText('metricIncidents', number(summary.incidents));
    setText('metricSafeguarding', number(summary.safeguarding));
    setText('metricHighRisk', number(summary.high_risk_homes));
  }

  function renderAlerts(alerts) {
    const el = byId('alertsList');
    clear(el);
    if (!alerts.length) {
      el?.appendChild(item('review', 'No live alerts', 'No active risk alerts in this review window.'));
      return;
    }
    alerts.forEach((alert) => el?.appendChild(item(alert.level || 'review', alert.title, alert.summary)));
  }

  function renderActions(actions) {
    const el = byId('actionsList');
    if (!el) return;
    el.textContent = '';
    if (!actions.length) {
      const li = document.createElement('li');
      li.textContent = 'No recommended actions currently available.';
      el.appendChild(li);
      return;
    }
    actions.forEach((action) => {
      const li = document.createElement('li');
      li.textContent = safe(action);
      el.appendChild(li);
    });
  }

  function renderSignals(signals) {
    const el = byId('signalsList');
    clear(el);
    if (!signals.length) {
      el?.appendChild(item('review', 'No predictive warnings', 'No emerging risk pattern detected in this window.'));
      return;
    }
    signals.forEach((signal) => el?.appendChild(item(signal.level || 'warning', signal.title, signal.summary || signal.action)));
  }

  function renderTrends(trends) {
    const el = byId('trendChart');
    clear(el);
    if (!trends.length) {
      el?.appendChild(item('review', 'No trend data', 'There is not enough data to show trend movement yet.'));
      return;
    }
    const max = Math.max(1, ...trends.map((t) => number(t.total)));
    trends.forEach((trend) => {
      const row = document.createElement('div');
      row.className = 'trend-row';
      const label = document.createElement('span');
      label.textContent = safe(trend.label, 'Window');
      const bar = document.createElement('div');
      bar.className = 'trend-bar';
      const fill = document.createElement('span');
      fill.style.width = `${Math.max(4, Math.round((number(trend.total) / max) * 100))}%`;
      bar.appendChild(fill);
      const detail = document.createElement('small');
      detail.textContent = `${number(trend.total)} records · ${number(trend.incidents)} incidents · ${number(trend.safeguarding)} safeguarding`;
      row.appendChild(label); row.appendChild(bar); row.appendChild(detail);
      el?.appendChild(row);
    });
  }

  function renderHomes(homes) {
    const el = byId('homesList');
    clear(el);
    if (!homes.length) {
      el?.appendChild(item('review', 'No home data available', 'No home-level evidence is visible for this role and review window.'));
      return;
    }
    homes.forEach((home, index) => {
      const card = document.createElement('article');
      card.className = `home-card ${safe(home.alert_level, 'review').toLowerCase()}`;
      const rank = document.createElement('div');
      rank.className = 'home-rank';
      rank.textContent = String(index + 1);
      const body = document.createElement('div');
      const title = document.createElement('h4');
      title.textContent = safe(home.home_name, 'Unknown home');
      const summary = document.createElement('p');
      summary.textContent = `${number(home.incidents)} incidents · ${number(home.safeguarding)} safeguarding · ${number(home.missing_episodes)} missing · ${number(home.support_plans)} plans`;
      body.appendChild(title); body.appendChild(summary);
      const score = document.createElement('div');
      score.className = 'home-score';
      score.textContent = `${number(home.risk_score)}/100`;
      card.appendChild(rank); card.appendChild(body); card.appendChild(score);
      el?.appendChild(card);
    });
  }

  function renderInspection(report) {
    const el = byId('inspectionSummary');
    clear(el);
    const statement = document.createElement('p');
    statement.textContent = safe(report.risk_statement, 'Inspection summary will appear when intelligence data is available.');
    el?.appendChild(statement);
    const findings = Array.isArray(report.headline_findings) ? report.headline_findings : [];
    if (findings.length) {
      const ul = document.createElement('ul');
      findings.forEach((finding) => {
        const li = document.createElement('li');
        li.textContent = safe(finding);
        ul.appendChild(li);
      });
      el?.appendChild(ul);
    }
  }

  function renderReportDialog() {
    const body = byId('reportBody');
    clear(body);
    const report = latestReport || {};
    const title = document.createElement('h3');
    title.textContent = safe(report.title, 'IndiCare Inspection Summary');
    const risk = document.createElement('p');
    risk.textContent = safe(report.risk_statement, 'No risk statement available.');
    body?.appendChild(title); body?.appendChild(risk);
    const sections = [
      ['Headline findings', report.headline_findings],
      ['Challenge points', report.challenge_points],
      ['Recommended leadership actions', report.recommended_leadership_actions],
    ];
    sections.forEach(([heading, rows]) => {
      const h = document.createElement('h4');
      h.textContent = heading;
      const ul = document.createElement('ul');
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const li = document.createElement('li');
        li.textContent = safe(row);
        ul.appendChild(li);
      });
      body?.appendChild(h); body?.appendChild(ul);
    });
  }

  function renderError(message) {
    setText('priorityTitle', 'Unable to load operational intelligence');
    setText('prioritySummary', message || 'Check backend logs and authentication.');
    ['metricTotal', 'metricIncidents', 'metricSafeguarding', 'metricHighRisk', 'riskScore'].forEach((id) => setText(id, '—'));
    renderAlerts([{ level: 'high', title: 'Dashboard data unavailable', summary: message || 'The API did not return usable data.' }]);
    renderActions(['Check /health, /security/status and /os/intelligence/staff after redeploy.']);
    renderSignals([]); renderTrends([]); renderHomes([]); renderInspection({});
  }

  document.addEventListener('DOMContentLoaded', init);
})();
