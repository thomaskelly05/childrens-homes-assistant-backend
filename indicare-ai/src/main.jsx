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
    starters: ['Help me think through a difficult shift calmly.', 'Help me prepare for supervision tomorrow.', 'Rewrite this email professionally and warmly.', 'Help me prioritise my workload today.'],
  },
  connect: {
    label: 'Connect',
    model: 'Outlook + Teams',
    subtitle: 'Inbox, meetings, communication and follow-up support',
    prompt: 'Communication, meetings and team coordination with AI built in.',
    intro: 'Outlook and Teams combined for children’s home professionals: inbox, meetings, channels, agendas, replies and actions.',
    starters: ['Draft a professional reply to this email.', 'Create an agenda for a team meeting.', 'Summarise this meeting and extract actions.', 'Help me word a difficult message calmly.'],
  },
  notes: {
    label: 'I-Notes',
    model: 'Beam / Magic Notes',
    subtitle: 'Voice-first adult reflection and note transformation',
    prompt: 'Talk naturally. Let AI structure your thoughts.',
    intro: 'Capture speech, reflection and messy notes, then transform them into summaries, actions, supervision prep or professional drafts.',
    starters: ['Turn this rough reflection into professional supervision prep.', 'Summarise these meeting notes and pull out actions.', 'Help me process this difficult shift calmly.', 'Create a clear follow-up list from my notes.'],
  },
  docs: {
    label: 'Docs',
    model: 'Pages / Word',
    subtitle: 'AI writing workspace with children’s home templates',
    prompt: 'Write, improve and reason inside documents.',
    intro: 'Professional writing with templates for supervision, meetings, Ofsted prep, policies, provider responses and leadership work.',
    starters: ['Open a supervision template.', 'Create an Ofsted preparation document.', 'Draft a professional development plan.', 'Rewrite this document in a stronger professional tone.'],
  },
  intelligence: {
    label: 'Intelligence',
    model: 'Grok / Tesla',
    subtitle: 'Immersive conversational reasoning for adults',
    prompt: 'Ask anything. Think deeply. Decide clearly.',
    intro: 'A voice-ready conversational reasoning environment for adults working in children’s homes.',
    starters: ['Help me think through a difficult leadership decision.', 'Challenge my assumptions around this staffing issue.', 'Help me prepare for Ofsted tomorrow.', 'I feel overwhelmed. Help me prioritise calmly.'],
  },
};

const docTemplates = [
  { title: 'Supervision preparation', body: 'Purpose\n\nKey points to discuss\n\nReflection\n\nSupport needed\n\nActions agreed' },
  { title: 'Team meeting agenda', body: 'Meeting purpose\n\nAttendees\n\nAgenda items\n\nDecisions needed\n\nActions and owners' },
  { title: 'Ofsted preparation note', body: 'Area of practice\n\nEvidence available\n\nImpact\n\nGaps\n\nNext steps' },
  { title: 'Professional development plan', body: 'Development goal\n\nCurrent strengths\n\nAreas to build\n\nSupport/resources\n\nReview date' },
  { title: 'Provider response', body: 'Context\n\nProfessional position\n\nEvidence or rationale\n\nActions taken\n\nNext steps' },
];

