const FIX_STATE = { busy: false };

bootLiveContextAssistantFix();

function bootLiveContextAssistantFix() {
  document.addEventListener('click', interceptAssistantSend, true);
  document.addEventListener('keydown', interceptAssistantEnter, true);
}

function interceptAssistantSend(event) {
  if (!event.target.closest?.('#ic-send-assistant')) return;
  const handled = answerIfLiveContextQuestion();
  if (!handled) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function interceptAssistantEnter(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.target?.id !== 'ic-assistant-input') return;
  const handled = answerIfLiveContextQuestion();
  if (!handled) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function answerIfLiveContextQuestion() {
  if (FIX_STATE.busy) return true;
  const input = document.getElementById('ic-assistant-input');
  const text = input?.value?.trim();
  if (!text) return false;
  if (!/chronolog|timeline|history|safeguard|risk|concern/i.test(text)) return false;

  const context = scopedContext();
  const answer = /chronolog|timeline|history/i.test(text)
    ? chronologyAnswer(text, context)
    : safeguardingAnswer(text, context);
  if (!answer) return false;

  input.value = '';
  appendBubble('user', text);
  appendBubble('assistant', answer);
  return true;
}

function scopedContext() {
  const raw = window.IndiCareLiveContext || {};
  const context = {
    children: arrayFrom(raw.children || raw.items || raw.young_people || raw.youngPeople),
    documents: arrayFrom(raw.documents || raw.records || raw.recordings),
    chronology: arrayFrom(raw.chronology || raw.timeline || raw.events),
    safeguarding: arrayFrom(raw.safeguarding || raw.alerts || raw.risks || raw.concerns),
  };
  const selected = new Set((window.IndiCareOperationalSession?.selectedChildren || []).map(String));
  if (!selected.size) return context;
  const children = context.children.filter((child) => selected.has(childKey(child)));
  const ids = new Set(children.map(childKey));
  const names = new Set(children.map((child) => normalise(childName(child))));
  const linked = (item) => !ids.size || ids.has(String(item.young_person_id || item.child_id || item.childId || item.youngPersonId || item.child || '')) || names.has(normalise(item.childName || item.child_name || item.young_person_name || item.name || ''));
  return { ...context, children, documents: context.documents.filter(linked), chronology: context.chronology.filter(linked), safeguarding: context.safeguarding.filter(linked) };
}

function chronologyAnswer(question, context) {
  const child = findChild(question, context.children);
  const name = child ? childName(child) : 'the loaded young people';
  const chronology = linkedItems(child, context.chronology);
  const documents = linkedItems(child, context.documents).filter(isChronologyRelevant);
  const safeguarding = linkedItems(child, context.safeguarding);
  const rows = [
    ...chronology.map((item) => ({ item, source: 'Chronology', date: itemDate(item) })),
    ...documents.map((item) => ({ item, source: 'Record', date: itemDate(item) })),
    ...safeguarding.map((item) => ({ item, source: 'Safeguarding', date: itemDate(item) })),
  ].sort((a, b) => a.date - b.date).slice(-20);

  if (!rows.length) {
    return `## Chronology for ${escapeHtml(name)}\n\n**Known from records**\nNo linked chronology entries, records or safeguarding items for ${escapeHtml(name)} were returned in the live OS context.\n\n**Missing evidence**\n- Young people loaded: ${context.children.length}\n- Chronology entries loaded: ${context.chronology.length}\n- Records loaded: ${context.documents.length}\n- Safeguarding items loaded: ${context.safeguarding.length}\n\n**Recommended staff/manager action**\n- Check ${escapeHtml(name)} is selected in the Start Shift session.\n- Check chronology records are linked by young person ID or name.\n- Refresh live OS data before relying on this summary.`;
  }

  return `## Chronology for ${escapeHtml(name)}\n\n**Known from records**\n${rows.map(({ item, source }) => `- **${formatDate(itemDate(item)) || 'Date not recorded'}** — ${source}: ${escapeHtml(summary(item))}`).join('\n')}\n\n**Professional interpretation**\nThis chronology is generated only from the live OS context currently loaded in the authorised workspace. Staff should review the original records before management decisions.\n\n**Missing evidence**\n- Entries without dates may appear as “Date not recorded”.\n- Records not linked to ${escapeHtml(name)} by ID or name will not appear here.\n\n**Recommended staff/manager action**\n- Confirm key events are linked into chronology.\n- Check safeguarding items have management oversight and follow-up actions.\n- Add chronology links where relevant records are missing from this view.`;
}

function safeguardingAnswer(question, context) {
  const child = findChild(question, context.children);
  const name = child ? childName(child) : 'the loaded young people';
  const items = linkedItems(child, context.safeguarding);
  if (!items.length) {
    return `## Safeguarding context for ${escapeHtml(name)}\n\n**Known from records**\nNo safeguarding items were returned in the live OS context for ${escapeHtml(name)}.\n\n**Missing evidence**\nSafeguarding records may be absent, closed, unlinked, or not loaded for this session.\n\n**Recommended staff/manager action**\nRefresh the OS context and check the safeguarding workspace directly before relying on this summary.`;
  }
  return `## Safeguarding context for ${escapeHtml(name)}\n\n**Known from records**\n${items.slice(0, 12).map((item) => `- **${formatDate(itemDate(item)) || 'Date not recorded'}** — ${escapeHtml(summary(item))}`).join('\n')}\n\n**Recommended staff/manager action**\n- Confirm immediate safety actions are recorded.\n- Confirm who has been informed.\n- Confirm chronology links and manager oversight are complete.`;
}

function appendBubble(role, text) {
  const messages = document.getElementById('ic-assistant-messages');
  if (!messages) return;
  const node = document.createElement('article');
  node.style.cssText = `max-width:900px;justify-self:${role === 'user' ? 'end' : 'start'};background:${role === 'user' ? '#075fd1' : '#fff'};color:${role === 'user' ? '#fff' : '#0f172a'};border:1px solid #dbe4f0;border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.06);overflow-wrap:anywhere;`;
  node.innerHTML = `<strong style="display:block;margin-bottom:8px;">${role === 'user' ? 'You' : 'IndiCare AI'}</strong><div class="ic-assistant-rendered" style="line-height:1.7;">${renderText(text)}</div>`;
  messages.appendChild(node);
  messages.scrollTop = messages.scrollHeight;
}

function findChild(question, children) {
  const q = normalise(question);
  return (children || []).find((child) => {
    const name = normalise(childName(child));
    const parts = name.split(' ').filter((part) => part.length > 2);
    return q.includes(name) || parts.some((part) => q.includes(part));
  }) || null;
}

function linkedItems(child, items) {
  const list = Array.isArray(items) ? items : [];
  if (!child) return list;
  const id = childKey(child);
  const name = normalise(childName(child));
  return list.filter((item) => {
    const itemId = String(item.young_person_id || item.child_id || item.childId || item.youngPersonId || item.child || '');
    const itemName = normalise(item.childName || item.child_name || item.young_person_name || item.name || '');
    return (itemId && itemId === id) || (itemName && (itemName === name || name.includes(itemName) || itemName.includes(name)));
  });
}

function isChronologyRelevant(item) { return /incident|missing|safeguarding|risk|direct|daily|handover|chronology|education|health|family|contact/i.test(`${item.type || ''} ${item.record_type || ''} ${item.category || ''} ${item.title || ''}`); }
function summary(item) { return item.title || item.summary || item.description || item.narrative || item.notes || item.category || item.type || 'Recorded item'; }
function itemDate(item) { return Date.parse(item.occurred_at || item.event_datetime || item.updated_at || item.created_at || item.createdAt || item.date || 0); }
function formatDate(value) { if (!value || !Number.isFinite(Number(value))) return ''; try { return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(Number(value))); } catch { return ''; } }
function childKey(child) { return String(child.id || child.young_person_id || child.child_id || child.youngPersonId || childName(child)); }
function childName(child) { return child.name || child.full_name || child.preferred_name || child.young_person_name || [child.first_name, child.last_name].filter(Boolean).join(' ') || 'Young person'; }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function normalise(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function renderText(value) { const safe = escapeHtml(value || '').replace(/^## (.*)$/gm, '<h2 style="margin:18px 0 8px;font-size:1.16rem;">$1</h2>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); return safe.replace(/^[-*]\s+(.*)$/gm, '<li style="margin:4px 0;">$1</li>').replace(/\n/g, '<br>'); }

window.IndiCareOSAssistantLiveContextFix = { answerIfLiveContextQuestion };
