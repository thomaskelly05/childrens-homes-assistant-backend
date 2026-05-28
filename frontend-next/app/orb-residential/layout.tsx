import type { ReactNode } from 'react'

import { OrbResidentialShell } from '@/components/orb-residential/orb-residential-shell'

export default function OrbResidentialLayout({ children }: { children: ReactNode }) {
  return <OrbResidentialShell>{children}</OrbResidentialShell>
}
