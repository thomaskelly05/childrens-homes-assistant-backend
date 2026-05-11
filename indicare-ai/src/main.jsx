import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  addProfessionalAction,
  buildProfessionalContext,
  loadActions,
  memorySummary,
  rememberProfessionalMoment,
  toggleAction,
  deleteAction,
} from './indicareAiRuntime.js';
import './styles.css';

const API_BASE = (import.meta.env.VITE_INDICARE_API_BASE || '').replace(/\/$/, '');

const experiences = {
  assistant: {
    label: 'Assistant',
    model: 'ChatGPT',
    subtitle: 'Professional support for adults in children’s homes',
    prompt: 'Ask, reflect, draft and think clearly.',
    intro: 'A calm conversational workspace for staff, managers, responsible individuals and providers.',
    starters: [
      'Help me think through a difficult shift calmly.',
      'Help me prepare for supervision tomorrow.',
      'Rewrite this email professionally and warmly.',
      'Help me prioritise my workload today.'
    ]
  },
  connect: {
    label: 'Connect',
    model: 'Teams',
    subtitle: 'Adult collaboration, meetings and follow-up support',
    prompt: 'Coordinate adults with AI in the room.',
    intro: 'Meeting notes, professional communication, debriefs, shared preparation and action clarity.'
  },
  notes: {
    label: 'I-Notes',
    model: 'Beam',
    subtitle: 'Voice-first adult reflection and note transformation',
    prompt: 'Talk naturally. Let AI structure your thoughts.',
    intro: 'Capture speech, reflection and messy notes, then turn them into professional summaries, actions and preparation.'
  },
  docs: {
    label: 'Docs',
    model: 'Pages',
    subtitle: 'AI writing workspace for care professionals',
    prompt: 'Write, improve and reason inside documents.',
    intro: 'Policies, supervision, leadership writing, Ofsted preparation and professional communication.'
  },
  intelligence: {
    label: 'Intelligence',
    model: 'Grok',
    subtitle: 'Immersive conversational reasoning for adults',
    prompt: 'Ask anything. Think deeply. Decide clearly.',
    intro: 'A conversational reasoning environment for adults working in children’s homes.',
    starters: [
      'Help me think through a difficult leadership decision.',
      'Challenge my assumptions around this staffing issue.',
      'Help me prepare for Ofsted tomorrow.',
      'I feel overwhelmed. Help me prioritise calmly.'
    ]
  }
};

function apiPath(path) {
  return `${API_BASE}${path}`;
}

async function streamReply({ mode, message, history, onToken }) {
  const professionalContext = buildProfessionalContext(mode);
  const response = await fetch(apiPath('/indicare-ai/stream'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `${message}\n\nINDICARE.AI PROFESSIONAL CONTEXT:\n${JSON.stringify(professionalContext)}`,
      experience: mode,
      history: history.slice(-12),
      response_mode: mode === 'intelligence' ? 'deep' : 'balanced',
      conversation_id: `indicare-ai-${mode}`
    })
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const token = line.replace('data: ', '');
          if (token !== '[DONE]') {
            onToken(token);
          }
        }
      }
    }
  }
}