function apiPath(path) { return `${API_BASE}${path}`; }

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
      conversation_id: `indicare-ai-${mode}`,
    }),
  });

  if (!response.ok || !response.body) throw new Error(`Streaming failed (${response.status})`);

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
      for (const line of event.split('\n')) {
        if (line.startsWith('data: ')) {
          const token = line.replace('data: ', '');
          if (token !== '[DONE]') onToken(token);
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
  const [noteText, setNoteText] = useState(() => localStorage.getItem('indicare.ai.noteText') || '');
  const [docTitle, setDocTitle] = useState(() => localStorage.getItem('indicare.ai.docTitle') || 'Untitled professional document');
  const [docBody, setDocBody] = useState(() => localStorage.getItem('indicare.ai.docBody') || '');
  const [connectDraft, setConnectDraft] = useState('');
  const recognitionRef = useRef(null);

  const current = experiences[mode];
  const scopedMessages = useMemo(() => messages.filter((m) => m.mode === mode), [messages, mode]);
  const memory = useMemo(() => memorySummary(mode), [mode, messages, actions, noteText, docBody]);
  const openActions = useMemo(() => actions.filter((action) => action.experience === mode && action.status !== 'done').slice(0, 6), [actions, mode]);

  useEffect(() => { localStorage.setItem('indicare.ai.messages', JSON.stringify(messages.slice(-220))); }, [messages]);
  useEffect(() => { localStorage.setItem('indicare.ai.noteText', noteText); }, [noteText]);
  useEffect(() => { localStorage.setItem('indicare.ai.docTitle', docTitle); }, [docTitle]);
  useEffect(() => { localStorage.setItem('indicare.ai.docBody', docBody); }, [docBody]);

  async function send(text = draft, targetMode = mode) {
    const clean = String(text || '').trim();
    if (!clean || busy) return;
    setDraft('');
    setBusy(true);
    rememberProfessionalMoment({ experience: targetMode, type: targetMode === 'intelligence' ? 'reflection' : 'conversation', text: clean });
    const userMessage = { role: 'user', content: clean, mode: targetMode };
    const assistantMessage = { role: 'assistant', content: '', mode: targetMode };
    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);
    try {
      await streamReply({
        mode: targetMode,
        message: clean,
        history: messages.filter((m) => m.mode === targetMode),
        onToken(token) {
          assistantMessage.content += token;
          setMessages([...nextMessages]);
        },
      });
      rememberProfessionalMoment({ experience: targetMode, type: 'conversation', text: assistantMessage.content, meta: { role: 'assistant' } });
    } catch (error) {
      assistantMessage.content = `I could not connect to IndiCare.ai. ${error.message}`;
      setMessages([...nextMessages]);
    } finally {
      setBusy(false);
    }
  }

  function newThread() { setMessages(messages.filter((m) => m.mode !== mode)); }
  function refreshActions() { setActions(loadActions()); }
  function addAction(title, experience = mode, source = current.label) { addProfessionalAction({ title, experience, source }); refreshActions(); }
  function addActionFromDraft() { const clean = String(draft || '').trim(); if (clean) { addAction(clean); setDraft(''); } }
  function markAction(actionId) { setActions(toggleAction(actionId)); }
  function removeAction(actionId) { setActions(deleteAction(actionId)); }

  function toggleVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceState('unsupported'); return; }
    if (voiceState === 'listening') { recognitionRef.current?.stop(); setVoiceState('idle'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      if (mode === 'notes') setNoteText((prev) => `${prev}${prev ? ' ' : ''}${transcript}`.trim());
      else setDraft(transcript.trim());
    };
    recognition.onend = () => setVoiceState('idle');
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceState('listening');
  }

  async function transformNote(kind) {
    const text = noteText.trim();
    if (!text) return;
    rememberProfessionalMoment({ experience: 'notes', type: 'note', text });
    await send(`Transform these rough notes into ${kind}. Keep it adult professional support focused, clear and useful.\n\n${text}`, 'notes');
  }

  async function improveDocument(kind) {
    const text = `${docTitle}\n\n${docBody}`.trim();
    if (!text) return;
    rememberProfessionalMoment({ experience: 'docs', type: 'document', text });
    await send(`${kind} this professional document. Keep the result suitable for adults working in residential children's homes.\n\n${text}`, 'docs');
  }

  function openTemplate(template) {
    setDocTitle(template.title);
    setDocBody(template.body);
    rememberProfessionalMoment({ experience: 'docs', type: 'document', text: `${template.title}\n${template.body}`, meta: { template: true } });
    setMode('docs');
  }

  function connectSend(kind) {
    const clean = connectDraft.trim();
    if (!clean) return;
    rememberProfessionalMoment({ experience: 'connect', type: 'meeting', text: clean, meta: { kind } });
    send(`${kind}: ${clean}`, 'connect');
    setConnectDraft('');
  }

  return (
    <div className={`app ${mode === 'intelligence' ? 'intelligence-surface' : ''}`}>
      <aside className="rail">
        <div className="brand"><div className="mark">IC</div><div><strong>IndiCare.ai</strong><span>Professional AI workspace</span></div></div>
        <button className="new" onClick={newThread}>New thread</button>
        <div className="section">Experiences</div>
        <nav>{Object.entries(experiences).map(([key, item]) => <button key={key} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}><span className="nav-letter">{item.label[0]}</span><span><strong>{item.label}</strong><small>{item.model}</small></span></button>)}</nav>
        <div className="context-card"><strong>Standalone AI environment</strong><span>Adult professional support only. OS child-record intelligence stays separate.</span></div>
      </aside>

      <main>
        <header>
          <div><p className="eyebrow">{current.model}-inspired experience</p><h1>{current.label}</h1><span>{current.subtitle}</span></div>
          <div className="top-actions"><button>{memory.conversations + memory.reflections} memories</button><button>{openActions.length} actions</button><button>{voiceState === 'listening' ? 'Voice live' : 'Voice ready'}</button></div>
        </header>

        {mode === 'assistant' || mode === 'intelligence' ? <ConversationSurface current={current} scopedMessages={scopedMessages} busy={busy} send={send} mode={mode} /> : null}
        {mode === 'connect' ? <ConnectSurface connectDraft={connectDraft} setConnectDraft={setConnectDraft} connectSend={connectSend} addAction={addAction} scopedMessages={scopedMessages} busy={busy} /> : null}
        {mode === 'notes' ? <NotesSurface noteText={noteText} setNoteText={setNoteText} transformNote={transformNote} toggleVoice={toggleVoice} voiceState={voiceState} scopedMessages={scopedMessages} busy={busy} /> : null}
        {mode === 'docs' ? <DocsSurface docTitle={docTitle} setDocTitle={setDocTitle} docBody={docBody} setDocBody={setDocBody} templates={docTemplates} openTemplate={openTemplate} improveDocument={improveDocument} scopedMessages={scopedMessages} busy={busy} /> : null}

        <ProfessionalPanel memory={memory} openActions={openActions} markAction={markAction} removeAction={removeAction} />

        <Composer mode={mode} draft={draft} setDraft={setDraft} send={send} toggleVoice={toggleVoice} voiceState={voiceState} addActionFromDraft={addActionFromDraft} />
      </main>
    </div>
  );
}

