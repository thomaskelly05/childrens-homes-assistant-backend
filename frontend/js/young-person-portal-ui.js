import {
  createYoungPersonActivityChoice,
  createYoungPersonEntry,
  createYoungPersonMemory,
  createYoungPersonPlan,
  getYoungPersonPortalData,
} from './young-person-portal-engine.js';

const panel = document.getElementById('ypPanel');
const childSelect = document.getElementById('ypChildId');

function currentChild() {
  return childSelect?.value || 'demo-child';
}

function renderFeelings() {
  panel.innerHTML = `
    <h2>How are you feeling?</h2>
    <div class="yp-actions">
      ${['happy','ok','sad','angry','worried'].map(m => `<button data-mood="${m}">${m}</button>`).join('')}
    </div>
  `;
  panel.querySelectorAll('[data-mood]').forEach(btn => {
    btn.addEventListener('click', () => {
      createYoungPersonEntry({ child_id: currentChild(), type: 'mood', mood: btn.dataset.mood });
      panel.innerHTML = `<p>Thanks for sharing 💙</p>`;
    });
  });
}

function renderVoice() {
  panel.innerHTML = `
    <h2>Say what matters</h2>
    <textarea id="ypVoiceText" placeholder="Write or tell us..."></textarea>
    <button id="ypVoiceSubmit">Send</button>
  `;
  document.getElementById('ypVoiceSubmit').onclick = () => {
    const text = document.getElementById('ypVoiceText').value;
    createYoungPersonEntry({ child_id: currentChild(), type: 'voice', body: text });
    panel.innerHTML = `<p>We’ve listened. Thank you 💙</p>`;
  };
}

function renderPlans() {
  panel.innerHTML = `
    <h2>My plan</h2>
    <textarea id="ypPlan" placeholder="What helps you?"></textarea>
    <button id="ypPlanSave">Save</button>
  `;
  document.getElementById('ypPlanSave').onclick = () => {
    createYoungPersonPlan({ child_id: currentChild(), what_helps: document.getElementById('ypPlan').value });
    panel.innerHTML = `<p>Saved 👍</p>`;
  };
}

function renderMemories() {
  panel.innerHTML = `
    <h2>Good memory</h2>
    <textarea id="ypMemory"></textarea>
    <button id="ypMemorySave">Save</button>
  `;
  document.getElementById('ypMemorySave').onclick = () => {
    createYoungPersonMemory({ child_id: currentChild(), body: document.getElementById('ypMemory').value });
    panel.innerHTML = `<p>Memory saved 🌟</p>`;
  };
}

function renderActivities() {
  panel.innerHTML = `
    <h2>What do you want to do?</h2>
    <input id="ypActivity" />
    <button id="ypActivitySave">Save</button>
  `;
  document.getElementById('ypActivitySave').onclick = () => {
    createYoungPersonActivityChoice({ child_id: currentChild(), title: document.getElementById('ypActivity').value });
    panel.innerHTML = `<p>Got it 👍</p>`;
  };
}

function renderFamily() {
  panel.innerHTML = `<h2>Family</h2><p>This will be built next.</p>`;
}

function route(panelName) {
  if (panelName === 'feelings') renderFeelings();
  if (panelName === 'voice') renderVoice();
  if (panelName === 'plans') renderPlans();
  if (panelName === 'memories') renderMemories();
  if (panelName === 'activities') renderActivities();
  if (panelName === 'family') renderFamily();
}

document.querySelectorAll('.yp-tile').forEach(btn => {
  btn.addEventListener('click', () => route(btn.dataset.panel));
});
