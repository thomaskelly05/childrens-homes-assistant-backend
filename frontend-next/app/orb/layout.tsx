import type { Metadata } from 'next'
import { ReactNode } from 'react'

/* Canonical ORB design layers: desktop + mobile only. */
import './orb-desktop.css'
import './orb-premium-tokens.css'
import './orb-mobile.css'
import { ORB_APPEARANCE_BOOTSTRAP_SCRIPT } from '@/lib/orb/orb-appearance'
import {
  ORB_COGNITION_ROUTING_BUILD,
  ORB_COGNITION_ROUTING_BUILD_MARKER_CLASS
} from '@/lib/orb/orb-cognition-routing-build'
import { ORB_LIGHT_UI_BUILD, ORB_LIGHT_UI_BUILD_MARKER_CLASS } from '@/lib/orb/orb-light-ui-build'

const ORB_LIGHT_UI_BUILD_SCRIPT = `window.__ORB_LIGHT_UI_BUILD__=${JSON.stringify(ORB_LIGHT_UI_BUILD)};`
const ORB_COGNITION_ROUTING_BUILD_SCRIPT = `window.__ORB_COGNITION_ROUTING_BUILD__=${JSON.stringify(ORB_COGNITION_ROUTING_BUILD)};`

export const metadata: Metadata = {
  title: 'ORB Residential',
  description:
    "ORB Residential — Powered by IndiCare Intelligence. Standalone premium intelligence for adults working in children's residential care."
}

export default function OrbLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <span
        className={`${ORB_LIGHT_UI_BUILD_MARKER_CLASS} hidden`}
        data-orb-light-ui-build={ORB_LIGHT_UI_BUILD}
        aria-hidden
      />
      <span
        className={`${ORB_COGNITION_ROUTING_BUILD_MARKER_CLASS} hidden`}
        data-orb-cognition-routing-build={ORB_COGNITION_ROUTING_BUILD}
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
      <script
        id="orb-cognition-routing-build"
        dangerouslySetInnerHTML={{ __html: ORB_COGNITION_ROUTING_BUILD_SCRIPT }}
      />
      {children}
    </>
  )
}
