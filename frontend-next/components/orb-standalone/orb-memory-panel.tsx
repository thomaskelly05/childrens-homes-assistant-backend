'use client'

import { Brain, Trash2, X } from 'lucide-react'

import {
  clearStandaloneCustomProjects,
  clearStandaloneLocalState,
  clearStandaloneProfiles,
  exportStandaloneWorkspaceJson,
  type StandaloneWorkspace
} from '@/lib/orb/standalone-local-store'

export const STANDALONE_MEMORY_NOTICE =
  'Standalone ORB remembers only what you save locally or add to this standalone workspace. It does not access IndiCare OS records.'

export function OrbMemoryPanel({
  open,
  onClose,
  workspace,
  onWorkspaceCleared,
  savedOutputsCount = 0,
  knowledgeSourceCount
}: {
  open: boolean
  onClose: () => void
  workspace: StandaloneWorkspace
  onWorkspaceCleared?: () => void
  savedOutputsCount?: number
  knowledgeSourceCount?: number
}) {
  if (!open) return null

  const chatCount = workspace.chats.length
  const projectCount = workspace.projects.length
  const profileCount = workspace.profiles.length

  function handleClear(action: 'chats' | 'profiles' | 'projects' | 'all') {
    const confirmMessages: Record<string, string> = {
      chats: 'Clear all local chat memory on this device?',
      profiles: 'Clear all local profiles?',
      projects: 'Clear all custom projects (chats will move to General)?',
      all: 'Clear all local ORB workspace data on this device?'
    }
    if (!window.confirm(confirmMessages[action])) return
    if (action === 'all' || action === 'chats') {
      clearStandaloneLocalState()
      onWorkspaceCleared?.()
      onClose()
      return
    }
    if (action === 'profiles') {
      clearStandaloneProfiles(workspace)
      onWorkspaceCleared?.()
      onClose()
      return
    }
    if (action === 'projects') {
      clearStandaloneCustomProjects(workspace)
      onWorkspaceCleared?.()
      onClose()
    }
  }

  function handleExport() {
    const json = exportStandaloneWorkspaceJson(workspace)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `orb-standalone-workspace-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-label="Memory and preferences">
      <div className="orb-floating-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1117] p-6 text-white">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-violet-200/90">
              <Brain className="h-4 w-4" />
              Memory & preferences
            </p>
            <h2 className="mt-1 text-xl font-black">What ORB remembers here</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-50/95">
          {STANDALONE_MEMORY_NOTICE}
        </p>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-400">Local chats</dt>
            <dd className="font-bold text-slate-200">{chatCount}</dd>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-400">Projects</dt>
            <dd className="font-bold text-slate-200">{projectCount}</dd>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-400">Profiles (user context)</dt>
            <dd className="font-bold text-slate-200">{profileCount}</dd>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-400">Saved outputs (server)</dt>
            <dd className="font-bold text-slate-200">{savedOutputsCount}</dd>
          </div>
          {typeof knowledgeSourceCount === 'number' ? (
            <div className="flex justify-between border-b border-white/5 pb-2">
              <dt className="text-slate-400">Knowledge sources</dt>
              <dd className="font-bold text-slate-200">{knowledgeSourceCount}</dd>
            </div>
          ) : null}
          <div className="flex justify-between pb-2">
            <dt className="text-slate-400">Voice preferences</dt>
            <dd className="text-xs text-slate-500">Stored in browser (voice settings panel)</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Accessibility</dt>
            <dd className="text-xs text-slate-500">Stored in localStorage on this device</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            Export local workspace (JSON)
          </button>
          <button
            type="button"
            onClick={() => handleClear('chats')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-200/90 hover:bg-red-400/10"
          >
            <Trash2 className="h-4 w-4" />
            Clear local chat memory
          </button>
          <button
            type="button"
            onClick={() => handleClear('profiles')}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
          >
            Clear profiles
          </button>
          <button
            type="button"
            onClick={() => handleClear('projects')}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
          >
            Clear custom projects
          </button>
          <button
            type="button"
            onClick={() => handleClear('all')}
            className="rounded-xl border border-red-400/20 px-4 py-2 text-xs font-semibold text-red-300/80 hover:bg-red-400/5"
          >
            Clear all local standalone state
          </button>
        </div>
      </div>
    </div>
  )
}
