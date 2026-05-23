import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { StaffUser } from '@/lib/auth/types'
import { normaliseRole, userHasAnyPermission } from '@/lib/auth/permissions'

export type OperationalDomain =
  | 'command-centre'
  | 'children'
  | 'daily-care'
  | 'chronology'
  | 'actions'
  | 'workforce'
  | 'governance'
  | 'documents'
  | 'reports'
  | 'orb'
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
    label: 'Care Hub',
    description: 'Daily operational landing page for home view, handover, actions, safeguarding posture and ORB briefing.',
    icon: Gauge,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['command-centre']
  },
  {
    domain: 'children',
    href: '/young-people',
    label: 'Children',
    description: 'One child-centred journey for profile, voice, wellbeing, relationships, plans and records.',
    icon: UserRound,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['home', 'dashboard', 'workspace', 'young-people', 'children', 'life_echo']
  },
  {
    domain: 'daily-care',
    href: '/record',
    label: 'Record',
    description: 'Choose what to record — daily notes, incidents, safeguarding, handover and more.',
    icon: ClipboardList,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['record', 'daily-logs', 'handover', 'keywork', 'shifts']
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
    domain: 'actions',
    href: '/actions',
    label: 'Actions',
    description: 'Open actions and follow-up from daily care, incidents and reviews.',
    icon: ClipboardCheck,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['actions', 'intelligence-actions']
  },
  {
    domain: 'documents',
    href: '/documents',
    label: 'Documents',
    description: 'Child-centred documents, templates, evidence, chronology links and sign-off.',
    icon: FolderOpen,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['documents', 'evidence', 'plans', 'risk-assessments']
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
    domain: 'governance',
    href: '/intelligence/governance/ai',
    label: 'AI Governance',
    description: 'IndiCare Intelligence usage, quality, cost, safety and source observability.',
    icon: Sparkles,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['intelligence']
  },
  {
    domain: 'governance',
    href: '/intelligence/governance/privacy',
    label: 'AI Privacy',
    description: 'Privacy guard decisions, redaction metrics and export governance.',
    icon: ShieldCheck,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['intelligence']
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
    href: '/assistant/orb',
    label: 'ORB',
    description: 'Live operational intelligence with role, scope, record context and evidence citations.',
    icon: Sparkles,
    permissions: ['assistant:access'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['assistant']
  },
  {
    domain: 'admin',
    href: '/settings',
    label: 'Admin',
    description: 'Users, roles, homes, forms, templates, integrations, audit logs, health and ORB configuration.',
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
  { label: 'LifeEcho', href: (id: string) => `/young-people/${encodeURIComponent(id)}/life_echo` },
  { label: 'About Me', href: (id: string) => `/young-people/${encodeURIComponent(id)}/about-me/new` },
  { label: 'Child Voice', href: (id: string) => `/young-people/${encodeURIComponent(id)}/child-voice/new` },
  { label: 'Wellbeing', href: (id: string) => `/young-people/${encodeURIComponent(id)}/wellbeing-check/new` },
  { label: 'Relationships', href: (id: string) => `/young-people/${encodeURIComponent(id)}/relationship-record/new` },
  { label: 'Records', href: (id: string) => `/young-people/${encodeURIComponent(id)}` },
  { label: 'Daily Note', href: (id: string) => `/young-people/${encodeURIComponent(id)}/daily-note/new` },
  { label: 'Handover', href: (id: string) => `/young-people/${encodeURIComponent(id)}/shift-handover/new` },
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
