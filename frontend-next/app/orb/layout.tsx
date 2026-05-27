import type { Metadata } from 'next'
import { ReactNode } from 'react'

import './orb-chatgpt-light.css'
import { ORB_APPEARANCE_BOOTSTRAP_SCRIPT } from '@/lib/orb/orb-appearance'
import { ORB_LIGHT_UI_BUILD } from '@/lib/orb/orb-light-ui-build'

const ORB_LIGHT_UI_BUILD_SCRIPT = `window.__ORB_LIGHT_UI_BUILD__=${JSON.stringify(ORB_LIGHT_UI_BUILD)};`

export const metadata: Metadata = {
  title: 'ORB',
  description:
    "Institutional cognition workspace for residential children's homes — standalone, no OS records"
}

export default function OrbStandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <span
        className="orb-chatgpt-light-build-marker-1336 hidden"
        data-orb-light-ui-build={ORB_LIGHT_UI_BUILD}
        aria-hidden
      />
      <script
        id="orb-appearance-bootstrap"
        dangerouslySetInnerHTML={{ __html: ORB_APPEARANCE_BOOTSTRAP_SCRIPT }}
      />
      <script
        id="orb-light-ui-build"
        dangerouslySetInnerHTML={{ __html: ORB_LIGHT_UI_BUILD_SCRIPT }}
      />
      {children}
    </>
  )
}
