/* IndiCare Suite standalone interaction layer
   Powers Intelligence / DOCS / Notes switching, DOCS templates,
   operational blocks, inline AI actions and transcript conversion. */

(function () {
  const DOC_TEMPLATES = {
    incident: {
      title: 'Incident Record',
      html: `
        <h1>Incident Record</h1>
        <section data-ic-block="incident" class="ic-op-block">
          <h2>What happened</h2>
          <p>Record the facts clearly, including date, time, location and who was present.</p>
        </section>
        <section data-ic-block="chronology" class="ic-op-block">
          <h2>Chronology</h2>
          <ul><li>Time → Event → Staff action → Outcome</li></ul>
        </section>
        <section data-ic-block="child_voice" class="ic-op-block">
          <h2>Child voice</h2>
          <p>Include direct words, wishes, feelings or presentation where known.</p>
        </section>
        <section data-ic-block="safeguarding" class="ic-op-block">
          <h2>Safeguarding considerations</h2>
          <p>Identify concerns, risks, notifications and follow-up needed.</p>
        </section>
        <section data-ic-block="leadership" class="ic-op-block">
          <h2>Management oversight</h2>
          <p>Record review, learning, actions and monitoring arrangements.</p>
        </section>`
    },
    missing: {
      title: 'Missing-from-Care Review',
      html: `
        <h1>Missing-from-Care Review</h1>
        <section data-ic-block="chronology" class="ic-op-block"><h2>Timeline</h2><p>Left home → search actions → police notification → return → follow-up.</p></section>
        <section data-ic-block="safeguarding" class="ic-op-block"><h2>Risks and safeguarding</h2><p>Consider risk during absence, known locations, associates and vulnerabilities.</p></section>
        <section data-ic-block="child_voice" class="ic-op-block"><h2>Return conversation / child voice</h2><p>Capture the young person’s account and feelings if shared.</p></section>
        <section data-ic-block="leadership" class="ic-op-block"><h2>Manager review</h2><p>Review triggers, prevention planning and escalation arrangements.</p></section>`
    },
    safeguarding: {
      title: 'Safeguarding Review',
      html: `
        <h1>Safeguarding Review</h1>
        <section data-ic-block="facts" class="ic-op-block"><h2>Facts identified</h2><p>Separate known facts from interpretation.</p></section>
        <section data-ic-block="safeguarding" class="ic-op-block"><h2>Concerns identified</h2><p>List indicators, risk factors and professional curiosity points.</p></section>
        <section data-ic-block="missing" class="ic-op-block"><h2>Missing information</h2><p>What still needs clarifying?</p></section>
        <section data-ic-block="leadership" class="ic-op-block"><h2>Management considerations</h2><p>Record oversight, escalation and follow-up actions.</p></section>`
    },
    chronology: {
      title: 'Chronology',
      html: `
        <h1>Chronology</h1>
        <section data-ic-block="chronology" class="ic-op-block"><h2>Timeline</h2><table class="ic-doc-table"><thead><tr><th>Date / Time</th><th>Event</th><th>Action</th><th>Outcome</th></tr></thead><tbody><tr><td></td><td></td><td></td><td></td></tr></tbody></table></section>
        <section data-ic-block="missing" class="ic-op-block"><h2>Gaps or uncertainties</h2><p>List missing times, unclear actions or unconfirmed outcomes.</p></section>`
    },
    ofsted: {
      title: 'Ofsted Evidence Summary',
      html: `
        <h1>Ofsted Evidence Summary</h1>
        <section data-ic-block="evidence" class="ic-op-block"><h2>Evidence seen</h2><p>Summarise the evidence available.</p></section>
        <section data-ic-block="impact" class="ic-op-block"><h2>Impact for children</h2><p>Explain what difference this made for children.</p></section>
        <section data-ic-block="leadership" class="ic-op-block"><h2>Leadership oversight</h2><p>Record monitoring, review and sustained improvement.</p></section>
        <section data-ic-block="missing" class="ic-op-block"><h2>Evidence gaps</h2><p>Identify what an inspector may ask for.</p></section>`
    },
    reg45: {
      title: 'Regulation 45 Evidence',
      html: `
        <h1>Regulation 45 Evidence</h1>
        <section data-ic-block="evidence" class="ic-op-block"><h2>Quality of care evidence</h2><p>Summarise evidence and impact.</p></section>
        <section data-ic-block="safeguarding" class="ic-op-block"><h2>Safeguarding and welfare</h2><p>Summarise themes, actions and oversight.</p></section>
        <section data-ic-block="leadership" class="ic-op-block"><h2>Leadership and management</h2><p>Record monitoring, learning and action planning.</p></section>
        <section data-ic-block="actions" class="ic-op-block"><h2>Actions and improvements</h2><p>Set out actions, owners and review dates.</p></section>`
    },
    supervision: {
      title: 'Supervision Reflection',
      html: `
        <h1>Supervision Reflection</h1>
        <section data-ic-block="reflection" class="ic-op-block"><h2>Reflection</h2><p>What happened and how did this feel for the young person and staff?</p></section>
        <section data-ic-block="practice" class="ic-op-block"><h2>Practice learning</h2><p>Consider trauma-informed, relational and restorative practice.</p></section>
        <section data-ic-block="actions" class="ic-op-block"><h2>Agreed actions</h2><p>Record actions, support and review arrangements.</p></section>`
    }
  };

  const NOTE_TRANSFORMS = {
    incident: 'Turn this transcript into a professional incident record with chronology, child voice, staff actions, outcomes, safeguarding considerations and manager review.',
    handover: 'Turn this transcript into a concise residential care handover with risks, emotional presentation, actions, appointments and follow-up.',
    supervision: 'Turn this transcript into a reflective supervision note with practice learning, emotional context and agreed actions.',
    safeguarding: 'Turn this transcript into a safeguarding concern review with facts, concerns, missing information, immediate risks and suggested follow-up.',
    chronology: 'Extract a chronology from this transcript using Date/Time → Event → Action → Outcome.'
  };

  function $(id) { return document.getElementById(id); }

  function showSuite(view) {
    document.querySelectorAll('[data-suite-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.suiteView === view);
    });

    document.querySelectorAll('[data-suite-panel]').forEach((panel) => {
      const target = panel.dataset.suitePanel;
      panel.classList.toggle('hidden', target !== view);
    });

    const title = $('workspaceTitle');
    const pill = $('workspacePill');
    const composer = $('composerDock');

    if (view === 'docs') {
      if (title) title.textContent = 'IndiCare DOCS';
      if (pill) pill.textContent = 'AI-native operational writing';
      if (composer) composer.classList.add('hidden');
    } else if (view === 'notes') {
      if (title) title.textContent = 'IndiCare Notes';
      if (pill) pill.textContent = 'Transcribe and structure notes';
      if (composer) composer.classList.add('hidden');
    } else {
      if (title) title.textContent = 'What can I help with?';
      if (pill) pill.textContent = 'Standalone AI workspace';
      if (composer) composer.classList.remove('hidden');
    }

    localStorage.setItem('indicare_suite_view', view);
  }

  function applyDocTemplate(key) {
    const template = DOC_TEMPLATES[key];
    const editor = $('indicareDocEditor');
    if (!template || !editor) return;
    editor.innerHTML = template.html;
    showSuite('docs');
    editor.focus();
    decorateBlocks();
  }

  function selectedText() {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
  }

  function sendToIntelligence(prompt) {
    const input = $('input');
    if (!input) return;
    showSuite('intelligence');
    input.value = prompt;
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function runDocCommand(command) {
    const editor = $('indicareDocEditor');
    if (!editor) return;
    const selection = selectedText();
    const source = selection || editor.innerText || '';
    const prompts = {
      improve: 'Improve the wording of this children’s residential care record. Keep it professional, factual and British English.',
      factual: 'Make this wording more factual, neutral and evidence-based. Remove assumptions or judgemental language.',
      childVoice: 'Improve this record by adding or identifying where child voice, wishes, feelings or direct words should be captured.',
      safeguarding: 'Review this text for safeguarding considerations, missing information and manager oversight. Do not make final decisions.',
      chronology: 'Extract a clear chronology from this text using Date/Time → Event → Staff action → Outcome.'
    };
    sendToIntelligence(`${prompts[command] || 'Review this text.'}\n\nText to review:\n${source}`);
  }

  function runNoteTransform(type) {
    const transcript = $('indicareTranscript');
    const text = transcript ? transcript.value.trim() : '';
    if (!text) {
      if (transcript) transcript.focus();
      return;
    }
    const instruction = NOTE_TRANSFORMS[type] || NOTE_TRANSFORMS.incident;
    sendToIntelligence(`${instruction}\n\nTranscript:\n${text}`);
  }

  function runNoteCommand(command) {
    const transcript = $('indicareTranscript');
    const text = transcript ? transcript.value.trim() : '';
    if (!text) return;
    const prompts = {
      clean: 'Clean this transcript. Remove filler, repetition and fragments while preserving meaning.',
      structure: 'Structure this transcript into a professional residential care note.',
      summary: 'Summarise this transcript into key themes, risks, actions and follow-up.',
      actions: 'Extract all actions, owners, dates and follow-up points from this transcript.'
    };
    sendToIntelligence(`${prompts[command] || 'Review this transcript.'}\n\nTranscript:\n${text}`);
  }

  function decorateBlocks() {
    document.querySelectorAll('.ic-op-block').forEach((block) => {
      if (block.dataset.decorated === 'true') return;
      block.dataset.decorated = 'true';
      const tools = document.createElement('div');
      tools.className = 'ic-op-block-tools';
      tools.innerHTML = `
        <button type="button" data-block-command="improve">Improve</button>
        <button type="button" data-block-command="qa">QA</button>
        <button type="button" data-block-command="chronology">Chronology</button>
      `;
      block.prepend(tools);
    });
  }

  function runBlockCommand(block, command) {
    const text = block.innerText.replace(/Improve\s*QA\s*Chronology/i, '').trim();
    const prompts = {
      improve: 'Improve this operational block for professional residential care recording.',
      qa: 'Review this operational block for factuality, chronology, child voice, safeguarding completeness and professionalism.',
      chronology: 'Extract chronology entries from this operational block.'
    };
    sendToIntelligence(`${prompts[command] || 'Review this block.'}\n\nBlock content:\n${text}`);
  }

  function bindVoiceButtons() {
    const start = $('startTranscribe');
    const stop = $('stopTranscribe');
    const transcript = $('indicareTranscript');
    let recognition = null;

    if (!start || !stop || !transcript) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      start.addEventListener('click', () => {
        transcript.value += '\n[Voice recording is not supported in this browser. Paste transcript here.]';
      });
      return;
    }

    start.addEventListener('click', () => {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';
      recognition.onresult = (event) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript;
        }
        transcript.value = `${transcript.value}\n${text}`.trim();
      };
      recognition.start();
      start.textContent = 'Recording...';
    });

    stop.addEventListener('click', () => {
      if (recognition) recognition.stop();
      start.textContent = 'Start recording';
    });
  }

  function bindFloatingTips() {
    const tip = document.createElement('div');
    tip.className = 'ic-suite-floating-tip';
    document.body.appendChild(tip);

    document.addEventListener('mouseover', (event) => {
      const button = event.target.closest('.ic-suite-switcher button, .ic-app-nav button, #newChat');
      if (!button || !document.body.classList.contains('ic-suite-rail-compact')) return;
      tip.textContent = button.textContent || button.getAttribute('aria-label') || 'Action';
      const rect = button.getBoundingClientRect();
      tip.style.left = `${rect.right + 10}px`;
      tip.style.top = `${rect.top + 7}px`;
      tip.classList.add('visible');
    });

    document.addEventListener('mouseout', () => tip.classList.remove('visible'));
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const suite = event.target.closest('[data-suite-view]');
      if (suite) {
        showSuite(suite.dataset.suiteView);
        return;
      }

      const docTemplate = event.target.closest('[data-doc-template]');
      if (docTemplate) {
        applyDocTemplate(docTemplate.dataset.docTemplate);
        return;
      }

      const docCommand = event.target.closest('[data-doc-command]');
      if (docCommand) {
        runDocCommand(docCommand.dataset.docCommand);
        return;
      }

      const blockCommand = event.target.closest('[data-block-command]');
      if (blockCommand) {
        runBlockCommand(blockCommand.closest('.ic-op-block'), blockCommand.dataset.blockCommand);
        return;
      }

      const noteTransform = event.target.closest('[data-note-transform]');
      if (noteTransform) {
        runNoteTransform(noteTransform.dataset.noteTransform);
        return;
      }

      const noteCommand = event.target.closest('[data-note-command]');
      if (noteCommand) {
        runNoteCommand(noteCommand.dataset.noteCommand);
      }
    });

    const editor = $('indicareDocEditor');
    if (editor) {
      editor.addEventListener('input', decorateBlocks);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('ic-suite-rail-compact');
    bind();
    bindVoiceButtons();
    bindFloatingTips();
    decorateBlocks();
    showSuite(localStorage.getItem('indicare_suite_view') || 'intelligence');
  });
})();
