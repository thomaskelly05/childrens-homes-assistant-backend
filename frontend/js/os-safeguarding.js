(async function(){
  const {getSelectedPerson,getChildBundle,name,id,fallback}=window.IndiCareOSData;
  const root=document.querySelector('.ic-main');

  root.innerHTML=`<div class="ic-loader">Loading safeguarding…</div>`;

  const person=await getSelectedPerson();
  const personId=id(person);
  const bundle=await getChildBundle(personId);

  const concerns=bundle.safeguarding?.length
    ? bundle.safeguarding
    : fallback.safeguarding;

  root.innerHTML=`
    <div class="ic-page-head">
      <div>
        <h1>${name(person)}</h1>
        <p>Safeguarding overview</p>
      </div>
    </div>

    <div class="ic-panel">
      <h2>Active concerns</h2>
      <div class="ic-stack">
        ${concerns.map(c=>`
          <div class="ic-item ${c.level==='high'?'critical':''}">
            <strong>${c.title||'Concern'}</strong>
            <p>${c.summary||c.detail||''}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
})();