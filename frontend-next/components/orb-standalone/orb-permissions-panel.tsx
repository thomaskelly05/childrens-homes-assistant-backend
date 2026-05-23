'use client'

import { useEffect, useState } from 'react'
import { Camera, Mic, Volume2, X } from 'lucide-react'

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

  if (!open) return null

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
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-label="Device permissions">
      <div className="orb-floating-panel w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1117] p-6 text-white">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black">Mic & camera readiness</h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Images stay user-provided standalone context. ORB does not write photos to OS records.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2 text-slate-300">
                <row.icon className="h-4 w-4 text-slate-500" />
                {row.label}
              </span>
              <span className={row.ok ? 'text-emerald-300' : 'text-amber-300'}>{row.ok ? 'Yes' : 'Limited'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
