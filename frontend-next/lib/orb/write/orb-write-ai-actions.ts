import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'
import {
  ORB_CONVERGED_WRITE_ACTIONS,
  ORB_CONVERGED_WRITE_PANEL_GROUPS,
  convergedWriteActionsForPanel,
  type OrbWriteAiGroup
} from '@/lib/orb/orb-converged-actions'

export type OrbWriteAiAction = {
  id: string
  label: string
  mode: OrbDictateEditMode
  instruction: string
  group: OrbWriteAiGroup
}

/** Child-centred ORB Write suggestions — derived from converged action registry. */
export const ORB_WRITE_AI_ACTIONS: OrbWriteAiAction[] = convergedWriteActionsForPanel().map(
  (action) => ({
    id: action.id,
    label: action.label,
    mode: action.editMode!,
    instruction: action.instruction!,
    group: action.writeGroup ?? 'converged'
  })
)

/** @deprecated Prefer ORB_CONVERGED_WRITE_PANEL_GROUPS for panel layout. */
export const ORB_WRITE_AI_GROUPS: Array<{ id: OrbWriteAiAction['group']; title: string }> = [
  { id: 'converged', title: 'Practice workflows' },
  { id: 'quality', title: 'Improve quality' },
  { id: 'safeguarding', title: 'Safeguarding & inspection' },
  { id: 'outputs', title: 'Export & polish' }
]

export { ORB_CONVERGED_WRITE_ACTIONS, ORB_CONVERGED_WRITE_PANEL_GROUPS }
