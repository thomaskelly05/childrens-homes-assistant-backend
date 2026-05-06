(async function(){
  const {getSelectedPerson,getChildBundle,name,id,recordCard,fallback}=window.IndiCareOSData;
  const root=document.querySelector('.ic-main');

  root.innerHTML=`<div class="ic-loader">Loading child data…</div>`;

  const person=await getSelectedPerson();
  const personId=id(person);
  const bundle=await getChildBundle(personId);

  const records=[
    ...(bundle.daily||[]),
    ...(bundle.incidents||[]),
    ...(bundle.health||[]),
    ...(bundle.education||[])
  ];

  const cards=records.length
    ? records.map(recordCard).join('')
    : fallback.daily.map(recordCard).join('');

  root.innerHTML=`
    <div class="child-hero">
      <h1>${name(person)}</h1>
      <p>Live care record and overview</p>
      <div class="child-profile-strip">
        <div><span>Age</span><strong>${person.age||'-'}</strong></div>
        <div><span>Risk</span><strong>${person.summary_risk_level||'-'}</strong></div>
        <div><span>Key worker</span><strong>${person.key_worker||'-'}</strong></div>
        <div><span>Status</span><strong>${person.placement_status||'-'}</strong></div>
      </div>
    </div>

    <div class="ic-record-grid">
      ${cards}
    </div>
  `;
})();