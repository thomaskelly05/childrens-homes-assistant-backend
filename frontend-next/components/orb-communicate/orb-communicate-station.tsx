'use client'

import { useState } from 'react'

import { OrbCommunicateCreateFlow } from '@/components/orb-communicate/orb-communicate-create-flow'
import { OrbCommunicateEasyReadWorkflow } from '@/components/orb-communicate/orb-communicate-easy-read'
import { OrbCommunicateMyVoiceProfileWorkflow } from '@/components/orb-communicate/orb-communicate-my-voice-profile'
import { OrbCommunicateReflectRecordWorkflow } from '@/components/orb-communicate/orb-communicate-reflect-record'
import { OrbCommunicateSocialStoryWorkflow } from '@/components/orb-communicate/orb-communicate-social-story'
import { OrbCommunicateVisualBoardWorkflow } from '@/components/orb-communicate/orb-communicate-visual-board'
import { OrbCommunicateSupportPackView } from '@/components/orb-communicate/orb-communicate-support-pack-view'
import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { orbResidentialStation } from '@/lib/orb/orb-residential-stations'
import type {
  CommunicateMode,
  CommunicationSupportPackOutput
} from '@/lib/orb/communicate/orb-communicate-types'

const STATION = orbResidentialStation('orb_communicate')

export function OrbCommunicateStation({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const [mode, setMode] = useState<CommunicateMode>('hub')
  const [supportPack, setSupportPack] = useState<CommunicationSupportPackOutput | null>(null)

  function handleClose() {
    setMode('hub')
    setSupportPack(null)
    onClose()
  }

  function renderWorkflow() {
    const back = () => {
      setSupportPack(null)
      setMode('hub')
    }
    switch (mode) {
      case 'support_pack':
        return supportPack ? (
          <OrbCommunicateSupportPackView
            pack={supportPack}
            onBack={back}
            onStartReflect={() => setMode('reflect_record')}
          />
        ) : (
          <OrbCommunicateCreateFlow
            onPackCreated={(pack) => {
              setSupportPack(pack)
              setMode('support_pack')
            }}
            onSelectAdvanced={setMode}
          />
        )
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
          <OrbCommunicateCreateFlow
            onPackCreated={(pack) => {
              setSupportPack(pack)
              setMode('support_pack')
            }}
            onSelectAdvanced={setMode}
          />
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
        className="orb-workspace--communicate min-h-0 flex-1 overflow-y-auto bg-[var(--orb-res-workspace-bg)]"
        data-orb-workspace-communicate
        data-orb-communicate-mode={mode}
      >
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">{renderWorkflow()}</div>
      </div>
    </OrbAppModal>
  )
}