function ConversationSurface({ current, scopedMessages, busy, send, mode }) {
  return <section className="conversation"><div className="conversation-inner">{!scopedMessages.length ? <div className="hero"><div className="hero-mark">{mode === 'intelligence' ? '◎' : 'IC'}</div><h2>{current.prompt}</h2><p>{current.intro}</p><div className="starters">{(current.starters || []).map((starter) => <button key={starter} onClick={() => send(starter)}><strong>{starter}</strong><span>Start conversation</span></button>)}</div></div> : <MessageList messages={scopedMessages} />}{busy ? <Thinking /> : null}</div></section>;
}

function ConnectSurface({ connectDraft, setConnectDraft, connectSend, addAction, scopedMessages, busy }) {
  return <section className="experience-grid"><aside className="workspace-rail"><h2>Connect</h2><Card title="Inbox" text="Draft, rewrite and prioritise professional email." /><Card title="Teams" text="Meetings, messages, debriefs and follow-ups." /><Card title="Calendar" text="Prepare agendas and meeting outcomes." /></aside><div className="workspace-main"><div className="workspace-card large"><p className="eyebrow">Outlook + Teams + AI</p><h2>Professional communication hub</h2><p>Paste an email, meeting note or difficult message. IndiCare.ai can rewrite it, summarise it, prepare an agenda or extract adult follow-up actions.</p><textarea className="workspace-textarea" value={connectDraft} onChange={(e) => setConnectDraft(e.target.value)} placeholder="Paste an email, meeting notes, agenda items or team message..." /><div className="workspace-actions"><button onClick={() => connectSend('Draft a professional reply')}>Draft reply</button><button onClick={() => connectSend('Summarise and extract actions')}>Summarise</button><button onClick={() => connectSend('Create meeting agenda')}>Agenda</button><button onClick={() => addAction(connectDraft || 'Follow up communication', 'connect', 'Connect')}>Save action</button></div></div><MessageList messages={scopedMessages} />{busy ? <Thinking /> : null}</div></section>;
}

