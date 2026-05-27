import { EvidenceItemsPanel } from '@/components/indicare/action-evidence-panels'
import type { EvidenceItem } from '@/lib/evidence/types'

export function WorkspaceEvidencePanel({ evidence }: { evidence: EvidenceItem[] }) {
  return evidence.length ? <EvidenceItemsPanel evidence={evidence} /> : <p className="text-sm leading-6 text-slate-500">No linked evidence found.</p>
}

