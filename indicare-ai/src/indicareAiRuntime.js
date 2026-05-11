const MEMORY_KEY = 'indicare.ai.memory.v1';
const ACTIONS_KEY = 'indicare.ai.actions.v1';

export function loadMemory() {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

export function saveMemory(memory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory || {}));
}

export function rememberProfessionalMoment({ experience, type = 'conversation', text = '', meta = {} }) {
  const memory = loadMemory();
  const bucket = memory[experience] || { conversations: [], notes: [], documents: [], reflections: [], meetings: [] };
  const item = {
    id: `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    text: String(text || '').slice(0, 4000),
    meta,
    created_at: new Date().toISOString(),
  };

  const target = type === 'note' ? 'notes' : type === 'document' ? 'documents' : type === 'meeting' ? 'meetings' : type === 'reflection' ? 'reflections' : 'conversations';
  bucket[target] = [item, ...(bucket[target] || [])].slice(0, 80);
  memory[experience] = bucket;
  memory.recent = [item, ...(memory.recent || [])].slice(0, 120);
  saveMemory(memory);
  return item;
}

export function memorySummary(experience) {
  const memory = loadMemory();
  const bucket = memory[experience] || {};
  return {
    conversations: (bucket.conversations || []).length,
    notes: (bucket.notes || []).length,
    documents: (bucket.documents || []).length,
    reflections: (bucket.reflections || []).length,
    meetings: (bucket.meetings || []).length,
    recent: (memory.recent || []).slice(0, 10),
  };
}

export function loadActions() {
  try {
    return JSON.parse(localStorage.getItem(ACTIONS_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

export function saveActions(actions) {
  localStorage.setItem(ACTIONS_KEY, JSON.stringify((actions || []).slice(0, 250)));
}

export function addProfessionalAction({ title, source = 'IndiCare.ai', experience = 'assistant', owner = '', due = '' }) {
  const action = {
    id: `act-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: String(title || 'Follow-up action').trim(),
    source,
    experience,
    owner,
    due,
    status: 'open',
    created_at: new Date().toISOString(),
  };
  const actions = [action, ...loadActions()].slice(0, 250);
  saveActions(actions);
  return action;
}

export function toggleAction(actionId) {
  const actions = loadActions().map((action) => action.id === actionId ? {
    ...action,
    status: action.status === 'done' ? 'open' : 'done',
    completed_at: action.status === 'done' ? null : new Date().toISOString(),
  } : action);
  saveActions(actions);
  return actions;
}

export function deleteAction(actionId) {
  const actions = loadActions().filter((action) => action.id !== actionId);
  saveActions(actions);
  return actions;
}

export function buildProfessionalContext(experience) {
  const summary = memorySummary(experience);
  const actions = loadActions().filter((action) => action.experience === experience && action.status !== 'done').slice(0, 8);
  return {
    summary,
    open_actions: actions,
    boundary: 'IndiCare.ai supports adults with thinking, writing, reflection, collaboration and preparation. It is not the OS child-record intelligence layer.',
  };
}
