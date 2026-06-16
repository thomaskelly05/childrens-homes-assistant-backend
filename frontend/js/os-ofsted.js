(async function(){
  const {getInspection,fallback}=window.IndiCareOSData;
  const root=document.querySelector('.ic-main');

  root.innerHTML=`<div class="ic-loader">Loading inspection data…</div>`;

  const data=await getInspection(1);

  const score=data.scores?.[0]?.overall_score||fallback.inspection.score;

  const domains=data.sections?.length
    ? data.sections.map(s=>[s.section_name||'Domain',s.record_count||0,s.score||50])
    : fallback.inspection.domains;

  const gaps=data.actions?.length
    ? data.actions.map(a=>[a.title||'Action',a.description||'',a.priority||'warning'])
    : fallback.inspection.gaps;

  root.innerHTML=`
    <div class="ic-page-head">
      <div>
        <h1>Inspection evidence preparation</h1>
        <p>Live SCCIF evidence and judgement support</p>
      </div>
      <div class="ofsted-score">
        <strong>${score}%</strong>
        <span>Ready</span>
      </div>
    </div>

    <div class="ofsted-map">
      ${domains.map(d=>`
        <div class="ofsted-domain">
          <div class="ofsted-domain-head">
            <h3>${d[0]}</h3>
            <span class="ic-chip">${d[1]} records</span>
          </div>
          <div class="ofsted-bar">
            <span style="width:${d[2]}%"></span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="ic-panel">
      <h2>Evidence gaps</h2>
      <div class="ic-stack">
        ${gaps.map(g=>`
          <div class="ic-item ${g[2]==='critical'?'ofsted-gap critical':'ofsted-gap'}">
            <strong>${g[0]}</strong>
            <p>${g[1]}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
})();