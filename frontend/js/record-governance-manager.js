import { createCareHubAction } from './care-hub-actions.js';
import { saveEvidenceEntry } from './sccif-outcomes-engine.js';
import { persistWorkflowDecision } from './workflow-audit.js';
import {
  RECORD_LIFECYCLE_STATES,
  canTransition,
  evidenceForRecordType,
  lifecycleLabel,
  normaliseLifecycleState,
} from './workflow-contract.js';

const LOCAL_RECORD_GOVERNANCE_KEY = 'indicare.recordGovernance.v1';

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function getStore() {
  try {
    return safeJsonParse(window.localStorage?.getItem(LOCAL_RECORD_GOVERNANCE_KEY), {});
  } catch (_) {
    return {};
  }
}

function setStore(value) {
  try {
    window.localStorage?.setItem(LOCAL_RECORD_GOVERNANCE_KEY, JSON.stringify(value));
  } catch (_) {}
  return value;
}

function stableId(parts = []) {
  return parts.filter(Boolean).join(':').replace(/[^a-zA-Z0-9:_-]/g, '_');
}

function normaliseRecord(record = {}) {
  const recordType = record.record_type || record.type || 'daily_note';
  const state = normaliseLifecycleState(record.lifecycle_state || record.workflow_status || record.status || record.workflow?.lifecycle_state || 'draft');
  return {
    id: record.id || record.record_id || stableId([recordType, record.created_at, record.title]),
    title: record.title || record.summary || record.presentation || 'Untitled record',
    recordType,
    lifecycle_state: state,
    lifecycle_label: lifecycleLabel(state),
    young_person_id: record.young_person_id || record.youngPersonId || null,
    young_person_name: record.young_person_name || record.youngPersonName || '',
    created_at: record.created_at || nowIso(),
    updated_at: record.updated_at || nowIso(),
    workflow: {
      ...(record.workflow || {}),
      lifecycle_state: state,
    },
    source: record,
  };
}

function mergeRecord(record) {
  const store = getStore();
  store[record.id] = { ...(store[record.id] || {}), ...record, updated_at: nowIso() };
  setStore(store);
  return store[record.id];
}

function defaultActionTypesFor(record) {
  const evidence = evidenceForRecordType(record.recordType);
  const defaults = evidence.defaultActions || ['manager_review'];
  const conditionals = [];
  if (record.recordType === 'incident' || record.recordType === 'missing_episode') {
    conditionals.push('risk_update');
  }
  return [...new Set([...defaults, ...conditionals])];
}

export function recordGovernanceSnapshot(record = {}) {
  const normalised = normaliseRecord(record);
  const stored = getStore()[normalised.id] || {};
  const merged = { ...normalised, ...stored };
  const state = normaliseLifecycleState(merged.lifecycle_state);
  return {
    ...merged,
    lifecycle_state: state,
    lifecycle_label: lifecycleLabel(state),
    next_states: RECORD_LIFECYCLE_STATES[state]?.next || [],
    requires_manager: Boolean(RECORD_LIFECYCLE_STATES[state]?.requiresManager),
    evidence_mapping: evidenceForRecordType(merged.recordType),
  };
}

export async function transitionRecordLifecycle(record = {}, toState, options = {}) {
  const before = recordGovernanceSnapshot(record);
  const fromState = before.lifecycle_state;
  const targetState = normaliseLifecycleState(toState);

  if (!canTransition(fromState, targetState) && fromState !== targetState) {
    throw new Error(`Cannot move record from ${fromState} to ${targetState}.`);
  }

  const after = mergeRecord({
    ...before,
    lifecycle_state: targetState,
    lifecycle_label: lifecycleLabel(targetState),
    reviewed_by: options.reviewed_by || before.reviewed_by || '',
    review_note: options.review_note || before.review_note || '',
    updated_at: nowIso(),
  });

  await persistWorkflowDecision({
    itemId: after.id,
    itemType: 'record',
    action: `lifecycle:${fromState}->${targetState}`,
    before,
    after,
    metadata: {
      record_type: after.recordType,
      young_person_id: after.young_person_id,
    },
  });

  if (['submitted', 'in_review', 'requires_action', 'follow_up'].includes(targetState)) {
    for (const actionType of defaultActionTypesFor(after)) {
      await createCareHubAction({
        type: actionType,
        title: `${lifecycleLabel(targetState)}: ${after.title}`,
        body: `${after.lifecycle_label} required for ${after.title}.`,
        child_id: after.young_person_id,
        child_name: after.young_person_name,
        section_id: after.recordType,
        priority: ['incident', 'missing_episode', 'medication_record'].includes(after.recordType) ? 'high' : 'medium',
        source: 'record_lifecycle',
      });
    }
  }

  if (['quality_sign_off', 'evidence_bank', 'closed'].includes(targetState)) {
    saveEvidenceEntry({
      child_id: after.young_person_id,
      child_name: after.young_person_name,
      source_id: after.id,
      source_type: after.recordType,
      record_id: after.id,
      recordType: after.recordType,
      title: `${after.title} signed into evidence`,
      summary: after.review_note || `${after.title} moved to ${after.lifecycle_label}.`,
      sectionId: after.recordType,
    });
  }

  window.dispatchEvent(new CustomEvent('indicare:record-lifecycle-updated', { detail: after }));
  return after;
}

export function listGovernedRecords() {
  return Object.values(getStore()).sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

export function governanceSummary() {
  const records = listGovernedRecords();
  return records.reduce((summary, record) => {
    const state = normaliseLifecycleState(record.lifecycle_state);
    summary.total += 1;
    summary.by_state[state] = (summary.by_state[state] || 0) + 1;
    if (RECORD_LIFECYCLE_STATES[state]?.requiresManager) summary.requires_manager += 1;
    return summary;
  }, { total: 0, requires_manager: 0, by_state: {} });
}

window.IndiCareRecordGovernanceManager = Object.freeze({
  recordGovernanceSnapshot,
  transitionRecordLifecycle,
  listGovernedRecords,
  governanceSummary,
});
