import type {
  AbuseIndicator,
  AdminHome,
  AdminProvider,
  AdminUser,
  AuditLogEntry,
  MarketingLead,
  OffboardingWorkflow,
  OnboardingWorkflow,
  SafetyFlag,
  SupportTicket,
  UsageActivity
} from './types'

export const DEMO_USERS: AdminUser[] = [
  {
    id: 'usr-001',
    name: 'Sarah Mitchell',
    email: 's.mitchell@orbresidential.demo',
    role: 'manager',
    provider: 'Northbridge Care Group',
    home: 'Willow House',
    status: 'active',
    lastLogin: '2026-06-25T08:42:00Z',
    createdAt: '2025-11-12T10:00:00Z',
    riskFlags: []
  },
  {
    id: 'usr-002',
    name: 'James Okonkwo',
    email: 'j.okonkwo@orbresidential.demo',
    role: 'support_worker',
    provider: 'Northbridge Care Group',
    home: 'Willow House',
    status: 'active',
    lastLogin: '2026-06-24T16:20:00Z',
    createdAt: '2026-01-08T09:30:00Z',
    riskFlags: []
  },
  {
    id: 'usr-003',
    name: 'Emma Clarke',
    email: 'e.clarke@havenhomes.demo',
    role: 'manager',
    provider: 'Haven Homes Ltd',
    home: 'Oak View',
    status: 'invited',
    lastLogin: null,
    createdAt: '2026-06-20T14:00:00Z',
    riskFlags: []
  },
  {
    id: 'usr-004',
    name: 'David Hughes',
    email: 'd.hughes@orbresidential.demo',
    role: 'support_worker',
    provider: 'Northbridge Care Group',
    home: 'Willow House',
    status: 'disabled',
    lastLogin: '2026-05-10T11:05:00Z',
    createdAt: '2025-09-01T08:00:00Z',
    riskFlags: ['offboarding']
  },
  {
    id: 'usr-005',
    name: 'Priya Sharma',
    email: 'p.sharma@orbresidential.demo',
    role: 'support_worker',
    provider: 'Riverside Respite',
    home: 'Meadow Lodge',
    status: 'suspended',
    lastLogin: '2026-06-18T09:15:00Z',
    createdAt: '2026-02-14T12:00:00Z',
    riskFlags: ['safety-review', 'repeated-high-risk']
  }
]

export const DEMO_PROVIDERS: AdminProvider[] = [
  {
    id: 'prv-001',
    name: 'Northbridge Care Group',
    status: 'active',
    homesCount: 2,
    usersCount: 18,
    onboardingStage: 'Live',
    subscriptionStatus: 'Pilot (placeholder)',
    riskFlags: [],
    supportFlags: []
  },
  {
    id: 'prv-002',
    name: 'Haven Homes Ltd',
    status: 'onboarding',
    homesCount: 1,
    usersCount: 3,
    onboardingStage: 'Manager invited',
    subscriptionStatus: 'Trial (placeholder)',
    riskFlags: [],
    supportFlags: ['onboarding-help']
  },
  {
    id: 'prv-003',
    name: 'Riverside Respite',
    status: 'active',
    homesCount: 1,
    usersCount: 8,
    onboardingStage: 'Live',
    subscriptionStatus: 'Pilot (placeholder)',
    riskFlags: ['safety-review'],
    supportFlags: []
  }
]

