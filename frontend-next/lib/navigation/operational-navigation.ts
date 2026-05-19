import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  HeartPulse,
  SearchCheck,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  UsersRound,
  Siren,
  ListTodo
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { StaffUser } from '@/lib/auth/types'
import { normaliseRole, userHasAnyPermission } from '@/lib/auth/permissions'

export type OperationalDomain =
  | 'command-centre'
  | 'children'
  | 'daily-care'
  | 'chronology'
  | 'plans'
  | 'wellbeing'
  | 'incidents'
  | 'education'
  | 'health'
  | 'calendar'
  | 'workforce'
  | 'governance'
  | 'inspection'
  | 'documents'
  | 'reports'
  | 'orb'
  | 'notifications'
  | 'tasks'
  | 'admin'

export type OperationalRole = 'rm' | 'ri' | 'staff' | 'provider' | 'admin'

export type OperationalNavItem = {
  domain: OperationalDomain
  href: string
  label: string
  description: string
  icon: LucideIcon
  permissions: string[]
  roleScopes: OperationalRole[]
  activeRoots: string[]
  requiresChild?: boolean
}

export type OperationalUtilityItem = {
  id: 'notifications' | 'shift' | 'reviews'
  href: string
  label: string
  icon: LucideIcon
  permissions: string[]
  requiresChild?: boolean
  activeRoots: string[]
}

export const operationalFeatureFlags = {
  unifiedOperationalShell: process.env.NEXT_PUBLIC_UNIFIED_OPERATIONAL_SHELL !== '0',
  unifiedCommandCentre: process.env.NEXT_PUBLIC_UNIFIED_COMMAND_CENTRE !== '0',
  embeddedOrbPanel: process.env.NEXT_PUBLIC_CONTEXTUAL_ORB_PANEL !== '0',
  unifiedOperationalSearch: process.env.NEXT_PUBLIC_UNIFIED_OPERATIONAL_SEARCH !== '0'
}

