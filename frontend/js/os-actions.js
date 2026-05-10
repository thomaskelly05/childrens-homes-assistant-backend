(async function(){
  const {getActions,updateAction}=window.IndiCareOSData;
  const root=document.querySelector('.ic-main');

  root.innerHTML=`<div class="ic-loader">Loading actions…</div>`;

  const actions=await getActions({scope:'home'});

  const groups={open:[],in_progress:[],overdue:[],completed:[]};
  actions.forEach(a=>{(groups[a.status]||groups.open).push(a)});

  function renderColumn(title,list){
    return `
      <div class="action-column">
        <h2>${title}</h2>
        ${list.map(a=>`
          <div class="action-card ${a.priority}">
            <h3>${a.title}</h3>
            <p>${a.summary||''}</p>
            <div class="action-card-footer">
              <span class="ic-chip">${a.status}</span>
              ${a.due_date?`<span class="ic-chip">Due ${a.due_date}</span>`:''}
              ${a.status!=='completed'?`<button class="ic-btn primary" data-complete="${a.id}">Complete</button>`:''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  root.innerHTML=`
    <div class="ic-page-head">
      <h1>Actions</h1>
      <p>All operational actions across the home</p>
    </div>

    <div class="action-board">
      ${renderColumn('Open',groups.open)}
      ${renderColumn('In Progress',groups.in_progress)}
      ${renderColumn('Overdue',groups.overdue)}
      ${renderColumn('Completed',groups.completed)}
    </div>
  `;

  root.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-complete]');
    if(!btn)return;
    const id=btn.dataset.complete;
    btn.textContent='Updating…';
    await updateAction(id,{status:'completed'});
    btn.textContent='Done';
    btn.disabled=true;
  });
})();