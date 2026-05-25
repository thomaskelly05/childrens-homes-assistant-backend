import type { LucideIcon } from 'lucide-react'
import { ClipboardList } from 'lucide-react'

import { CARE_HUB_ACTION_ICONS } from '@/components/command-centre/care-hub-action-icons'

/** Registry of renderable workspace/menu card icons — used by export safety tests. */
export const WORKSPACE_COMPONENT_REGISTRY: Record<string, LucideIcon | undefined> = {
  ...CARE_HUB_ACTION_ICONS,
  'record-card-fallback': ClipboardList
}

export function resolveWorkspaceComponent(type: string): LucideIcon | undefined {
  return WORKSPACE_COMPONENT_REGISTRY[type]
}

export function listUndefinedWorkspaceComponents(): string[] {
  return Object.entries(WORKSPACE_COMPONENT_REGISTRY)
    .filter(([, component]) => component == null)
    .map(([type]) => type)
}
