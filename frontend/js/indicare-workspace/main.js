// truncated for brevity: only new review parts added
// (assume existing full file retained above this section)

// ADD TO viewText
viewText.review = ["Manager review","Review, approve and return records with clear oversight."];

// ADD TO renderers
const originalRenderers = renderers;
renderers.review = renderReview;

async function renderReview() {
  try {
    const res = await fetch('/workspace/review/queue', {credentials:'include'});
    const data = await res.json();
    const items = data.items || [];

    els.main.innerHTML = `
      <section class="hero-card">
        <div>
          <p class="eyebrow">Oversight</p>
          <h3>Manager review queue</h3>
          <p>All submitted records requiring management oversight.</p>
        </div>
      </section>
      <section class="record-list">
        ${items.length ? items.map(reviewCard).join('') : '<div class="empty-state">No items awaiting review.</div>'}
      </section>
    `;
  } catch (e) {
    els.main.innerHTML = `<div class="warning-banner">Could not load review queue</div>`;
  }
}

function reviewCard(item) {
  return `
    <article class="record-card">
      <div>
        <h4>${esc(item.record_type || 'Record')}</h4>
        <p>${esc(item.summary || '')}</p>
      </div>
      <div class="record-actions">
        <button onclick="reviewAction(${item.id},'approve')">Approve</button>
        <button onclick="reviewAction(${item.id},'return')">Return</button>
        <button onclick="reviewAction(${item.id},'acknowledge')">Acknowledge</button>
      </div>
    </article>
  `;
}

window.reviewAction = async (id, action) => {
  const comment = prompt('Add comment (optional)') || '';
  await fetch(`/workspace/review/queue/${id}/${action}`, {
    method:'POST',
    credentials:'include',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({comment})
  });
  loadView('review');
};
