import type { Metadata } from 'next'
import { ReactNode } from 'react'

/* Canonical ORB design layers — single residential shell (Phase 1I). */
import './orb-theme.css'
import './orb-components.css'
import './orb-shell.css'
import './orb-stations.css'
import './orb-login.css'
import './orb-residential-shell.css'
import { OrbResidentialThemeRoot } from '@/app/orb/orb-theme-root'
import { ORB_APPEARANCE_BOOTSTRAP_SCRIPT } from '@/lib/orb/orb-appearance'
import {
  ORB_COGNITION_ROUTING_BUILD,
  ORB_COGNITION_ROUTING_BUILD_MARKER_CLASS
} from '@/lib/orb/orb-cognition-routing-build'
import { ORB_LIGHT_UI_BUILD, ORB_LIGHT_UI_BUILD_MARKER_CLASS } from '@/lib/orb/orb-light-ui-build'
import {
  getOrbFrontendBuildInfo,
  ORB_BUILD_VISUAL_VERSION,
  ORB_CSS_CONTRACT,
  ORB_STYLE_VERSION
} from '@/lib/orb/orb-visual-build'

const ORB_LIGHT_UI_BUILD_SCRIPT = `window.__ORB_LIGHT_UI_BUILD__=${JSON.stringify(ORB_LIGHT_UI_BUILD)};`
const ORB_COGNITION_ROUTING_BUILD_SCRIPT = `window.__ORB_COGNITION_ROUTING_BUILD__=${JSON.stringify(ORB_COGNITION_ROUTING_BUILD)};`
const orbBuildInfo = getOrbFrontendBuildInfo()
const ORB_VISUAL_BUILD_SCRIPT = `window.__ORB_VISUAL_BUILD__=${JSON.stringify({
  visualVersion: ORB_BUILD_VISUAL_VERSION,
  styleVersion: ORB_STYLE_VERSION,
  cssContract: ORB_CSS_CONTRACT,
  commit: orbBuildInfo.commit,
  timestamp: orbBuildInfo.timestamp
})};`

export const metadata: Metadata = {
  title: 'ORB Residential',
  description:
    "ORB Residential — Powered by IndiCare Intelligence. Standalone premium intelligence for adults working in children's residential care.",
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'ORB Residential' },
  themeColor: '#f7fbff'
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
      <span
        className="hidden"
        data-orb-style-version={ORB_STYLE_VERSION}
        data-orb-build-visual-version={ORB_BUILD_VISUAL_VERSION}
        data-orb-css-contract={ORB_CSS_CONTRACT}
        data-orb-build-commit={orbBuildInfo.commit}
        data-orb-build-timestamp={orbBuildInfo.timestamp ?? undefined}
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
      <script id="orb-visual-build" dangerouslySetInnerHTML={{ __html: ORB_VISUAL_BUILD_SCRIPT }} />
      <OrbResidentialThemeRoot>{children}</OrbResidentialThemeRoot>
    </>
  )
}
