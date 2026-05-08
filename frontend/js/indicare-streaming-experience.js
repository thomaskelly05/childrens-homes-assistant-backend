/* IndiCare AI streaming experience
   Adds ChatGPT-style streaming polish, thinking states and progressive rendering.
*/

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function injectStyles() {
    if ($('icStreamingStyles')) return;

    const style = document.createElement('style');
    style.id = 'icStreamingStyles';
    style.textContent = `
      .ic-thinking-row {
        display:flex;
        align-items:center;
        gap:10px;
        padding:10px 14px;
        margin:12px 0;
        border:1px solid var(--ic-border);
        background:var(--ic-panel);
        border-radius:18px;
        width:fit-content;
        box-shadow:0 10px 28px rgba(15,23,42,.06);
      }

      .ic-thinking-dots {
        display:flex;
        gap:5px;
      }

      .ic-thinking-dots span {
        width:7px;
        height:7px;
        border-radius:999px;
        background:var(--ic-blue);
        animation: icPulse 1.2s infinite ease-in-out;
      }

      .ic-thinking-dots span:nth-child(2){animation-delay:.18s}
      .ic-thinking-dots span:nth-child(3){animation-delay:.36s}

      @keyframes icPulse {
        0%,80%,100%{opacity:.35;transform:scale(.9)}
        40%{opacity:1;transform:scale(1)}
      }

      .ic-streaming .msg {
        position:relative;
      }

      .ic-streaming-caret::after {
        content:'';
        display:inline-block;
        width:8px;
        height:1.1em;
        margin-left:3px;
        vertical-align:-2px;
        background:var(--ic-blue);
        animation: icCaret 1s step-end infinite;
      }

      @keyframes icCaret {
        50%{opacity:0}
      }

      .ic-live-status {
        position:sticky;
        bottom:12px;
        margin:12px auto 0;
        width:fit-content;
        z-index:30;
        padding:8px 12px;
        border-radius:999px;
        background:rgba(255,255,255,.9);
        border:1px solid var(--ic-border);
        backdrop-filter:blur(10px);
        font-size:.75rem;
        color:var(--ic-muted);
      }
    `;

    document.head.appendChild(style);
  }

  function ensureStatus() {
    let status = $('icLiveStatus');
    if (status) return status;

    status = document.createElement('div');
    status.id = 'icLiveStatus';
    status.className = 'ic-live-status';
    status.textContent = 'IndiCare AI ready';

    document.querySelector('.ic-main')?.appendChild(status);
    return status;
  }

  function setStatus(text) {
    ensureStatus().textContent = text;
  }

  function createThinkingRow() {
    const row = document.createElement('div');
    row.className = 'ic-thinking-row';
    row.id = 'icThinkingRow';
    row.innerHTML = `
      <strong>IndiCare AI</strong>
      <div class="ic-thinking-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <small>reviewing operational context</small>
    `;

    $('messages')?.appendChild(row);
    scrollToBottom();
    return row;
  }

  function removeThinkingRow() {
    $('icThinkingRow')?.remove();
  }

  function progressivelyReveal(messageNode) {
    if (!messageNode || messageNode.dataset.icStreamed === 'true') return;

    const text = messageNode.innerHTML;
    const plain = messageNode.innerText;

    if (!plain || plain.length < 140) return;

    messageNode.dataset.icStreamed = 'true';
    messageNode.classList.add('ic-streaming');

    const chunks = text.match(/.{1,24}/gs) || [text];
    messageNode.innerHTML = '<span class="ic-streaming-caret"></span>';

    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      messageNode.innerHTML = `${chunks.slice(0, index).join('')}<span class="ic-streaming-caret"></span>`;
      scrollToBottom();

      if (index >= chunks.length) {
        clearInterval(interval);
        messageNode.innerHTML = text;
        messageNode.classList.remove('ic-streaming');
      }
    }, 18);
  }

  function monitorMessages() {
    const assistantMessages = document.querySelectorAll('#messages .wrap.assistant .msg');
    const latest = assistantMessages[assistantMessages.length - 1];

    if (!latest || latest.dataset.icObserved === 'true') return;

    latest.dataset.icObserved = 'true';
    removeThinkingRow();
    setStatus('Response generated');

    setTimeout(() => progressivelyReveal(latest), 60);
  }

  function scrollToBottom() {
    const messages = $('messages');
    if (!messages) return;
    messages.scrollTop = messages.scrollHeight;
  }

  function bindSendingState() {
    $('send')?.addEventListener('click', () => {
      removeThinkingRow();
      createThinkingRow();
      setStatus('Generating response');
    });

    $('input')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        setTimeout(() => {
          removeThinkingRow();
          createThinkingRow();
          setStatus('Generating response');
        }, 40);
      }
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    ensureStatus();
    bindSendingState();

    const messages = $('messages');
    if (messages) {
      new MutationObserver(monitorMessages).observe(messages, {
        childList:true,
        subtree:true,
        characterData:true
      });
    }
  });
})();
