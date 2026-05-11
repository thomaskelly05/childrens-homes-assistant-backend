(()=>{
  const FLAG='__indicareExistingJourneyRuntimeBridge';
  if(window[FLAG])return;
  window[FLAG]=true;

  function mountRecycledPanels(){
    const main=document.getElementById('workspace-main');
    if(!main)return;

    let recycled=document.getElementById('ic-recycled-shell-panels');
    if(recycled)return;

    recycled=document.createElement('section');
    recycled.id='ic-recycled-shell-panels';
    recycled.className='ic365-continuity-grid';

    recycled.innerHTML=`
      <article class="ic365-continuity-panel">
        <h3>Recycled operational workflows</h3>
        <div class="ic365-continuity-list">
          <div class="ic365-continuity-item">
            <strong>Daily recording workflow</strong>
            <span>Existing chronology and care-recording routers mounted into the unified shell.</span>
          </div>
          <div class="ic365-continuity-item">
            <strong>Direct work workflow</strong>
            <span>Previous key work, outcomes and journey systems reused inside chronology continuity.</span>
          </div>
          <div class="ic365-continuity-item">
            <strong>Safeguarding workflow</strong>
            <span>Existing incident and safeguarding pattern systems recycled into the operational rail.</span>
          </div>
          <div class="ic365-continuity-item">
            <strong>Documents workflow</strong>
            <span>Inspection evidence, plans and linked documents connected into chronology review.</span>
          </div>
        </div>
      </article>

      <article class="ic365-continuity-panel">
        <h3>Connected journey areas</h3>
        <div class="ic365-focus-stack">
          <div class="ic365-focus-card">
            <strong>Child journey</strong>
            <p>Existing journey storytelling and chronology continuity structures reused.</p>
          </div>
          <div class="ic365-focus-card">
            <strong>Adults & staffing</strong>
            <p>Previous adults, staffing and workforce profile systems mounted into the shell.</p>
          </div>
          <div class="ic365-focus-card">
            <strong>Home oversight</strong>
            <p>Regulation, standards and inspection structures recycled into operational oversight.</p>
          </div>
          <div class="ic365-focus-card">
            <strong>Operational review</strong>
            <p>Existing review workflows embedded directly into chronology interaction layers.</p>
          </div>
        </div>
      </article>`;

    main.after(recycled);
  }

  function boot(){
    mountRecycledPanels();
    document.addEventListener('indicare:care-data-changed',mountRecycledPanels);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }
})();