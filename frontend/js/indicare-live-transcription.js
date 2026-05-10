/* IndiCare AI live transcription
   Adds live transcription simulation, operational capture states and chronology extraction hooks.
*/

(function () {
  let listening = false;
  let interval = null;

  const SAMPLE_LINES = [
    'Young person presented calm during key work session.',
    'Staff supported emotional regulation using grounding techniques.',
    'Discussion held regarding education attendance and routines.',
    'No safeguarding disclosures shared during conversation.',
    'Young person expressed frustration regarding family contact.',
    'Follow-up requested with allocated social worker.',
    'Staff completed welfare checks and updated chronology.',
    'Positive engagement observed during evening activities.'
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function injectStyles() {
    if ($('icLiveTranscriptStyles')) return;

    const style = document.createElement('style');
    style.id = 'icLiveTranscriptStyles';
    style.textContent = `
      .ic-live-transcription-bar {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:12px 14px;
        border:1px solid var(--ic-border);
        border-radius:18px;
        background:var(--ic-panel);
        margin-bottom:14px;
        box-shadow:0 10px 28px rgba(15,23,42,.05);
      }

      .ic-live-transcription-state {
        display:flex;
        align-items:center;
        gap:10px;
        font-size:.82rem;
        color:var(--ic-muted);
      }

      .ic-live-pulse {
        width:10px;
        height:10px;
        border-radius:999px;
        background:#ef4444;
        animation: icLivePulse 1.2s infinite;
      }

      @keyframes icLivePulse {
        0%{transform:scale(.92);opacity:.45}
        50%{transform:scale(1);opacity:1}
        100%{transform:scale(.92);opacity:.45}
      }

      .ic-live-transcription-actions {
        display:flex;
        gap:8px;
      }

      .ic-live-transcription-actions button {
        border:1px solid var(--ic-border);
        background:var(--ic-panel);
        color:var(--ic-text);
        border-radius:12px;
        padding:8px 10px;
        font-size:.76rem;
        font-weight:700;
      }

      .ic-live-transcription-actions button.active {
        background:var(--ic-blue-soft);
        color:var(--ic-blue);
        border-color:rgba(9,105,255,.18);
      }
    `;

    document.head.appendChild(style);
  }

  function ensureBar() {
    const notes = $('indicareNotes');
    if (!notes || $('icLiveTranscriptionBar')) return;

    const bar = document.createElement('div');
    bar.id = 'icLiveTranscriptionBar';
    bar.className = 'ic-live-transcription-bar';
    bar.innerHTML = `
      <div class="ic-live-transcription-state">
        <span class="ic-live-pulse"></span>
        <span id="icLiveTranscriptState">Ready for live capture</span>
      </div>

      <div class="ic-live-transcription-actions">
        <button type="button" id="icStartTranscript">Start live notes</button>
        <button type="button" id="icExtractChronology">Extract chronology</button>
      </div>
    `;

    notes.prepend(bar);
  }

  function appendTranscript(text) {
    const field = $('indicareTranscript');
    if (!field) return;

    field.value = `${field.value.trim()}\n${timestamp()} ${text}`.trim();
    field.scrollTop = field.scrollHeight;
  }

  function timestamp() {
    return `[${new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}]`;
  }

  function startStreaming() {
    if (listening) return;

    listening = true;
    $('icStartTranscript')?.classList.add('active');
    setState('Listening and capturing operational notes');

    interval = setInterval(() => {
      const line = SAMPLE_LINES[Math.floor(Math.random() * SAMPLE_LINES.length)];
      appendTranscript(line);

      if (window.IndiCareGovernance) {
        window.IndiCareGovernance.logActivity('live_transcription_capture', {
          chars: line.length
        });
      }
    }, 3200);
  }

  function stopStreaming() {
    listening = false;
    clearInterval(interval);
    $('icStartTranscript')?.classList.remove('active');
    setState('Live capture paused');
  }

  function toggleStreaming() {
    if (listening) stopStreaming();
    else startStreaming();
  }

  function setState(text) {
    const state = $('icLiveTranscriptState');
    if (state) state.textContent = text;
  }

  function chronologyPrompt() {
    const transcript = $('indicareTranscript')?.value || '';
    const input = $('input');
    if (!input) return;

    input.value = `Extract a professional chronology from these live notes:\n\n${transcript.slice(-5000)}`;
    input.dispatchEvent(new Event('input', { bubbles:true }));

    if (window.IndiCareGovernance) {
      window.IndiCareGovernance.logActivity('chronology_extraction_requested', {
        transcript_length: transcript.length
      });
    }
  }

  function bind() {
    document.addEventListener('click', (event) => {
      if (event.target.id === 'icStartTranscript') {
        toggleStreaming();
      }

      if (event.target.id === 'icExtractChronology') {
        chronologyPrompt();
      }
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    ensureBar();
    bind();
  });
})();
