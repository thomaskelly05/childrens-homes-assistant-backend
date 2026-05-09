(function () {
  const body = document.body;

  if (!body) return;

  body.classList.add('indicare-conversation-experience');

  const existingStage = document.querySelector('.ic-conversation-stage');

  if (!existingStage) {
    const stage = document.createElement('div');
    stage.className = 'ic-conversation-stage';

    stage.innerHTML = `
      <div class="ic-cgi-orb-wrap" aria-hidden="true">
        <div class="ic-cgi-wave"></div>
        <div class="ic-cgi-wave two"></div>

        <div class="ic-cgi-orb">
          <div class="ic-cgi-particles"></div>
        </div>

        <div class="ic-cgi-caption">
          <strong>IndiCare Intelligence</strong>
          <span>Operational conversational assistant active</span>
        </div>
      </div>
    `;

    document.body.appendChild(stage);
  }

  const messages = document.querySelector('.messages');
  const input = document.querySelector('#input, textarea');
  const sendButton = document.querySelector('#send, .send-btn');

  const setState = (state) => {
    body.classList.remove(
      'ic-voice-listening',
      'ic-assistant-thinking',
      'ic-assistant-speaking'
    );

    if (state) {
      body.classList.add(state);
    }
  };

  const activateConversationMode = () => {
    body.classList.add('ic-chat-started');
  };

  if (messages) {
    const observer = new MutationObserver(() => {
      if (messages.children.length > 0) {
        activateConversationMode();
      }

      messages.scrollTop = messages.scrollHeight;
    });

    observer.observe(messages, {
      childList: true,
      subtree: true
    });
  }

  if (input) {
    input.addEventListener('focus', () => {
      setState('ic-voice-listening');
    });

    input.addEventListener('blur', () => {
      setState('');
    });

    input.addEventListener('input', () => {
      if (input.value.trim().length > 0) {
        activateConversationMode();
      }
    });
  }

  if (sendButton) {
    sendButton.addEventListener('click', () => {
      setState('ic-assistant-thinking');

      setTimeout(() => {
        setState('ic-assistant-speaking');
      }, 1400);

      setTimeout(() => {
        setState('');
      }, 5200);
    });
  }

  const voiceButtons = document.querySelectorAll(
    '#openVoiceCompanion, .voice-trigger, .mic-btn'
  );

  voiceButtons.forEach((button) => {
    button.addEventListener('mousedown', () => {
      setState('ic-voice-listening');
    });

    button.addEventListener('mouseup', () => {
      setState('ic-assistant-thinking');

      setTimeout(() => {
        setState('ic-assistant-speaking');
      }, 1200);
    });

    button.addEventListener('touchstart', () => {
      setState('ic-voice-listening');
    }, { passive: true });

    button.addEventListener('touchend', () => {
      setState('ic-assistant-thinking');

      setTimeout(() => {
        setState('ic-assistant-speaking');
      }, 1200);
    }, { passive: true });
  });

  const mobileTopbar = document.querySelector('.topbar');

  if (mobileTopbar && !document.querySelector('.ic-top-actions')) {
    const actions = document.createElement('div');
    actions.className = 'ic-top-actions';

    actions.innerHTML = `
      <button class="ic-nav-btn">Voice</button>
      <button class="ic-top-tool">Tools</button>
    `;

    mobileTopbar.appendChild(actions);
  }

  window.IndiCareConversationExperience = {
    setListening() {
      setState('ic-voice-listening');
    },

    setThinking() {
      setState('ic-assistant-thinking');
    },

    setSpeaking() {
      setState('ic-assistant-speaking');
    },

    clearState() {
      setState('');
    }
  };
})();