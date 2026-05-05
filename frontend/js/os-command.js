const app=document.getElementById('app');app.innerHTML=`
<div class="ic-page-head">
<div><h1>Home Overview</h1><p>Everything you need to know right now</p></div>
<div class="ic-actions"><button class="ic-btn primary">Refresh</button></div>
</div>
<div class="ic-grid">
<div class="ic-card"><span>Children in home</span><strong>3</strong></div>
<div class="ic-card"><span>Open actions</span><strong>5</strong></div>
<div class="ic-card"><span>Incidents</span><strong>1</strong></div>
<div class="ic-card"><span>Safeguarding</span><strong>0</strong></div>
</div>
<div class="ic-layout">
<div class="ic-panel"><h2>Priority actions</h2><div class="ic-stack">
<div class="ic-item warning"><strong>Incident review needed</strong><p>Manager review required</p></div>
<div class="ic-item"><strong>Daily note missing</strong><p>Evening record not completed</p></div>
</div></div>
<div class="ic-panel"><h2>Alerts</h2><div class="ic-stack">
<div class="ic-item info"><strong>No safeguarding alerts</strong></div>
</div></div>
</div>
`;