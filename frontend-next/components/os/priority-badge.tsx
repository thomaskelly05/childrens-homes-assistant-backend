import { StatusChip, type StatusChipTone } from '@/components/os/status-chip'

function priorityTone(priority: string): StatusChipTone {
  const lower = priority.toLowerCase()
  if (lower.includes('urgent') || lower.includes('high') || lower.includes('critical')) return 'red'
  if (lower.includes('medium')) return 'amber'
  if (lower.includes('low')) return 'emerald'
  return 'slate'
}

export function PriorityBadge({ value }: { value: string }) {
  if (!value?.trim()) return null
  return <StatusChip label={value} tone={priorityTone(value)} />
}
