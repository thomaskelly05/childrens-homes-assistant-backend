import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { StaffUser } from '@/lib/auth/types'
import { normaliseRole, userHasAnyPermission } from '@/lib/auth/permissions'

/** Meaningful main-menu areas — child-centred OS, not module sprawl. */
export type OperationalDomain =
  | 'home'
  | 'children'
  | 'workforce'
  | 'records'
  | 'safeguarding'
  | 'plans'
  | 'reports'
  | 'governance'
  | 'regulation'
  | 'orb'
  | 'settings'
  /** Legacy domain keys still referenced in route matching */
  | 'command-centre'
  | 'daily-care'
  | 'chronology'
  | 'actions'
  | 'documents'
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
  menuGroup?: 'primary' | 'more'
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

/** Global IndiCare OS menu — calm headings that explain the journey. */
export const operationalNavigation: OperationalNavItem[] = [
  {
    domain: 'home',
    href: '/command-centre',
    label: 'Home',
    description: 'Daily operational rhythm — home today, handover and priorities.',
    icon: Gauge,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['command-centre', 'home', 'dashboard', 'workspace'],
    menuGroup: 'primary'
  },
  {
    domain: 'children',
    href: '/young-people',
    label: 'Children',
    description: 'One child-centred journey — profile, voice, plans and records.',
    icon: UserRound,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['young-people', 'children', 'life_echo'],
    menuGroup: 'primary'
  },
  {
    domain: 'workforce',
    href: '/staff',
    label: 'Adults / Staff',
    description: 'Staff directory, shift context, training, supervision and recording quality.',
    icon: UsersRound,
    permissions: ['staff:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['staff', 'shifts'],
    menuGroup: 'primary'
  },
  {
    domain: 'records',
    href: '/record',
    label: 'Records',
    description: 'Record once — choose category and form; manager review and sign-off follow.',
    icon: ClipboardList,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['record', 'daily-logs'],
    menuGroup: 'primary'
  },
  {
    domain: 'safeguarding',
    href: '/safeguarding',
    label: 'Safeguarding',
    description: 'ISN, concerns, incidents, missing and safeguarding alerts.',
    icon: ShieldCheck,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['safeguarding', 'incidents', 'missing'],
    menuGroup: 'primary'
  },
  {
    domain: 'plans',
    href: '/documents',
    label: 'Plans',
    description: 'Care plans, risk assessments, health, education and plan impacts.',
    icon: FolderOpen,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['documents', 'plans', 'risk-assessments'],
    menuGroup: 'primary'
  },
  {
    domain: 'reports',
    href: '/reports',
    label: 'Reports',
    description: 'Reviews, LAC packs and regulatory reports.',
    icon: FileText,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['reports'],
    menuGroup: 'primary'
  },
  {
    domain: 'governance',
    href: '/governance/command-centre',
    label: 'Governance',
    description: 'Management oversight, evidence gaps and governance risk.',
    icon: Scale,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['governance', 'management', 'reg44'],
    menuGroup: 'primary'
  },
  {
    domain: 'regulation',
    href: '/intelligence/inspection-readiness',
    label: 'Regulation',
    description: 'Inspection readiness, Quality Standards alignment, Reg 44 and Reg 45.',
    icon: ShieldCheck,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['intelligence'],
    menuGroup: 'primary'
  },
  {
    domain: 'orb',
    href: '/assistant/orb',
    label: 'ORB',
    description: 'The quiet copilot for children’s homes — present when needed, invisible when not.',
    icon: Sparkles,
    permissions: ['assistant:access'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['assistant'],
    menuGroup: 'primary'
  },
  {
    domain: 'settings',
    href: '/settings',
    label: 'Settings',
    description: 'Users, roles, homes, forms, templates, integrations and audit.',
    icon: Settings,
    permissions: ['settings:read', 'settings:manage', 'users:manage'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['settings', 'profile', 'setup', 'schema-live'],
    menuGroup: 'primary'
  },
  // Secondary / legacy — reachable, not first-class menu noise
  {
    domain: 'chronology',
    href: '/chronology',
    label: 'Chronology',
    description: 'Meaning over time — themes, voice and escalation patterns.',
    icon: CalendarDays,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['chronology'],
    menuGroup: 'more'
  },
  {
    domain: 'actions',
    href: '/actions',
    label: 'Actions',
    description: 'Open actions and follow-up from daily care and reviews.',
    icon: ClipboardCheck,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['actions', 'intelligence-actions'],
    menuGroup: 'more'
  },
  {
    domain: 'governance',
    href: '/intelligence/governance/ai',
    label: 'AI Governance',
    description: 'Intelligence usage, quality, cost and safety observability.',
    icon: Sparkles,
    permissions: ['reports:read'],
    roleScopes: ['rm', 'ri', 'provider', 'admin'],
    activeRoots: ['intelligence'],
    menuGroup: 'more'
  },
  {
    domain: 'command-centre',
    href: '/command-centre',
    label: 'Care Hub (legacy)',
    description: 'Legacy command centre — prefer Home workspace when scoped.',
    icon: Building2,
    permissions: ['records:read'],
    roleScopes: ['rm', 'ri', 'staff', 'provider', 'admin'],
    activeRoots: ['command-centre'],
    menuGroup: 'more'
  }
]

export const operationalUtilities: OperationalUtilityItem[] = [
  { id: 'notifications', href: '/notifications', label: 'Notifications', icon: Bell, permissions: ['records:read'], requiresChild: true, activeRoots: ['notifications'] },
  { id: 'shift', href: '/shifts/current', label: 'Shift', icon: ClipboardCheck, permissions: ['records:read'], requiresChild: true, activeRoots: ['shifts', 'handover'] },
  { id: 'reviews', href: '/management', label: 'Reviews', icon: Building2, permissions: ['reports:read'], activeRoots: ['management'] }
]

export const MEANINGFUL_MAIN_MENU_LABELS = [
  'Home',
  'Children',
  'Adults / Staff',
  'Records',
  'Safeguarding',
  'Plans',
  'Reports',
  'Governance',
  'Regulation',
  'ORB',
  'Settings'
] as const

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

export function visibleOperationalNavigation(user: StaffUser | null | undefined, group: 'primary' | 'more' | 'all' = 'primary') {
  const role = operationalRoleForUser(user)
  return operationalNavigation.filter((item) => {
    if (group !== 'all' && item.menuGroup !== group) return false
    return item.roleScopes.includes(role) && userHasAnyPermission(user, item.permissions)
  })
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
  if (item.href === '/documents' && encodedChildId) return `/documents?young_person_id=${encodedChildId}&scope=plans`
  if ('requiresChild' in item && item.requiresChild && !encodedChildId && item.href !== '/young-people') return '/young-people'
  return item.requiresChild ? childScopedHref(item.href) : item.href
}
