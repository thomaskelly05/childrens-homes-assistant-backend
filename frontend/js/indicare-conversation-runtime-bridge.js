(function () {
  const experience = window.IndiCareConversationExperience;

  if (!experience) {
    console.warn('IndiCare conversational experience unavailable');
    return;
  }

  const body = document.body;

  const safely = (fn) => {
    try {
      return fn();
    } catch (error) {
      console.warn('IndiCare runtime bridge warning', error);
      return null;
    }
  };

  function bindVoiceCompanion() {
    if (!window.IndiCareVoiceCompanion) return;

    const originalOpen = window.IndiCareVoiceCompanion.open;

    if (typeof originalOpen === 'function') {
      window.IndiCareVoiceCompanion.open = function patchedOpen(...args) {
        experience.setListening();
        return safely(() => originalOpen.apply(this, args));
      };
    }

    const originalSpeak = window.IndiCareVoiceCompanion.speak;

    if (typeof originalSpeak === 'function') {
      window.IndiCareVoiceCompanion.speak = async function patchedSpeak(...args) {
        experience.setSpeaking();

        try {
          return await originalSpeak.apply(this, args);
        } finally {
          window.setTimeout(() => experience.clearState(), 1400);
        }
      };
    }
  }

  function bindSpeechSynthesis() {
    if (!window.speechSynthesis) return;

    const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);

    window.speechSynthesis.speak = function patchedSpeech(utterance) {
      experience.setSpeaking();

      if (utterance) {
        utterance.addEventListener('end', () => {
          window.setTimeout(() => experience.clearState(), 800);
        });
      }

      return originalSpeak(utterance);
    };
  }

  function bindMicrophoneFlow() {
    if (!navigator.mediaDevices?.getUserMedia) return;

    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async function patchedMedia(constraints) {
      experience.setListening();

      try {
        return await originalGetUserMedia(constraints);
      } catch (error) {
        experience.clearState();
        throw error;
      }
    };
  }

  function bindAssistantComposer() {
    const send = document.querySelector('#send, .send-btn');
    const input = document.querySelector('#input, textarea');
    const messages = document.querySelector('.messages');

    if (!send || !input) return;

    async function enterThinkingState() {
      if (!String(input.value || '').trim()) return;

      body.classList.add('ic-chat-started');
      experience.setThinking();

      window.setTimeout(() => {
        if (!body.classList.contains('ic-assistant-speaking')) {
          experience.setSpeaking();
        }
      }, 1600);
    }

    send.addEventListener('click', enterThinkingState);

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        enterThinkingState();
      }
    });

    if (messages) {
      const observer = new MutationObserver(() => {
        const hasAssistantReply = Array.from(messages.querySelectorAll('.assistant, .ai, .bot')).length > 0;

        if (hasAssistantReply) {
          experience.setSpeaking();

          window.setTimeout(() => {
            experience.clearState();
          }, 2400);
        }
      });

      observer.observe(messages, {
        childList: true,
        subtree: true
      });
    }
  }

  function bindWakeWordLayer() {
    const wakeButton = document.querySelector('#openVoiceCompanion');

    if (!wakeButton) return;

    wakeButton.addEventListener('click', () => {
      experience.setListening();
    });
  }

  function bindVisibilityLifecycle() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        experience.clearState();
      }
    });

    window.addEventListener('blur', () => {
      if (!body.classList.contains('ic-assistant-speaking')) {
        experience.clearState();
      }
    });
  }

  function initialise() {
    bindVoiceCompanion();
    bindSpeechSynthesis();
    bindMicrophoneFlow();
    bindAssistantComposer();
    bindWakeWordLayer();
    bindVisibilityLifecycle();

    body.classList.add('ic-runtime-wired');

    console.info('IndiCare conversational runtime bridge active');
  }

  if (document.readyState === 'complete') {
    initialise();
  } else {
    window.addEventListener('load', initialise, { once: true });
  }
})();