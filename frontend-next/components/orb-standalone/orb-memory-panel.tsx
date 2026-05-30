'use client'

import { Brain, Trash2 } from 'lucide-react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  clearStandaloneCustomProjects,
  clearStandaloneLocalState,
  clearStandaloneProfiles,
  exportStandaloneWorkspaceJson,
  type StandaloneWorkspace
} from '@/lib/orb/standalone-local-store'

export const STANDALONE_MEMORY_NOTICE =
  'ORB Residential uses your profile, conversation, uploaded documents and IndiCare residential intelligence. It does not access IndiCare OS records.'

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
    <OrbStandalonePanelShell
      open={open}
      title="Memory"
      subtitle="Local workspace on this device"
      onClose={onClose}
      panelId="memory"
      ariaLabel="ORB memory"
      footer={STANDALONE_MEMORY_NOTICE}
    >
      <div className="space-y-4 p-4" data-orb-memory-panel>
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-violet-200/90">
          <Brain className="h-4 w-4" aria-hidden />
          What ORB remembers here
        </p>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-400">Local chats</dt>
            <dd className="font-medium text-slate-200">{chatCount}</dd>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-400">Projects</dt>
            <dd className="font-medium text-slate-200">{projectCount}</dd>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-400">Profiles (user context)</dt>
            <dd className="font-medium text-slate-200">{profileCount}</dd>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-400">Saved outputs (server)</dt>
            <dd className="font-medium text-slate-200">{savedOutputsCount}</dd>
          </div>
          {typeof knowledgeSourceCount === 'number' ? (
            <div className="flex justify-between border-b border-white/5 pb-2">
              <dt className="text-slate-400">Knowledge sources</dt>
              <dd className="font-medium text-slate-200">{knowledgeSourceCount}</dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            Export local workspace (JSON)
          </button>
          <button
            type="button"
            onClick={() => handleClear('chats')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-medium text-red-200/90 hover:bg-red-400/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Clear local chat memory
          </button>
          <button
            type="button"
            onClick={() => handleClear('profiles')}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/5"
          >
            Clear profiles
          </button>
          <button
            type="button"
            onClick={() => handleClear('projects')}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/5"
          >
            Clear custom projects
          </button>
          <button
            type="button"
            onClick={() => handleClear('all')}
            className="rounded-xl border border-red-400/20 px-4 py-2 text-xs font-medium text-red-300/80 hover:bg-red-400/5"
          >
            Clear all local standalone state
          </button>
        </div>
      </div>
    </OrbStandalonePanelShell>
  )
}
