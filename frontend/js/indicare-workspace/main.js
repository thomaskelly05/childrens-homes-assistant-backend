// replace existing renderOfsted function
function renderOfsted() {
  els.main.innerHTML = skeleton();

  fetch("/workspace/ofsted-evidence/home", { credentials: "include" })
    .then(r => r.json())
    .then(data => {
      if (!data.ok) throw new Error(data.error || "Failed to load evidence");

      const sections = data.judgement_sections || {};

      els.main.innerHTML = `
        <section class="hero-card">
          <div>
            <p class="eyebrow">Inspection ready</p>
            <h3>Ofsted evidence overview</h3>
            <p>Live evidence mapped to inspection judgement areas.</p>
          </div>
          <span class="score-pill">${data.summary?.total_cards || 0} evidence items</span>
        </section>

        ${Object.values(sections).map(section => `
          <section class="panel">
            <h3>${section.title}</h3>
            ${section.cards.map(card => `
              <div class="record-card">
                <div>
                  <h4>${card.title}</h4>
                  <p>${card.statement}</p>
                  <small>${card.impact}</small>
                </div>
                <span class="mini-tag">${card.strength}</span>
              </div>
            `).join("")}
          </section>
        `).join("")}

        <section class="panel">
          <h3>Identified gaps</h3>
          ${data.gaps.length ? `
            <ul class="clean-list">
              ${data.gaps.map(g => `<li><strong>${g.area}:</strong> ${g.gap}</li>`).join("")}
            </ul>
          ` : `<p>No gaps identified.</p>`}
        </section>
      `;
    })
    .catch(err => {
      els.main.innerHTML = `<div class="warning-banner">${err.message}</div>`;
    });
}
