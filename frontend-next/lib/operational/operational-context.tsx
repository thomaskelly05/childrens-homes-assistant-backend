'use client'

import { createContext, ReactNode, useContext, useMemo } from 'react'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/contexts/auth-context'
import { buildAssistantContext } from '@/lib/assistant-core/context'
import { useActiveChild } from '@/lib/context/active-child-context'
import { entityContextFromPath } from '@/lib/navigation/entity-resolver'
import { operationalRoleForUser, type OperationalRole } from '@/lib/navigation/operational-navigation'
import type { AssistantContext } from '@/lib/assistant-core/types'
import type { OrbContext } from '@/lib/orb/types'

type OperationalContextValue = {
  pathname: string
  pageTitle: string
  operationalRole: OperationalRole
  activeChildId?: string
  activeChildName?: string
  selectedStaffId?: string | null
  selectedRecordId?: string | null
  selectedRecordType?: string | null
  currentChild?: Record<string, unknown>
  currentWorkforceContext?: Record<string, unknown>
  currentGovernanceContext?: Record<string, unknown>
  currentRiskContext?: Record<string, unknown>
  currentChronologyContext?: Record<string, unknown>
  linkedActionsAndEvidence?: Record<string, unknown>
  assistantContext: AssistantContext
  orbContext: OrbContext
}

const OperationalContext = createContext<OperationalContextValue | undefined>(undefined)

function selectedYoungPersonId(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'young-people' && parts[1]) return parts[1]
  if (parts[0] === 'children' && parts[1]) return parts[1]
  return undefined
}

function selectedStaffId(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const excluded = ['all', 'evidence', 'induction', 'probation', 'supervision', 'training-matrix', 'command-centre', 'risk', 'relationships', 'recording-quality', 'me']
  if (parts[0] === 'staff' && parts[1] && !excluded.includes(parts[1])) return decodeURIComponent(parts[1])
  return null
}

function titleFromPath(pathname: string, activeChildName?: string) {
  if (activeChildName) return `${activeChildName}'s journey`
  if (pathname === '/' || pathname === '/home' || pathname === '/dashboard' || pathname === '/workspace') return 'Children'
  const parts = pathname.split('/').filter(Boolean)
  if (!parts.length) return 'Children'
  return parts[0].split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

function governanceContext(pathname: string) {
  if (/governance|reg44|reg45|regulatory|ofsted|management/.test(pathname)) {
    return { domain: 'governance', active_route: pathname }
  }
  return undefined
}

export function OperationalContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/young-people'
  const { user } = useAuth()
  const { activeChild, lockVersion } = useActiveChild()
  const routeSelectedId = selectedYoungPersonId(pathname)
  const activeChildId = routeSelectedId || activeChild?.id
  const activeChildName = activeChild?.preferredName || activeChild?.displayName
  const selectedEntityContext = entityContextFromPath(pathname)
  const staffId = selectedStaffId(pathname)
  const pageTitle = titleFromPath(pathname, activeChildName)
  const operationalRole = operationalRoleForUser(user)

  const value = useMemo<OperationalContextValue>(() => {
    const assistantContext = buildAssistantContext({
      mode: 'embedded',
      route: pathname,
      pageTitle,
      selectedYoungPersonId: activeChildId,
      selectedStaffId: staffId,
      selectedRecordId: selectedEntityContext?.selected_record_id,
      selectedRecordType: selectedEntityContext?.selected_record_type,
      activeFilters: activeChildId ? { young_person_id: activeChildId, active_child_id: activeChildId, context_lock_version: lockVersion } : {},
      selectedRecordSummary: activeChildName ? `Active child context is locked to ${activeChildName}.` : undefined
    })
    const currentChild = activeChildId ? { id: activeChildId, name: activeChildName || activeChildId, current_route: pathname, lock_version: lockVersion } : undefined
    const currentWorkforceContext = staffId ? { staff_id: staffId, current_route: pathname } : pathname.startsWith('/staff') ? { current_route: pathname } : undefined
    const currentGovernanceContext = governanceContext(pathname)
    const currentRiskContext = /risk|safeguarding|incident|missing|ofsted|regulatory/.test(pathname) ? { route_signal: pathname } : undefined
    const currentChronologyContext = pathname.includes('chronology') ? { current_route: pathname, selected_child_id: activeChildId } : undefined
    const linkedActionsAndEvidence = selectedEntityContext ? {
      selected_record_id: selectedEntityContext.selected_record_id,
      selected_record_type: selectedEntityContext.selected_record_type
    } : undefined
    const orbContext: OrbContext = {
      route: pathname,
      workspace: assistantContext.current_workspace_type,
      page_title: pageTitle,
      selected_young_person_id: activeChildId && Number.isFinite(Number(activeChildId)) ? Number(activeChildId) : undefined,
      selected_young_person_key: activeChildId,
      selected_record_id: selectedEntityContext?.selected_record_id,
      selected_record_type: selectedEntityContext?.selected_record_type,
      current_record_summary: activeChildName ? `Active child context is locked to ${activeChildName}.` : undefined,
      current_child: currentChild,
      child_context_lock: activeChild ? {
        active: true,
        child_id: activeChild.id,
        child_name: activeChildName,
        lock_version: lockVersion,
        retrieval_scope: 'selected_child_only',
        allow_global_search: false
      } : {
        active: false,
        retrieval_scope: 'no_child_records',
        allow_global_search: false
      },
      operational_memory: {
        role: operationalRole,
        current_workforce_context: currentWorkforceContext,
        current_governance_context: currentGovernanceContext,
        current_risk_context: currentRiskContext,
        current_chronology_context: currentChronologyContext,
        linked_actions_and_evidence: linkedActionsAndEvidence
      },
      assistant_context: assistantContext
    }

    return {
      pathname,
      pageTitle,
      operationalRole,
      activeChildId,
      activeChildName,
      selectedStaffId: staffId,
      selectedRecordId: selectedEntityContext?.selected_record_id,
      selectedRecordType: selectedEntityContext?.selected_record_type,
      currentChild,
      currentWorkforceContext,
      currentGovernanceContext,
      currentRiskContext,
      currentChronologyContext,
      linkedActionsAndEvidence,
      assistantContext,
      orbContext
    }
  }, [activeChild, activeChildId, activeChildName, lockVersion, operationalRole, pageTitle, pathname, selectedEntityContext, staffId])

  return <OperationalContext.Provider value={value}>{children}</OperationalContext.Provider>
}

export function useOperationalContext() {
  const context = useContext(OperationalContext)
  if (!context) throw new Error('useOperationalContext must be used within OperationalContextProvider')
  return context
}
