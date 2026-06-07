'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'

import type { OrbVoiceCompanionState } from '@/components/orb-residential/orb-voice-head'

export const ORB_VOICE_RIVE_SRC = '/assets/orb/orb-voice-avatar.riv'
export const ORB_VOICE_RIVE_STATE_MACHINE = 'OrbVoiceStateMachine'

/** Rive state machine input names — must match the authored .riv asset. */
export const ORB_VOICE_RIVE_INPUTS = {
  booleans: ['isListening', 'isThinking', 'isSpeaking', 'isPaused', 'isEngaged'] as const,
  numbers: ['speechEnergy', 'mouthOpen', 'gazeX', 'gazeY', 'breatheAmount'] as const,
  triggers: ['blink', 'turnToAdult', 'returnToIdle', 'startSpeaking', 'stopSpeaking'] as const
} as const

function smoothEnergy(current: number, target: number, alpha = 0.22): number {
  const next = current + (target - current) * alpha
  return Math.abs(next - target) < 0.008 ? target : next
}

function useOrbVoiceNaturalBlink(active: boolean, reducedMotion: boolean, onBlink: () => void) {
  useEffect(() => {
    if (!active || reducedMotion) return

    let nextTimer = 0
    let closeTimer = 0

    const scheduleBlink = () => {
      const delayMs = 5000 + Math.random() * 4000
      nextTimer = window.setTimeout(() => {
        onBlink()
        const durationMs = 120 + Math.random() * 60
        closeTimer = window.setTimeout(() => {
          scheduleBlink()
        }, durationMs)
      }, delayMs)
    }

    scheduleBlink()

    return () => {
      window.clearTimeout(nextTimer)
      window.clearTimeout(closeTimer)
    }
  }, [active, reducedMotion, onBlink])
}

export type OrbVoiceAvatarRigProps = {
  state: OrbVoiceCompanionState
  speechEnergy: number
  mouthOpen: number
  engaged: boolean
  reducedMotion: boolean
  onLoadFailed: () => void
  onLoaded: () => void
}

/**
 * Rive avatar rig — primary ORB Voice renderer.
 * Drives the OrbVoiceStateMachine inputs/triggers from voice UI state.
 */
export function OrbVoiceAvatarRig({
  state,
  speechEnergy,
  mouthOpen,
  engaged,
  reducedMotion,
  onLoadFailed,
  onLoaded
}: OrbVoiceAvatarRigProps) {
  const [loadFailed, setLoadFailed] = useState(false)
  const previousState = useRef<OrbVoiceCompanionState>(state)
  const smoothedEnergy = useRef(0)

  const { RiveComponent, rive } = useRive({
    src: ORB_VOICE_RIVE_SRC,
    stateMachines: ORB_VOICE_RIVE_STATE_MACHINE,
    autoplay: true,
    onLoad: () => {
      onLoaded()
    },
    onLoadError: () => {
      setLoadFailed(true)
      onLoadFailed()
    }
  })

  const isListeningInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'isListening')
  const isThinkingInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'isThinking')
  const isSpeakingInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'isSpeaking')
  const isPausedInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'isPaused')
  const isEngagedInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'isEngaged')

  const speechEnergyInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'speechEnergy')
  const mouthOpenInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'mouthOpen')
  const gazeXInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'gazeX')
  const gazeYInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'gazeY')
  const breatheAmountInput = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'breatheAmount')

  const blinkTrigger = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'blink')
  const turnToAdultTrigger = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'turnToAdult')
  const returnToIdleTrigger = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'returnToIdle')
  const startSpeakingTrigger = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'startSpeaking')
  const stopSpeakingTrigger = useStateMachineInput(rive, ORB_VOICE_RIVE_STATE_MACHINE, 'stopSpeaking')

  const blinkTriggerRef = useRef(blinkTrigger)
  blinkTriggerRef.current = blinkTrigger

  const fireBlink = useCallback(() => {
    blinkTriggerRef.current?.fire()
  }, [])

  const blinkEligible =
    state === 'idle' || state === 'listening' || state === 'thinking' || state === 'paused'
  useOrbVoiceNaturalBlink(blinkEligible, reducedMotion, fireBlink)

  useEffect(() => {
    if (!rive || loadFailed) return

    const isListening = state === 'listening'
    const isThinking = state === 'thinking'
    const isSpeaking = state === 'speaking'
    const isPaused = state === 'paused'

    if (isListeningInput) isListeningInput.value = isListening
    if (isThinkingInput) isThinkingInput.value = isThinking
    if (isSpeakingInput) isSpeakingInput.value = isSpeaking
    if (isPausedInput) isPausedInput.value = isPaused
    if (isEngagedInput) isEngagedInput.value = engaged

    const gazeX = engaged && !reducedMotion ? 0.72 : 0
    const gazeY = engaged ? -0.08 : 0
    if (gazeXInput) gazeXInput.value = gazeX
    if (gazeYInput) gazeYInput.value = gazeY

    const breatheAmount = reducedMotion ? 0.18 : state === 'idle' ? 0.42 : 0.56
    if (breatheAmountInput) breatheAmountInput.value = breatheAmount

    const prev = previousState.current
    if (prev !== state) {
      if ((state === 'listening' || state === 'speaking' || state === 'thinking') && !reducedMotion) {
        turnToAdultTrigger?.fire()
      }
      if (state === 'speaking' && prev !== 'speaking') {
        startSpeakingTrigger?.fire()
      }
      if (prev === 'speaking' && state !== 'speaking') {
        stopSpeakingTrigger?.fire()
      }
      if ((state === 'idle' || state === 'paused') && prev !== 'idle' && prev !== 'paused') {
        returnToIdleTrigger?.fire()
      }
      previousState.current = state
    }
  }, [
    breatheAmountInput,
    engaged,
    gazeXInput,
    gazeYInput,
    isEngagedInput,
    isListeningInput,
    isPausedInput,
    isSpeakingInput,
    isThinkingInput,
    loadFailed,
    reducedMotion,
    returnToIdleTrigger,
    rive,
    startSpeakingTrigger,
    state,
    stopSpeakingTrigger,
    turnToAdultTrigger
  ])

  useEffect(() => {
    if (!rive || loadFailed) return

    let raf = 0
    const tick = () => {
      const target = state === 'speaking' ? speechEnergy : 0
      smoothedEnergy.current = smoothEnergy(smoothedEnergy.current, target)
      const energy = smoothedEnergy.current
      const open = state === 'speaking' ? mouthOpen : 0

      if (speechEnergyInput) speechEnergyInput.value = energy
      if (mouthOpenInput) mouthOpenInput.value = open

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [loadFailed, mouthOpen, mouthOpenInput, rive, speechEnergy, speechEnergyInput, state])

  if (loadFailed) return null

  return (
    <div
      className="orb-voice-companion__avatar-rig"
      data-orb-voice-avatar-rig
      data-orb-voice-rig-state={state}
      aria-hidden
    >
      <RiveComponent className="orb-voice-companion__avatar-rig-canvas" />
    </div>
  )
}