function App() {
  const [mode, setMode] = useState('assistant');
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('indicare.ai.messages') || '[]'));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceState, setVoiceState] = useState('idle');
  const [actions, setActions] = useState(() => loadActions());
  const recognitionRef = useRef(null);

  const current = experiences[mode];
  const scopedMessages = useMemo(() => messages.filter((m) => m.mode === mode), [messages, mode]);
  const memory = useMemo(() => memorySummary(mode), [mode, messages, actions]);
  const openActions = useMemo(() => actions.filter((action) => action.experience === mode && action.status !== 'done').slice(0, 6), [actions, mode]);

  useEffect(() => {
    localStorage.setItem('indicare.ai.messages', JSON.stringify(messages.slice(-200)));
  }, [messages]);

  async function send(text = draft) {
    const clean = String(text || '').trim();
    if (!clean || busy) return;

    setDraft('');
    setBusy(true);

    rememberProfessionalMoment({ experience: mode, type: mode === 'intelligence' ? 'reflection' : 'conversation', text: clean });

    const userMessage = { role: 'user', content: clean, mode };
    const assistantMessage = { role: 'assistant', content: '', mode };

    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);

    try {
      await streamReply({
        mode,
        message: clean,
        history: scopedMessages,
        onToken(token) {
          assistantMessage.content += token;
          setMessages([...nextMessages]);
        }
      });
      rememberProfessionalMoment({ experience: mode, type: 'conversation', text: assistantMessage.content, meta: { role: 'assistant' } });
    } catch (error) {
      assistantMessage.content = `I could not connect to IndiCare.ai. ${error.message}`;
      setMessages([...nextMessages]);
    } finally {
      setBusy(false);
    }
  }

  function newThread() {
    setMessages(messages.filter((m) => m.mode !== mode));
  }

  function addActionFromDraft() {
    const clean = String(draft || '').trim();
    if (!clean) return;
    addProfessionalAction({ title: clean, experience: mode, source: current.label });
    setActions(loadActions());
    setDraft('');
  }

  function markAction(actionId) {
    setActions(toggleAction(actionId));
  }

  function removeAction(actionId) {
    setActions(deleteAction(actionId));
  }

  function toggleVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceState('unsupported');
      return;
    }

    if (voiceState === 'listening') {
      recognitionRef.current?.stop();
      setVoiceState('idle');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setDraft(transcript.trim());
    };

    recognition.onend = () => setVoiceState('idle');
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceState('listening');
  }

  return (
    <div className={`app ${mode === 'intelligence' ? 'intelligence-surface' : ''}`}>
      <aside className="rail">
        <div className="brand">
          <div className="mark">IC</div>
          <div>
            <strong>IndiCare.ai</strong>
            <span>Professional AI workspace</span>
          </div>
        </div>

        <button className="new" onClick={newThread}>New thread</button>

        <div className="section">Experiences</div>

        <nav>
          {Object.entries(experiences).map(([key, item]) => (
            <button key={key} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}>
              <span className="nav-letter">{item.label[0]}</span>
              <span><strong>{item.label}</strong><small>{item.model}</small></span>
            </button>
          ))}
        </nav>

        <div className="context-card">
          <strong>Standalone AI environment</strong>
          <span>Adult professional support only. OS child-record intelligence stays separate.</span>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <p className="eyebrow">{current.model}-inspired experience</p>
            <h1>{current.label}</h1>
            <span>{current.subtitle}</span>
          </div>
          <div className="top-actions">
            <button>{memory.conversations + memory.reflections} memories</button>
            <button>{openActions.length} actions</button>
            <button>{voiceState === 'listening' ? 'Voice live' : 'Voice ready'}</button>
          </div>
        </header>

        <section className="conversation">
          <div className="conversation-inner">
            {!scopedMessages.length ? (
              <div className="hero">
                <div className="hero-mark">{mode === 'intelligence' ? '◎' : 'IC'}</div>
                <h2>{current.prompt}</h2>
                <p>{current.intro}</p>

                <div className="starters">
                  {(current.starters || []).map((starter) => (
                    <button key={starter} onClick={() => send(starter)}>
                      <strong>{starter}</strong>
                      <span>Start conversation</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              scopedMessages.map((message, index) => (
                <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
                  <div className="avatar">{message.role === 'user' ? 'You' : 'AI'}</div>
                  <div className="bubble">{message.content}</div>
                </article>
              ))
            )}

            {busy ? <div className="thinking"><span /><span /><span /></div> : null}
          </div>
        </section>

        <aside className="professional-panel">
          <h2>Professional context</h2>
          <p>This is IndiCare.ai memory for adult support, not OS record intelligence.</p>
          <div className="mini-stats">
            <span>{memory.conversations} conversations</span>
            <span>{memory.reflections} reflections</span>
            <span>{memory.notes} notes</span>
          </div>
          <h3>Open actions</h3>
          {openActions.length ? openActions.map((action) => (
            <div className="action-item" key={action.id}>
              <button onClick={() => markAction(action.id)}>○</button>
              <span>{action.title}</span>
              <button onClick={() => removeAction(action.id)}>×</button>
            </div>
          )) : <p className="muted-copy">No open actions for this experience.</p>}
        </aside>

        <div className="composer-wrap">
          <div className="composer">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={mode === 'intelligence' ? 'Talk to Intelligence…' : 'Message IndiCare.ai…'}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />

            <div className="composer-row">
              <div className="composer-tools">
                <button onClick={toggleVoice}>{voiceState === 'listening' ? 'Listening…' : 'Voice'}</button>
                <button onClick={addActionFromDraft}>Save as action</button>
              </div>
              <button className="send" onClick={() => send()}>↑</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
