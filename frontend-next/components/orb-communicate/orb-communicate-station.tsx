'use client'

import { useState } from 'react'

import { OrbCommunicateEasyReadWorkflow } from '@/components/orb-communicate/orb-communicate-easy-read'
import { OrbCommunicateHub } from '@/components/orb-communicate/orb-communicate-hub'
import { OrbCommunicateMyVoiceProfileWorkflow } from '@/components/orb-communicate/orb-communicate-my-voice-profile'
import { OrbCommunicateReflectRecordWorkflow } from '@/components/orb-communicate/orb-communicate-reflect-record'
import {
  OrbCommunicateSafetyBanner
} from '@/components/orb-communicate/orb-communicate-shared'
import { OrbCommunicateSocialStoryWorkflow } from '@/components/orb-communicate/orb-communicate-social-story'
import { OrbCommunicateVisualBoardWorkflow } from '@/components/orb-communicate/orb-communicate-visual-board'
import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { orbNavyGradient, orbNavyPage } from '@/components/orb-residential/ui/orb-theme'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { orbResidentialStation } from '@/lib/orb/orb-residential-stations'
import type { CommunicateMode } from '@/lib/orb/communicate/orb-communicate-types'

const STATION = orbResidentialStation('orb_communicate')

export function OrbCommunicateStation({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const [mode, setMode] = useState<CommunicateMode>('hub')

  function handleClose() {
    setMode('hub')
    onClose()
  }

  function renderWorkflow() {
    const back = () => setMode('hub')
    switch (mode) {
      case 'easy_read':
        return <OrbCommunicateEasyReadWorkflow onBack={back} />
      case 'visual_board':
        return <OrbCommunicateVisualBoardWorkflow onBack={back} />
      case 'social_story':
        return <OrbCommunicateSocialStoryWorkflow onBack={back} />
      case 'my_voice_profile':
        return <OrbCommunicateMyVoiceProfileWorkflow onBack={back} />
      case 'reflect_record':
        return <OrbCommunicateReflectRecordWorkflow onBack={back} />
      default:
        return (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <GlassOrbMark className="h-12 w-12 shrink-0" />
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  ORB Communicate
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 [text-wrap:pretty]">
                  Create accessible explanations, visual supports and reflection prompts that help
                  people understand, express themselves and be heard.
                </p>
              </div>
            </div>
            <OrbCommunicateHub onSelect={setMode} />
            <OrbCommunicateSafetyBanner />
          </div>
        )
    }
  }

  return (
    <OrbAppModal
      open={open}
      onClose={handleClose}
      title={STATION.label}
      subtitle={STATION.tagline}
      presentation="workspace"
      panelId="orb_communicate"
      size="wide"
    >
      <div
        className={`orb-workspace--communicate min-h-0 flex-1 overflow-y-auto ${orbNavyPage} ${orbNavyGradient}`}
        data-orb-workspace-communicate
        data-orb-communicate-mode={mode}
      >
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">{renderWorkflow()}</div>
      </div>
    </OrbAppModal>
  )
}
