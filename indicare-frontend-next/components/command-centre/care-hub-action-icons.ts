import {
  ClipboardCheck,
  ClipboardList,
  ClipboardPlus,
  Mic2,
  Shield,
  ShieldAlert,
  type LucideIcon
} from 'lucide-react'

/** Icons for every CARE_HUB_HERO_ACTIONS label — missing entries cause React error #130. */
export const CARE_HUB_ACTION_ICONS: Record<string, LucideIcon> = {
  'Record something': ClipboardList,
  'Record daily note': ClipboardPlus,
  'Record incident': ShieldAlert,
  'Safeguarding concern': Shield,
  'Start shift handover': ClipboardCheck,
  'Ask ORB': Mic2
}

export function careHubActionIcon(label: string): LucideIcon {
  return CARE_HUB_ACTION_ICONS[label] ?? ClipboardList
}
