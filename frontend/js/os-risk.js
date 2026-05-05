(async function(){
  const {getSelectedPerson,getChildBundle,name,id,fallback}=window.IndiCareOSData;
  const root=document.querySelector('.ic-main');

  root.innerHTML=`<div class="ic-loader">Loading risk data…</div>`;

  const person=await getSelectedPerson();
  const personId=id(person);
  const bundle=await getChildBundle(personId);

  const risks=bundle.riskRecords?.length
    ? bundle.riskRecords
    : fallback.risk;

  root.innerHTML=`
    <div class="ic-page-head">
      <div>
        <h1>${name(person)} Risk Profile</h1>
        <p>Live understanding of risk</p>
      </div>
      <div class="risk-level">${person.summary_risk_level||'Unknown'}</div>
    </div>

    <div class="risk-grid">
      ${risks.map(r=>`
        <div class="risk-box">
          <h3>${r.area||r.risk_type||'Risk area'}</h3>
          <span class="risk-tag risk-${(r.level||'low').toLowerCase()}">${r.level||'Low'}</span>
        </div>
      `).join('')}
    </div>
  `;
})();