export const DEMO_HOMES: AdminHome[] = [
  {
    id: 'hom-001',
    name: 'Willow House',
    provider: 'Northbridge Care Group',
    registeredManager: 'Sarah Mitchell',
    status: 'live',
    usersCount: 12,
    activeStations: ['chat', 'write', 'dictate', 'voice'],
    onboardingStatus: 'Complete',
    riskFlags: []
  },
  {
    id: 'hom-002',
    name: 'Oak View',
    provider: 'Haven Homes Ltd',
    registeredManager: '—',
    status: 'onboarding',
    usersCount: 3,
    activeStations: ['chat', 'write'],
    onboardingStatus: 'Manager pending',
    riskFlags: []
  },
  {
    id: 'hom-003',
    name: 'Meadow Lodge',
    provider: 'Riverside Respite',
    registeredManager: 'Tom Fletcher',
    status: 'pilot',
    usersCount: 8,
    activeStations: ['chat', 'write', 'communicate'],
    onboardingStatus: 'Pilot',
    riskFlags: ['safety-review']
  }
]

export const DEMO_SAFETY_FLAGS: SafetyFlag[] = [
  {
    id: 'sf-001',
    type: 'fabricated-record-request',
    status: 'open',
    severity: 'high',
    user: 'Priya Sharma',
    provider: 'Riverside Respite',
    home: 'Meadow Lodge',
    createdAt: '2026-06-24T14:32:00Z',
    summary: 'Prompt pattern suggests request to fabricate incident details — metadata only, no record content shown.'
  },
  {
    id: 'sf-002',
    type: 'unsafe-safeguarding-wording',
    status: 'reviewing',
    severity: 'medium',
    user: 'James Okonkwo',
    provider: 'Northbridge Care Group',
    home: 'Willow House',
    createdAt: '2026-06-23T09:10:00Z',
    summary: 'Safeguarding language flagged for review — operational signal, not automated decision.'
  },
  {
    id: 'sf-003',
    type: 'abusive-prompt',
    status: 'resolved',
    severity: 'low',
    user: 'Unknown (session)',
    provider: '—',
    home: '—',
    createdAt: '2026-06-20T18:45:00Z',
    summary: 'Inappropriate prompt category detected and blocked.'
  }
]

export const DEMO_ABUSE_INDICATORS: AbuseIndicator[] = [
  {
    id: 'ab-001',
    type: 'failed-login-spike',
    status: 'open',
    severity: 'medium',
    subject: 'd.hughes@orbresidential.demo',
    detail: '12 failed login attempts in 30 minutes',
    createdAt: '2026-06-25T07:00:00Z'
  },
  {
    id: 'ab-002',
    type: 'rate-limit-warning',
    status: 'investigating',
    severity: 'high',
    subject: 'IP 203.0.113.42',
    detail: 'API rate limit threshold exceeded on /api/orb/chat',
    createdAt: '2026-06-24T22:15:00Z'
  },
  {
    id: 'ab-003',
    type: 'disposable-email',
    status: 'open',
    severity: 'low',
    subject: 'temp-mail@guerrillamail.demo',
    detail: 'Signup attempt with disposable email domain',
    createdAt: '2026-06-24T11:30:00Z'
  }
]

export const DEMO_ONBOARDING: OnboardingWorkflow[] = [
  {
    id: 'onb-001',
    provider: 'Haven Homes Ltd',
    home: 'Oak View',
    checklist: {
      'provider-created': true,
      'home-created': true,
      'manager-invited': true,
      'staff-invited': false,
      'roles-assigned': false,
      'safeguarding-accepted': false,
      'first-orb-use': false,
      'first-test-record': false,
      'training-completed': false,
      'ready-for-pilot': false
    },
    overallProgress: 30
  },
  {
    id: 'onb-002',
    provider: 'Northbridge Care Group',
    home: 'Elm Cottage',
    checklist: {
      'provider-created': true,
      'home-created': true,
      'manager-invited': true,
      'staff-invited': true,
      'roles-assigned': true,
      'safeguarding-accepted': true,
      'first-orb-use': true,
      'first-test-record': true,
      'training-completed': true,
      'ready-for-pilot': true
    },
    overallProgress: 100
  }
]

