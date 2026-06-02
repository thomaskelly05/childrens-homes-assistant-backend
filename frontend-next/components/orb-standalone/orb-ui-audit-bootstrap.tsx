'use client'

import { useEffect } from 'react'

import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import { isOrbVoiceDebugMode } from '@/lib/orb/orb-voice-debug'
import { registerOrbUiAuditGlobals } from '@/components/orb-standalone/orb-ui-audit'

/** Registers window.ORB_UI_AUDIT helpers in debug / developer mode. */
export function OrbUiAuditBootstrap() {
  useEffect(() => {
    if (
      isOrbDeveloperMode() ||
      isOrbVoiceDebugMode() ||
      process.env.NEXT_PUBLIC_ORB_UI_AUDIT === '1'
    ) {
      registerOrbUiAuditGlobals()
    }
  }, [])
  return null
}
