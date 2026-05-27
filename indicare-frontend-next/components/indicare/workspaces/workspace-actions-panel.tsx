import { ActionsPanel } from '@/components/indicare/action-evidence-panels'
import type { CareAction } from '@/lib/evidence/types'

export function WorkspaceActionsPanel({ actions }: { actions: CareAction[] }) {
  return actions.length ? <ActionsPanel actions={actions} /> : <p className="text-sm leading-6 text-slate-500">No linked actions found.</p>
}

