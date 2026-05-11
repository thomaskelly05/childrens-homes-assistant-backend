import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE = (import.meta.env.VITE_INDICARE_API_BASE || '').replace(/\/$/, '');

const experiences = {
  assistant: {
    label: 'Assistant',
    model: 'ChatGPT',
    subtitle: 'Professional residential childcare support',
    prompt: 'Ask, reflect, draft and think clearly.',
    intro: 'A calm conversational workspace for staff, managers, responsible individuals and providers.',
    starters: [
      'Help me think through a difficult shift calmly.',
      'Rewrite this recording in factual child-centred language.',
      'Prepare me for supervision using these notes.',
      'Help me respond to a safeguarding concern professionally.'
    ]
  },
  connect: {
    label: 'Connect',
    model: 'Teams',
    subtitle: 'AI-native collaboration for children’s homes',
    prompt: 'Coordinate the home with AI in the room.',
    intro: 'Channels, handovers, meetings, debriefs and actions with live AI summaries.'
  },
  notes: {
    label: 'I-Notes',
    model: 'Beam',
    subtitle: 'Voice-first notes and professional transformation',
    prompt: 'Talk naturally. Let AI structure the record.',
    intro: 'Capture speech, reflection and messy notes, then turn them into handovers, chronologies, incidents and actions.'
  },
  docs: {
    label: 'Docs',
    model: 'Pages',
    subtitle: 'AI writing workspace for care professionals',
    prompt: 'Write, improve and reason inside documents.',
    intro: 'Plans, reports, supervision records, Ofsted evidence and professional documents with AI alongside.'
  },
  intelligence: {
    label: 'Intelligence',
    model: 'Grok',
    subtitle: 'Immersive voice-first operational cognition',
    prompt: 'Ask anything. Think deeply. Decide clearly.',
    intro: 'The showstopper: conversational operational intelligence that reasons with adults about risk, patterns, leadership and children’s needs.',
    starters: [
      'Talk me through what is happening with this child because something feels off.',
      'Challenge my assumptions about this safeguarding concern.',
      'Look at these incidents and identify the pattern.',
      'Help me think like a strong registered manager here.'
    ]
  }
};

function apiPath(path) {
  return `${API_BASE}${path}`;
}

async function askSafe({ mode, message, history }) {
  const response = await fetch(apiPath('/assistant/general-safe'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `[IndiCare.ai ${mode} experience]\n${message}`,
      history: history.slice(-12),
      response_mode: mode === 'intelligence' ? 'deep' : 'balanced',
      conversation_id: `indicare-ai-${mode}`
    })
  });
  if (!response.ok) throw new Error(`AI request failed ${response.status}`);
  const data = await response.json();
  return data.answer || 'I am connected, but I did not receive a full response.';
}

function App() {
  const [mode, setMode] = useState('assistant');
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('indicare.ai.messages') || '[]'));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceState, setVoiceState] = useState('idle');
  const recognitionRef = useRef(null);

  const current = experiences[mode];
  const scopedMessages = useMemo(() => messages.filter((m) => m.mode === mode), [messages, mode]);

  function persist(next) {
    setMessages(next);
    localStorage.setItem('indicare.ai.messages', JSON.stringify(next.slice(-160)));
  }

  async function send(text = draft) {
    const clean = String(text || '').trim();
    if (!clean || busy) return;
    setDraft('');
    const userMessage = { role: 'user', content: clean, mode };
    const next = [...messages, userMessage];
    persist(next);
    setBusy(true);
    try {
      const answer = await askSafe({ mode, message: clean, history: scopedMessages });
      persist([...next, { role: 'assistant', content: answer, mode }]);
    } catch (error) {
      persist([...next, { role: 'assistant', content: `I could not connect to IndiCare.ai yet. ${error.message}`, mode }]);
    } finally {
      setBusy(false);
    }
  }

  function newThread() {
    persist(messages.filter((m) => m.mode !== mode));
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
      setDraft((prev) => `${prev}${prev ? ' ' : ''}${transcript}`.trim());
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
            <span>Professional AI for children’s homes</span>
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
          <strong>OS connection</strong>
          <span>IndiCare.ai is separate from the OS, but can connect to records, chronology and operational context through the backend.</span>
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
            <button>Memory</button>
            <button>Records</button>
            <button>Context</button>
          </div>
        </header>

        {mode === 'connect' ? <Connect /> : null}
        {mode === 'notes' ? <Notes /> : null}
        {mode === 'docs' ? <Docs /> : null}
        {mode === 'assistant' || mode === 'intelligence' ? (
          <section className="conversation">
            <div className="conversation-inner">
              {!scopedMessages.length ? (
                <div className="hero">
                  <div className="hero-mark">{mode === 'intelligence' ? '◎' : 'IC'}</div>
                  <h2>{current.prompt}</h2>
                  <p>{current.intro}</p>
                  <div className="starters">
                    {(current.starters || experiences.assistant.starters).map((starter) => (
                      <button key={starter} onClick={() => send(starter)}>
                        <strong>{starter}</strong>
                        <span>Start this conversation</span>
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
        ) : null}

        {(mode === 'assistant' || mode === 'intelligence') ? (
          <div className="composer-wrap">
            <div className="composer">
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={mode === 'intelligence' ? 'Speak or type to Intelligence...' : 'Message IndiCare.ai...'} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} />
              <div className="composer-row">
                <button onClick={toggleVoice}>{voiceState === 'listening' ? 'Listening…' : 'Voice'}</button>
                <button className="send" onClick={() => send()}>↑</button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Connect() {
  return <section className="tool-grid"><aside><h2>Channels</h2><Card title="Shift Handover" text="AI-supported shift communication." /><Card title="Safeguarding" text="Protected concern tracking and summaries." /><Card title="Managers" text="Leadership oversight and actions." /></aside><div className="workspace-card"><h2>Connect</h2><p>Teams-style collaboration for residential childcare, with AI summaries, actions, meetings and operational context built in.</p><div className="post"><strong>IndiCare.ai</strong><p>I can summarise this channel, extract actions, draft handover notes and flag emerging operational concerns.</p></div></div><aside><h2>AI Actions</h2><Card title="Summarise" text="Create a shift summary." /><Card title="Actions" text="Extract accountable next steps." /></aside></section>;
}

function Notes() {
  return <section className="notes-layout"><div><div className="recorder"><p className="eyebrow">Beam-style capture</p><h2>Talk naturally.</h2><p>Capture messy spoken reflection and transform it into professional recording.</p><div className="wave" /></div><div className="transcript" contentEditable suppressContentEditableWarning>Paste or dictate notes here...</div></div><aside><h2>Transform</h2><Card title="Incident" text="Create factual incident recording." /><Card title="Chronology" text="Extract timeline-ready events." /><Card title="Handover" text="Prepare concise handover notes." /></aside></section>;
}

function Docs() {
  return <section className="docs-layout"><aside><h2>Documents</h2><Card title="Placement Plan" text="AI-supported plan writing." /><Card title="Provider Review" text="Inspection-ready narrative." /></aside><article className="doc" contentEditable suppressContentEditableWarning><h2>Untitled professional document</h2><p>Start writing. IndiCare.ai should support tone, evidence, structure, professional judgement and inspection quality.</p></article><aside><h2>AI Writing</h2><Card title="Improve" text="Strengthen language and structure." /><Card title="Find gaps" text="Identify missing evidence." /></aside></section>;
}

function Card({ title, text }) {
  return <div className="card"><strong>{title}</strong><span>{text}</span></div>;
}

createRoot(document.getElementById('root')).render(<App />);
