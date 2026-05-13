import type { AssistantWorkspaceData, MagicNote } from './types'

export const assistantWorkspaceDemoData: AssistantWorkspaceData = {
  apps: [
    { id: 'chat', label: 'Chat', description: 'ChatGPT-style care assistant workspace', status: 'ready' },
    { id: 'chronology', label: 'Chronology', description: 'Search, summarise and evidence chronology patterns', status: 'ready' },
    { id: 'reports', label: 'Reports', description: 'Report drafting, review and evidence collection', status: 'ready' },
    { id: 'reg44', label: 'Reg 44', description: 'Reg 44 action plans and independent visitor follow-up', status: 'foundation' },
    { id: 'reg45', label: 'Reg 45', description: 'Reg 45 quality-of-care evidence overview and drafts', status: 'foundation' },
    { id: 'lac_review', label: 'LAC Review', description: 'Looked-after child review summaries and evidence gaps', status: 'foundation' },
    { id: 'ofsted', label: 'Ofsted', description: 'SCCIF readiness, evidence packs and inspection questions', status: 'foundation' },
    { id: 'actions', label: 'Actions', description: 'Open, overdue and management oversight actions', status: 'ready' },
    { id: 'evidence', label: 'Evidence', description: 'Evidence quality, gaps and linked records', status: 'ready' },
    { id: 'documents', label: 'Documents', description: 'Documents, extracted text and report attachments', status: 'ready' },
    { id: 'projects', label: 'Projects', description: 'Group chats, notes, records and workflows by outcome', status: 'foundation' },
    { id: 'notes', label: 'Notes', description: 'Magic Notes recording, transcription and care-note drafting', status: 'mock' },
    { id: 'voice', label: 'Voice', description: 'Hey IndiCare voice assistant foundation', status: 'mock' },
    { id: 'calls', label: 'Calls', description: 'Care team, professional and family contact calls', status: 'foundation' }
  ],
  conversations: [
    {
      id: 'conversation-shift-handover',
      title: 'Evening shift handover',
      projectId: 'project-oak-house-evening',
      linkedYoungPersonId: 'yp-1',
      linkedAdultProfileId: 'adult-sarah',
      status: 'pinned',
      updatedAt: '2026-05-13T18:40:00.000Z',
      messages: [
        {
          id: 'handover-user',
          role: 'user',
          content: 'Create a concise evening handover with risks, routines and actions.',
          createdAt: '2026-05-13T18:38:00.000Z'
        },
        {
          id: 'handover-assistant',
          role: 'assistant',
          content: 'I can prepare the handover from linked daily logs, incidents, risk controls and open actions. Confirm the selected home and young person before saving into the formal record.',
          createdAt: '2026-05-13T18:39:00.000Z'
        }
      ]
    },
    {
      id: 'conversation-safeguarding-chronology',
      title: 'Safeguarding chronology review',
      projectId: 'project-safeguarding-chronology',
      linkedYoungPersonId: 'yp-2',
      status: 'active',
      updatedAt: '2026-05-13T17:15:00.000Z',
      messages: []
    },
    {
      id: 'conversation-report-polish',
      title: 'Improve placement report wording',
      projectId: 'project-reporting',
      status: 'active',
      updatedAt: '2026-05-12T16:10:00.000Z',
      messages: []
    }
  ],
  projects: [
    {
      id: 'project-oak-house-evening',
      name: 'Oak House evening continuity',
      description: 'Shift handover, overdue actions, incident themes and care-team follow-up.',
      linkedHomeId: 'oak-house',
      linkedYoungPersonIds: ['yp-1', 'yp-2'],
      linkedAdultProfileIds: ['adult-sarah', 'adult-michael'],
      appIds: ['chat', 'chronology', 'actions', 'notes', 'calls'],
      updatedAt: '2026-05-13T18:45:00.000Z'
    },
    {
      id: 'project-safeguarding-chronology',
      name: 'Safeguarding chronology',
      description: 'Chronology building, risk flags, management oversight and professional updates.',
      linkedHomeId: 'oak-house',
      linkedYoungPersonIds: ['yp-2'],
      linkedAdultProfileIds: ['adult-sarah'],
      appIds: ['chat', 'chronology', 'reports', 'evidence'],
      updatedAt: '2026-05-13T15:20:00.000Z'
    },
    {
      id: 'project-reporting',
      name: 'Inspection-ready reporting',
      description: 'Evidence collection, report drafting and missing-section checks.',
      linkedYoungPersonIds: ['yp-1', 'yp-3'],
      linkedAdultProfileIds: ['adult-michael'],
      appIds: ['chat', 'reports', 'reg45', 'ofsted'],
      updatedAt: '2026-05-12T11:50:00.000Z'
    }
  ],
  magicNotes: [
    {
      id: 'magic-note-demo',
      title: 'Keywork reflection - deterministic demo',
      source: 'manual-demo',
      status: 'summarised',
      transcript: 'Young person said they felt calmer after the activity and wanted staff to remind them about the plan before school tomorrow. Staff agreed to check in after breakfast and update the keywork goal.',
      aiSummary: 'The conversation identified improved emotional regulation after a structured activity and a clear request for proactive staff support before school.',
      careNoteDraft: 'During keywork, the young person reflected that they felt calmer after completing the planned activity. They asked staff to remind them of the agreed plan before school tomorrow. Staff agreed to complete a breakfast check-in and update the linked keywork goal.',
      actionsExtracted: ['Breakfast check-in before school', 'Update linked keywork goal', 'Review routine with evening staff'],
      safeguardingRiskFlags: ['Monitor school-transition anxiety', 'Confirm action ownership before handover'],
      exportTargets: ['daily-log', 'keywork', 'incident', 'report'],
      createdAt: '2026-05-13T16:30:00.000Z'
    }
  ],
  voiceSession: {
    id: 'voice-session-demo',
    mode: 'idle',
    wakeWord: 'Hey IndiCare',
    transcriptStream: [
      'Placeholder transcript stream will appear here.',
      'Example: "Summarise today for Oak House."'
    ],
    assistantUtterance: 'I can listen, clarify and draft care-safe wording once speech services are connected.',
    adapters: {
      speechToText: 'mock',
      textToSpeech: 'mock',
      realtimeVoice: 'mock',
      wakeWord: 'mock'
    }
  },
  calls: [
    {
      id: 'call-care-team',
      title: 'Oak House care team huddle',
      callType: 'care-team',
      status: 'foundation',
      videoEnabled: true,
      participants: ['Registered manager', 'Deputy manager', 'Shift lead'],
      meetingNoteId: 'meeting-care-team',
      actionsExtracted: ['Assign medication audit', 'Confirm school transport plan']
    },
    {
      id: 'call-professionals',
      title: 'Social worker planning call',
      callType: 'professionals',
      status: 'scheduled',
      videoEnabled: true,
      participants: ['Social worker', 'Key worker', 'Registered manager'],
      meetingNoteId: 'meeting-professionals',
      actionsExtracted: ['Prepare chronology extract', 'Share updated risk controls']
    },
    {
      id: 'call-family-contact',
      title: 'Family contact preparation',
      callType: 'family-contact',
      status: 'foundation',
      videoEnabled: false,
      participants: ['Family contact coordinator', 'Shift lead'],
      actionsExtracted: ['Record contact outcome', 'Add follow-up observation']
    }
  ],
  meetingNotes: [
    {
      id: 'meeting-care-team',
      title: 'Care team huddle notes',
      linkedCallSessionId: 'call-care-team',
      summary: 'Operational check-in covering medication audit, appointments, routines and evening handover risks.',
      decisions: ['Shift lead owns handover completion', 'Deputy manager reviews medication audit'],
      actions: ['Complete audit by 20:00', 'Add school transport note to daily log'],
      createdAt: '2026-05-13T14:00:00.000Z'
    },
    {
      id: 'meeting-professionals',
      title: 'Professional planning notes',
      linkedCallSessionId: 'call-professionals',
      summary: 'Prepare a concise evidence pack before the planning call.',
      decisions: ['Use chronology extract as the agenda anchor'],
      actions: ['Draft chronology summary', 'Attach latest risk controls'],
      createdAt: '2026-05-13T12:00:00.000Z'
    }
  ],
  adultProfiles: [
    {
      id: 'adult-sarah',
      name: 'Sarah Ahmed',
      profileType: 'staff',
      role: 'Registered manager',
      permissions: ['records:read', 'reports:read', 'assistant:access', 'settings:manage'],
      conversations: ['conversation-shift-handover', 'conversation-safeguarding-chronology'],
      notes: ['Manager oversight note', 'Safeguarding threshold review'],
      tasks: ['Review chronology', 'Approve report draft'],
      meetings: ['Care team huddle', 'Professional planning call'],
      documents: ['Ofsted evidence pack', 'Risk management policy'],
      auditActivity: ['Reviewed incident follow-up', 'Approved keywork summary', 'Opened assistant workspace']
    },
    {
      id: 'adult-michael',
      name: 'Michael Reed',
      profileType: 'staff',
      role: 'Shift lead',
      permissions: ['records:read', 'assistant:access'],
      conversations: ['conversation-shift-handover'],
      notes: ['Evening handover note', 'Daily log review'],
      tasks: ['Complete breakfast check-in', 'Confirm transport plan'],
      meetings: ['Care team huddle'],
      documents: ['Shift planner'],
      auditActivity: ['Created daily log', 'Updated handover action']
    }
  ],
  productivityTasks: [
    {
      id: 'task-message-triage',
      title: 'Triage new professional messages',
      area: 'messages',
      status: 'todo',
      dueLabel: 'Today',
      owner: 'Registered manager',
      linkedRecord: 'Oak House inbox'
    },
    {
      id: 'task-calendar-review',
      title: 'Confirm statutory review attendance',
      area: 'calendar',
      status: 'in-progress',
      dueLabel: 'Tomorrow',
      owner: 'Deputy manager',
      linkedRecord: 'Review meeting'
    },
    {
      id: 'task-care-records',
      title: 'Export Magic Note to keywork and daily log',
      area: 'care-records',
      status: 'todo',
      dueLabel: 'Before handover',
      owner: 'Shift lead',
      linkedRecord: 'magic-note-demo'
    },
    {
      id: 'task-documents',
      title: 'Attach latest risk controls to evidence pack',
      area: 'documents',
      status: 'blocked',
      dueLabel: 'This shift',
      owner: 'Registered manager',
      linkedRecord: 'Safeguarding chronology'
    }
  ],
  careContext: {
    selectedHome: 'Oak House',
    currentContext: 'Evening shift continuity and safeguarding oversight',
    linkedYoungPerson: 'Ava M. - high risk, open keywork goal',
    linkedAdultProfile: 'Sarah Ahmed - registered manager',
    recentNotes: [
      'Daily log: settled after structured activity',
      'Keywork: requested morning reminder before school',
      'Incident follow-up: no new escalation recorded'
    ],
    safetyReminders: [
      'Confirm export destination before saving AI drafted notes',
      'Review safeguarding threshold before professional sharing',
      'Do not rely on placeholder voice/call features for live care decisions'
    ]
  }
}

export function createDeterministicMagicNote(source: MagicNote['source']): MagicNote {
  return {
    ...assistantWorkspaceDemoData.magicNotes[0],
    id: `magic-note-${source}`,
    source,
    status: 'summarised',
    title: source === 'recording' ? 'Recorded Magic Note - placeholder' : 'Uploaded Magic Note - placeholder',
    createdAt: '2026-05-13T19:20:00.000Z'
  }
}
