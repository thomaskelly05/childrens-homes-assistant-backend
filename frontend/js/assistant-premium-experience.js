/* IndiCare Intelligence premium experience layer
   Section 4: streaming UX, advanced rendering, collapsibles,
   timeline blocks, inline editing, citations and mobile polish. */

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function enhanceMessages() {
    document.querySelectorAll('.wrap.assistant').forEach((wrap) => {
      if (wrap.dataset.premiumEnhanced === 'true') return;

      wrap.dataset.premiumEnhanced = 'true';
      wrap.classList.add('ic-streaming-message');

      const text = wrap.innerText || '';

      if (text.toLowerCase().includes('chronology')) {
        injectTimeline(wrap, text);
      }

      injectUtilities(wrap);
      injectCitationStrip(wrap);
      injectCollapsibles(wrap);
    });
  }

  function injectTimeline(wrap, text) {
    const lines = text
      .split('\n')
      .filter((line) => /\d{1,2}:\d{2}|→|->/.test(line))
      .slice(0, 8);

    if (!lines.length) return;

    const timeline = document.createElement('div');
    timeline.className = 'ic-timeline-block ic-ai-block';

    timeline.innerHTML = `
      <div class="ic-timeline-title">Chronology Timeline</div>
      <div class="ic-timeline-list">
        ${lines.map((line) => `
          <div class="ic-timeline-row">
            <span class="ic-timeline-dot"></span>
            <div>${line}</div>
          </div>
        `).join('')}
      </div>
    `;

    wrap.appendChild(timeline);
  }

  function injectUtilities(wrap) {
    const utilities = document.createElement('div');
    utilities.className = 'ic-inline-tools';

    utilities.innerHTML = `
      <button type="button" data-inline-edit="true">Edit</button>
      <button type="button" data-inline-copy="true">Copy</button>
      <button type="button" data-inline-collapse="true">Collapse</button>
    `;

    wrap.appendChild(utilities);
  }

  function injectCitationStrip(wrap) {
    const citations = document.createElement('div');
    citations.className = 'ic-citation-strip';

    citations.innerHTML = `
      <span>Residential care guidance</span>
      <span>Safeguarding-informed</span>
      <span>British English</span>
    `;

    wrap.appendChild(citations);
  }

  function injectCollapsibles(wrap) {
    wrap.querySelectorAll('h2, h3').forEach((heading) => {
      if (heading.dataset.collapsible === 'true') return;

      heading.dataset.collapsible = 'true';
      heading.classList.add('ic-collapsible-heading');

      heading.addEventListener('click', () => {
        let next = heading.nextElementSibling;

        while (next && !/^H2|H3$/.test(next.tagName)) {
          next.classList.toggle('hidden');
          next = next.nextElementSibling;
        }
      });
    });
  }

  function bindInlineActions() {
    document.addEventListener('click', (event) => {
      const copy = event.target.closest('[data-inline-copy]');
      if (copy) {
        const wrap = copy.closest('.wrap.assistant');
        navigator.clipboard.writeText(wrap.innerText || '');
        return;
      }

      const collapse = event.target.closest('[data-inline-collapse]');
      if (collapse) {
        const wrap = collapse.closest('.wrap.assistant');
        wrap.classList.toggle('ic-collapsed');
        return;
      }

      const edit = event.target.closest('[data-inline-edit]');
      if (edit) {
        const wrap = edit.closest('.wrap.assistant');
        const text = wrap.innerText || '';
        const input = $('input');
        if (input) {
          input.value = text;
          input.focus();
        }
      }
    });
  }

  function addStreamingEffect() {
    document.querySelectorAll('.msg').forEach((message) => {
      if (message.dataset.streamed === 'true') return;
      message.dataset.streamed = 'true';
      message.classList.add('ic-stream-fade');
    });
  }

  function observe() {
    const messages = $('messages');
    if (!messages) return;

    const observer = new MutationObserver(() => {
      enhanceMessages();
      addStreamingEffect();
    });

    observer.observe(messages, {
      childList: true,
      subtree: true
    });

    enhanceMessages();
    addStreamingEffect();
  }

  window.addEventListener('DOMContentLoaded', () => {
    bindInlineActions();
    observe();
  });
})();
