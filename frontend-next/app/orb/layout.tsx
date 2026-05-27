import type { Metadata } from 'next'
import { ReactNode } from 'react'

import { ORB_APPEARANCE_BOOTSTRAP_SCRIPT } from '@/lib/orb/orb-appearance'

export const metadata: Metadata = {
  title: 'ORB',
  description:
    "Institutional cognition workspace for residential children's homes — standalone, no OS records"
}

export default function OrbStandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        id="orb-appearance-bootstrap"
        dangerouslySetInnerHTML={{ __html: ORB_APPEARANCE_BOOTSTRAP_SCRIPT }}
      />
      {children}
    </>
  )
}