function NotesSurface({ noteText, setNoteText, transformNote, toggleVoice, voiceState, scopedMessages, busy }) {
  return <section className="experience-grid two"><div className="workspace-main"><div className="recorder"><p className="eyebrow">Beam / Magic Notes style</p><h2>Talk naturally.</h2><p>Use I-Notes to capture adult reflection, meetings, supervision prep, planning thoughts and decompression after difficult moments.</p><div className="wave" /><button onClick={toggleVoice}>{voiceState === 'listening' ? 'Stop listening' : 'Start voice capture'}</button></div><textarea className="note-capture" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Speak, paste or type rough notes here..." /><div className="workspace-actions"><button onClick={() => transformNote('a clear professional summary')}>Summary</button><button onClick={() => transformNote('supervision preparation')}>Supervision prep</button><button onClick={() => transformNote('meeting minutes and actions')}>Meeting minutes</button><button onClick={() => transformNote('a calm reflective debrief')}>Reflective debrief</button></div><MessageList messages={scopedMessages} />{busy ? <Thinking /> : null}</div><aside className="workspace-rail right"><h2>Transform into</h2><Card title="Professional summary" text="Clear, calm wording from messy thoughts." /><Card title="Actions" text="Practical next steps and follow-ups." /><Card title="Preparation" text="Supervision, meetings or leadership reflection." /></aside></section>;
}

function DocsSurface({ docTitle, setDocTitle, docBody, setDocBody, templates, openTemplate, improveDocument, scopedMessages, busy }) {
  return <section className="experience-grid docs"><aside className="workspace-rail"><h2>Templates</h2>{templates.map((template) => <button className="template-card" key={template.title} onClick={() => openTemplate(template)}><strong>{template.title}</strong><span>Residential children’s homes template</span></button>)}</aside><div className="doc-stage"><input className="doc-title" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} /><textarea className="doc-page" value={docBody} onChange={(e) => setDocBody(e.target.value)} placeholder="Start writing or choose a template..." /><div className="workspace-actions"><button onClick={() => improveDocument('Improve')}>Improve</button><button onClick={() => improveDocument('Strengthen the professional tone of')}>Tone</button><button onClick={() => improveDocument('Structure')}>Structure</button><button onClick={() => improveDocument('Create an action list from')}>Actions</button></div><MessageList messages={scopedMessages} />{busy ? <Thinking /> : null}</div></section>;
}

function ProfessionalPanel({ memory, openActions, markAction, removeAction }) {
  return <aside className="professional-panel"><h2>Professional context</h2><p>This is IndiCare.ai memory for adult support, not OS record intelligence.</p><div className="mini-stats"><span>{memory.conversations} conversations</span><span>{memory.reflections} reflections</span><span>{memory.notes} notes</span><span>{memory.documents} documents</span></div><h3>Open actions</h3>{openActions.length ? openActions.map((action) => <div className="action-item" key={action.id}><button onClick={() => markAction(action.id)}>○</button><span>{action.title}</span><button onClick={() => removeAction(action.id)}>×</button></div>) : <p className="muted-copy">No open actions for this experience.</p>}</aside>;
}

function Composer({ mode, draft, setDraft, send, toggleVoice, voiceState, addActionFromDraft }) {
  return <div className="composer-wrap"><div className="composer"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={mode === 'intelligence' ? 'Talk to Intelligence…' : 'Message IndiCare.ai…'} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} /><div className="composer-row"><div className="composer-tools"><button onClick={toggleVoice}>{voiceState === 'listening' ? 'Listening…' : 'Voice'}</button><button onClick={addActionFromDraft}>Save as action</button></div><button className="send" onClick={() => send()}>↑</button></div></div></div>;
}

function MessageList({ messages }) { return <>{messages.map((message, index) => <article key={`${message.role}-${index}`} className={`message ${message.role}`}><div className="avatar">{message.role === 'user' ? 'You' : 'AI'}</div><div className="bubble">{message.content}</div></article>)}</>; }
function Thinking() { return <div className="thinking"><span /><span /><span /></div>; }
function Card({ title, text }) { return <div className="card"><strong>{title}</strong><span>{text}</span></div>; }

createRoot(document.getElementById('root')).render(<App />);