export const DEMO_OFFBOARDING: OffboardingWorkflow[] = [
  {
    id: 'off-001',
    provider: 'Northbridge Care Group',
    home: 'Willow House',
    leavingReason: 'Staff member departure',
    steps: {
      'disable-access': 'completed',
      'revoke-sessions': 'completed',
      'export-data': 'pending',
      'retention-status': 'completed',
      'deletion-scheduled': 'n/a'
    },
    finalStatus: 'In progress'
  }
]

export const DEMO_MARKETING_LEADS: MarketingLead[] = [
  {
    id: 'mkt-001',
    type: 'demo-request',
    contact: 'Helen Wright',
    organisation: 'Summit Care Services',
    stage: 'demo-booked',
    source: 'Website',
    createdAt: '2026-06-22T10:00:00Z',
    nextAction: 'Demo 28 Jun — send prep pack'
  },
  {
    id: 'mkt-002',
    type: 'pilot-request',
    contact: 'Mark Davies',
    organisation: 'Coastal Respite Ltd',
    stage: 'contacted',
    source: 'Referral',
    createdAt: '2026-06-18T15:30:00Z',
    nextAction: 'Follow up on pilot scope'
  },
  {
    id: 'mkt-003',
    type: 'newsletter',
    contact: 'info@caresector.demo',
    organisation: '—',
    stage: 'new',
    source: 'Landing page',
    createdAt: '2026-06-25T06:00:00Z',
    nextAction: 'Add to nurture sequence'
  }
]

export const DEMO_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'sup-001',
    type: 'password-reset',
    subject: 'Manager cannot reset password',
    requester: 'Emma Clarke',
    provider: 'Haven Homes Ltd',
    status: 'pending',
    createdAt: '2026-06-25T09:00:00Z',
    priority: 'medium'
  },
  {
    id: 'sup-002',
    type: 'invite-issue',
    subject: 'Staff invite link expired',
    requester: 'Sarah Mitchell',
    provider: 'Northbridge Care Group',
    status: 'in-progress',
    createdAt: '2026-06-24T14:20:00Z',
    priority: 'low'
  },
  {
    id: 'sup-003',
    type: 'escalation',
    subject: 'Safety flag review requested',
    requester: 'Tom Fletcher',
    provider: 'Riverside Respite',
    status: 'escalated',
    createdAt: '2026-06-24T16:00:00Z',
    priority: 'high'
  }
]

export const DEMO_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: 'aud-001',
    actor: 'admin@indicare.co.uk',
    action: 'Viewed user list',
    targetType: 'users',
    target: '—',
    timestamp: '2026-06-25T08:30:00Z',
    riskLevel: 'low',
    reason: 'Routine operational review',
    status: 'completed'
  },
  {
    id: 'aud-002',
    actor: 'admin@indicare.co.uk',
    action: 'Flagged safety review',
    targetType: 'safety_flag',
    target: 'sf-001',
    timestamp: '2026-06-24T15:00:00Z',
    riskLevel: 'high',
    reason: 'Escalated for founder review',
    status: 'completed'
  },
  {
    id: 'aud-003',
    actor: 'system',
    action: 'Session revoked',
    targetType: 'user',
    target: 'usr-004',
    timestamp: '2026-06-23T11:00:00Z',
    riskLevel: 'medium',
    reason: 'Offboarding workflow step',
    status: 'completed'
  }
]

export const DEMO_USAGE_ACTIVITY: UsageActivity[] = [
  {
    id: 'act-001',
    user: 'Sarah Mitchell',
    station: 'write',
    action: 'Session started',
    timestamp: '2026-06-25T08:42:00Z',
    metadataOnly: true
  },
  {
    id: 'act-002',
    user: 'James Okonkwo',
    station: 'chat',
    action: 'Request completed',
    timestamp: '2026-06-25T08:38:00Z',
    metadataOnly: true
  },
  {
    id: 'act-003',
    user: 'Tom Fletcher',
    station: 'dictate',
    action: 'Session started',
    timestamp: '2026-06-25T08:15:00Z',
    metadataOnly: true
  }
]