export const operationalNavigation: OperationalNavItem[] = [
  {
    domain: 'command-centre',
    href: '/command-centre',
    label: 'Command Centre',
    description: 'Leadership view across workforce, children, governance, safeguarding and inspection readiness.',
    icon: Gauge,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['command-centre']
  },
  {
    domain: 'children',
    href: '/young-people',
    label: 'Children',
    description: 'Child journeys, records, chronology, plans, risks and documents.',
    icon: UserRound,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['home', 'dashboard', 'workspace', 'young-people', 'children']
  },
  {
    domain: 'daily-care',
    href: '/daily-logs',
    label: 'Daily Care',
    description: 'Daily notes, handovers, keywork, routines and reflective recording.',
    icon: ClipboardList,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['daily-logs', 'handover', 'keywork', 'shifts']
  },
  {
    domain: 'chronology',
    href: '/chronology',
    label: 'Chronology',
    description: 'Meaning over time across events, evidence, actions and trajectories.',
    icon: CalendarDays,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['chronology']
  },
  {
    domain: 'plans',
    href: '/documents?scope=plans',
    label: 'Plans',
    description: 'Care plans, risk plans, placement plans and review documents.',
    icon: ClipboardCheck,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['plans', 'risk-assessments']
  },
  {
    domain: 'wellbeing',
    href: '/wellbeing',
    label: 'Wellbeing',
    description: 'Child and workforce wellbeing posture from chronology and Workforce OS.',
    icon: HeartPulse,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['wellbeing']
  },
  {
    domain: 'incidents',
    href: '/incidents',
    label: 'Incidents',
    description: 'Incident review, safeguarding links, actions and reflective follow-up.',
    icon: Siren,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['incidents', 'safeguarding']
  },
  {
    domain: 'education',
    href: '/education',
    label: 'Education',
    description: 'Education engagement, school themes and progress evidence.',
    icon: BookOpen,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['education']
  },
  {
    domain: 'health',
    href: '/health',
    label: 'Health',
    description: 'Health, medication, appointments and emotional regulation context.',
    icon: Stethoscope,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['health', 'medication', 'appointments']
  },
  {
    domain: 'calendar',
    href: '/calendar',
    label: 'Calendar',
    description: 'Appointments, handovers and operational continuity by date.',
    icon: CalendarDays,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['calendar', 'appointments']
  },
  {
    domain: 'workforce',
    href: '/staff',
    label: 'Workforce',
    description: 'Staff directory, wellbeing, risk, training, supervision and recording quality.',
    icon: UsersRound,
    permissions: ['staff:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['staff']
  },
  {
    domain: 'governance',
    href: '/governance/command-centre',
    label: 'Governance',
    description: 'Reg 44, Reg 45, management oversight, evidence gaps and governance risk.',
    icon: ShieldCheck,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['governance', 'management', 'reg44']
  },
  {
    domain: 'inspection',
    href: '/ofsted-readiness',
    label: 'Inspection',
    description: 'Inspection readiness, SCCIF evidence and regulatory preparation.',
    icon: SearchCheck,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['ofsted-readiness', 'regulatory']
  },
  {
    domain: 'documents',
    href: '/documents',
    label: 'Documents',
    description: 'Documents, evidence, templates and source material.',
    icon: FolderOpen,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['documents', 'evidence']
  },
  {
    domain: 'tasks',
    href: '/actions',
    label: 'Tasks',
    description: 'Operational actions, follow-up and review commitments.',
    icon: ListTodo,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['actions', 'tasks']
  },
  {
    domain: 'notifications',
    href: '/notifications',
    label: 'Notifications',
    description: 'Provider-scoped alerts, messages and operational notifications.',
    icon: Bell,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['notifications', 'connect']
  },
  {
    domain: 'reports',
    href: '/reports',
    label: 'Reports',
    description: 'Reports, reviews, LAC review packs and regulatory reports.',
    icon: FileText,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['reports']
  },
  {
    domain: 'orb',
    href: '/orb',
    label: 'ORB',
    description: 'Live operational intelligence with role, scope, record context and evidence citations.',
    icon: Sparkles,
    permissions: ['assistant:access'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['orb', 'assistant', 'voice', 'settings']
  },
  {
    domain: 'admin',
    href: '/settings',
    label: 'Admin',
    description: 'Settings, users, profile and ORB configuration.',
    icon: Settings,
    permissions: ['settings:read', 'settings:manage', 'users:manage'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['settings', 'profile', 'setup', 'schema-live']
  }
]

export const operationalUtilities: OperationalUtilityItem[] = [
  { id: 'notifications', href: '/notifications', label: 'Notifications', icon: Bell, permissions: ['records:read'], requiresChild: true, activeRoots: ['notifications'] },
  { id: 'shift', href: '/shifts/current', label: 'Shift', icon: ClipboardCheck, permissions: ['records:read'], requiresChild: true, activeRoots: ['shifts', 'handover'] },
  { id: 'reviews', href: '/management', label: 'Reviews', icon: Building2, permissions: ['reports:read'], activeRoots: ['management'] }
]

export const childWorkspaceNavigation = [
  { label: 'Journey', href: (id: string) => `/young-people/${encodeURIComponent(id)}/journey` },
  { label: 'Records', href: (id: string) => `/young-people/${encodeURIComponent(id)}` },
  { label: 'Daily Note', href: (id: string) => `/young-people/${encodeURIComponent(id)}/daily-note/new` },
  { label: 'Chronology', href: (id: string) => `/young-people/${encodeURIComponent(id)}/chronology` },
  { label: 'Safeguarding', href: (id: string) => `/safeguarding?young_person_id=${encodeURIComponent(id)}` },
  { label: 'Plans', href: (id: string) => `/documents?young_person_id=${encodeURIComponent(id)}&scope=plans` },
  { label: 'Risks', href: (id: string) => `/risk-assessments?young_person_id=${encodeURIComponent(id)}` },
  { label: 'Documents', href: (id: string) => `/documents?young_person_id=${encodeURIComponent(id)}` },
  { label: 'Reviews', href: (id: string) => `/reports?young_person_id=${encodeURIComponent(id)}&type=review` }
]

export function operationalRoleForUser(user: StaffUser | null | undefined): OperationalRole {
  const role = normaliseRole(user?.role)
  if (role === 'admin') return 'admin'
  if (role === 'responsible_individual') return 'ri'
  if (role === 'provider') return 'provider'
  if (role === 'manager') return 'rm'
  return 'staff'
}

export function visibleOperationalNavigation(user: StaffUser | null | undefined) {
  const role = operationalRoleForUser(user)
  return operationalNavigation.filter((item) => item.roleScopes.includes(role) && userHasAnyPermission(user, item.permissions))
}

export function visibleOperationalUtilities(user: StaffUser | null | undefined) {
  return operationalUtilities.filter((item) => userHasAnyPermission(user, item.permissions))
}

export function isOperationalNavItemActive(item: Pick<OperationalNavItem | OperationalUtilityItem, 'activeRoots' | 'href'>, pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const root = parts[0] || 'young-people'
  if (item.activeRoots.includes(root)) return true
  return pathname === item.href || pathname.startsWith(item.href)
}

export function hrefForOperationalItem(
  item: OperationalNavItem | OperationalUtilityItem,
  activeChildId: string | undefined,
  childScopedHref: (href: string) => string
) {
  const encodedChildId = activeChildId ? encodeURIComponent(activeChildId) : null
  if (item.href === '/documents' && encodedChildId) return `/documents?young_person_id=${encodedChildId}`
  if ('requiresChild' in item && item.requiresChild && !encodedChildId && item.href !== '/young-people') return '/young-people'
  return item.requiresChild ? childScopedHref(item.href) : item.href
}
