'use client'

import { useEffect, useState } from 'react'
import { Camera, Mic, Volume2 } from 'lucide-react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'

export type OrbDevicePermissionsStatus = {
  microphoneAvailable: boolean
  speechRecognitionAvailable: boolean
  speechOutputAvailable: boolean
  cameraCaptureSupported: boolean
  imageUploadSupported: boolean
}

function probePermissions(): OrbDevicePermissionsStatus {
  if (typeof window === 'undefined') {
    return {
      microphoneAvailable: false,
      speechRecognitionAvailable: false,
      speechOutputAvailable: false,
      cameraCaptureSupported: false,
      imageUploadSupported: false
    }
  }
  const w = window as Window & { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown }
  const speechRecognitionAvailable = Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
  const speechOutputAvailable = 'speechSynthesis' in window
  const microphoneAvailable =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const cameraCaptureSupported =
    typeof document !== 'undefined' && Boolean(document.createElement('input').capture !== undefined)
  const imageUploadSupported = true
  return {
    microphoneAvailable,
    speechRecognitionAvailable,
    speechOutputAvailable,
    cameraCaptureSupported,
    imageUploadSupported
  }
}

export function OrbPermissionsPanel({
  open,
  onClose,
  voiceInputAvailable,
  voiceOutputAvailable
}: {
  open: boolean
  onClose: () => void
  voiceInputAvailable?: boolean
  voiceOutputAvailable?: boolean
}) {
  const [status, setStatus] = useState<OrbDevicePermissionsStatus>(() => probePermissions())

  useEffect(() => {
    if (!open) return
    setStatus(probePermissions())
  }, [open])

  const rows = [
    {
      label: 'Microphone available',
      ok: voiceInputAvailable ?? status.microphoneAvailable,
      icon: Mic
    },
    {
      label: 'Speech recognition available',
      ok: voiceInputAvailable ?? status.speechRecognitionAvailable,
      icon: Mic
    },
    {
      label: 'Speech output available',
      ok: voiceOutputAvailable ?? status.speechOutputAvailable,
      icon: Volume2
    },
    {
      label: 'Camera capture supported',
      ok: status.cameraCaptureSupported,
      icon: Camera
    },
    {
      label: 'Image upload supported',
      ok: status.imageUploadSupported,
      icon: Camera
    }
  ]

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Permissions"
      subtitle="Mic, camera and upload readiness"
      onClose={onClose}
      panelId="permissions"
      ariaLabel="ORB permissions"
      footer="Images stay user-provided standalone context. ORB does not write photos to OS records."
    >
      <div className="p-4" data-orb-permissions-panel>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2 text-slate-300">
                <row.icon className="h-4 w-4 text-slate-500" aria-hidden />
                {row.label}
              </span>
              <span className={row.ok ? 'text-emerald-300' : 'text-amber-300'}>{row.ok ? 'Ready' : 'Limited'}</span>
            </li>
          ))}
        </ul>
      </div>
    </OrbStandalonePanelShell>
  )
}
