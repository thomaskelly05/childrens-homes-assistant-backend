'use client'

import { useMemo, useState } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  Search,
  Trash2,
  UserPlus,
  X
} from 'lucide-react'

import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'
import {
  createStandaloneProfile,
  createStandaloneProject,
  searchChats,
  STANDALONE_GENERAL_PROJECT_ID,
  type StandaloneChat,
  type StandaloneProfile,
  type StandaloneProject,
  type StandaloneWorkspace
} from '@/lib/orb/standalone-local-store'

type PromptEntry = { text: string; mode?: StandaloneOrbMode }

export function OrbStandaloneSidebar({
  workspace,
  modes,
  currentMode,
  chatSearch,
  startersExpanded,
  suggestedPromptGroups,
  onChatSearchChange,
  onToggleStarters,
  onApplyPrompt,
  onSelectChat,
  onNewChat,
  onSelectProject,
  onWorkspaceChange,
  onModeChange,
  onClose
}: {
  workspace: StandaloneWorkspace
  modes: string[]
  currentMode: StandaloneOrbMode
  chatSearch: string
  startersExpanded: boolean
  suggestedPromptGroups: Array<{ title: string; prompts: PromptEntry[] }>
  onChatSearchChange: (value: string) => void
  onToggleStarters: () => void
  onApplyPrompt: (entry: PromptEntry) => void
  onSelectChat: (chatId: string) => void
  onNewChat: (projectId?: string) => void
  onSelectProject: (projectId: string) => void
  onWorkspaceChange: (next: StandaloneWorkspace) => void
  onModeChange: (mode: StandaloneOrbMode) => void
  onClose?: () => void
}) {
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [profilesOpen, setProfilesOpen] = useState(true)
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [projectEditorOpen, setProjectEditorOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [profileDraft, setProfileDraft] = useState({ name: '', label: 'Child context', notes: '' })

  const filteredChats = useMemo(
    () =>
      searchChats(workspace.chats, chatSearch, {
        projectId: workspace.activeProjectId,
        includeArchived: false
      }),
    [workspace.chats, workspace.activeProjectId, chatSearch]
  )

  function updateChat(chatId: string, patch: Partial<StandaloneChat>) {
    onWorkspaceChange({
      ...workspace,
      chats: workspace.chats.map((c) => (c.id === chatId ? { ...c, ...patch, updatedAt: Date.now() } : c))
    })
  }

  function deleteChat(chatId: string) {
    const chats = workspace.chats.filter((c) => c.id !== chatId)
    const activeChatId = workspace.activeChatId === chatId ? chats[0]?.id ?? null : workspace.activeChatId
    onWorkspaceChange({ ...workspace, chats, activeChatId })
  }

  function renameChat(chatId: string) {
    const chat = workspace.chats.find((c) => c.id === chatId)
    if (!chat) return
    const next = window.prompt('Rename chat', chat.title)
    if (!next?.trim()) return
    updateChat(chatId, { title: next.trim() })
  }

  function saveProject() {
    const name = newProjectName.trim()
    if (!name) return
    const project = createStandaloneProject(name)
    onWorkspaceChange({
      ...workspace,
      projects: [...workspace.projects, project],
      activeProjectId: project.id
    })
    setNewProjectName('')
    setProjectEditorOpen(false)
  }

  function saveProfile() {
    if (!profileDraft.name.trim()) return
    const profile = createStandaloneProfile(profileDraft)
    onWorkspaceChange({ ...workspace, profiles: [...workspace.profiles, profile] })
    setProfileDraft({ name: '', label: 'Child context', notes: '' })
    setProfileEditorOpen(false)
  }

  function deleteProfile(profileId: string) {
    onWorkspaceChange({
      ...workspace,
      profiles: workspace.profiles.filter((p) => p.id !== profileId),
      chats: workspace.chats.map((c) => ({
        ...c,
        profileIds: c.profileIds.filter((id) => id !== profileId)
      }))
    })
  }

  function renameProject(project: StandaloneProject) {
    const next = window.prompt('Rename project', project.name)
    if (!next?.trim()) return
    onWorkspaceChange({
      ...workspace,
      projects: workspace.projects.map((p) =>
        p.id === project.id ? { ...p, name: next.trim(), updatedAt: Date.now() } : p
      )
    })
  }

  function deleteProject(projectId: string) {
    if (projectId === STANDALONE_GENERAL_PROJECT_ID) return
    const chats = workspace.chats.map((c) =>
      c.projectId === projectId ? { ...c, projectId: STANDALONE_GENERAL_PROJECT_ID } : c
    )
    onWorkspaceChange({
      ...workspace,
      projects: workspace.projects.filter((p) => p.id !== projectId),
      chats,
      activeProjectId:
        workspace.activeProjectId === projectId ? STANDALONE_GENERAL_PROJECT_ID : workspace.activeProjectId
    })
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200/90">ORB Care Companion</p>
        {onClose ? (
          <button type="button" className="rounded-lg p-1 text-slate-400 lg:hidden" onClick={onClose} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <button
          type="button"
          onClick={() => onNewChat(workspace.activeProjectId)}
          className="flex w-full items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition hover:border-cyan-300/30"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          New chat
        </button>

        <div className="mt-4">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <input
              type="search"
              value={chatSearch}
              onChange={(e) => onChatSearchChange(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
            />
          </label>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setProjectsOpen((o) => !o)}
            className="flex w-full items-center justify-between px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"
          >
            Projects
            {projectsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {projectsOpen ? (
            <ul className="mt-2 space-y-0.5">
              {workspace.projects.map((project) => (
                <li key={project.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                    className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm transition ${
                      workspace.activeProjectId === project.id
                        ? 'bg-cyan-300/12 font-semibold text-cyan-50'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    <span className="mr-1.5">{project.icon || '▣'}</span>
                    {project.name}
                  </button>
                  {project.id !== STANDALONE_GENERAL_PROJECT_ID ? (
                    <ProjectMenu onRename={() => renameProject(project)} onDelete={() => deleteProject(project.id)} />
                  ) : null}
                </li>
              ))}
              <li>
                {projectEditorOpen ? (
                  <div className="mt-1 space-y-2 rounded-lg border border-white/10 p-2">
                    <input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Project name"
                      className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={saveProject} className="flex-1 rounded-lg bg-cyan-300/15 py-1 text-xs font-bold text-cyan-50">
                        Save
                      </button>
                      <button type="button" onClick={() => setProjectEditorOpen(false)} className="flex-1 rounded-lg border border-white/10 py-1 text-xs text-slate-400">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setProjectEditorOpen(true)}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Create project
                  </button>
                )}
              </li>
            </ul>
          ) : null}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setProfilesOpen((o) => !o)}
            className="flex w-full items-center justify-between px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"
          >
            Profiles
            {profilesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <p className="mt-1 px-2 text-[10px] leading-4 text-slate-500">
            Standalone user-provided context. ORB does not access IndiCare OS records.
          </p>
          {profilesOpen ? (
            <ul className="mt-2 space-y-0.5">
              {workspace.profiles.map((profile) => (
                <li key={profile.id} className="group flex items-center gap-1">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-400/20 text-xs font-black text-violet-100">
                    {profile.avatarInitial}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{profile.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteProfile(profile.id)}
                    className="rounded p-1 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-rose-300"
                    aria-label={`Delete profile ${profile.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {profileEditorOpen ? (
                <li className="mt-1 space-y-2 rounded-lg border border-white/10 p-2">
                  <input
                    value={profileDraft.name}
                    onChange={(e) => setProfileDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Name"
                    className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
                  />
                  <input
                    value={profileDraft.label}
                    onChange={(e) => setProfileDraft((d) => ({ ...d, label: e.target.value }))}
                    placeholder="Type (e.g. Child context)"
                    className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
                  />
                  <textarea
                    value={profileDraft.notes}
                    onChange={(e) => setProfileDraft((d) => ({ ...d, notes: e.target.value }))}
                    placeholder="Notes / context"
                    rows={2}
                    className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={saveProfile} className="flex-1 rounded-lg bg-violet-400/15 py-1 text-xs font-bold text-violet-50">
                      Save profile
                    </button>
                    <button type="button" onClick={() => setProfileEditorOpen(false)} className="flex-1 rounded-lg border border-white/10 py-1 text-xs text-slate-400">
                      Cancel
                    </button>
                  </div>
                </li>
              ) : (
                <li>
                  <button
                    type="button"
                    onClick={() => setProfileEditorOpen(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-white/[0.04]"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Create profile
                  </button>
                </li>
              )}
            </ul>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Recent chats</p>
          <ul className="mt-2 space-y-0.5">
            {filteredChats.length === 0 ? (
              <li className="px-2 py-2 text-xs text-slate-500">No chats in this project yet.</li>
            ) : (
              filteredChats.map((chat) => (
                <li key={chat.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat.id)}
                    className={`min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-sm transition ${
                      workspace.activeChatId === chat.id
                        ? 'bg-white/[0.06] font-semibold text-slate-100'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    {chat.pinned ? <Pin className="mr-1 inline h-3 w-3 text-amber-300" /> : null}
                    {chat.title}
                  </button>
                  <ChatMenu
                    chat={chat}
                    onRename={() => renameChat(chat.id)}
                    onDelete={() => deleteChat(chat.id)}
                    onPin={() => updateChat(chat.id, { pinned: !chat.pinned })}
                    onArchive={() => updateChat(chat.id, { archived: true })}
                  />
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onToggleStarters}
            className="flex w-full items-center justify-between px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"
          >
            Starters
            {startersExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {startersExpanded ? (
            <div className="mt-2 space-y-1">
              {suggestedPromptGroups.flatMap((group) => group.prompts.slice(0, 2)).map((prompt) => (
                <button
                  key={prompt.text}
                  type="button"
                  onClick={() => onApplyPrompt(prompt)}
                  className="w-full rounded-lg px-2 py-2 text-left text-xs font-semibold leading-5 text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                >
                  {prompt.text}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Settings</p>
          <div className="mt-2 space-y-1">
            {modes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onModeChange(item as StandaloneOrbMode)}
                className={`w-full rounded-lg px-2 py-2 text-left text-sm font-semibold transition ${
                  currentMode === item ? 'bg-cyan-300/12 text-cyan-50' : 'text-slate-400 hover:bg-white/[0.04]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2.5">
          <span className="mt-0.5 text-emerald-300" aria-hidden>
            ◆
          </span>
          <p className="text-[11px] font-bold leading-5 text-emerald-100/90">Standalone — no OS records</p>
        </div>
      </div>
    </>
  )
}

function ProjectMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded p-1 text-slate-500 opacity-0 group-hover:opacity-100">
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-white/10 bg-[#0a0e16] py-1 shadow-xl">
          <button type="button" onClick={() => { onRename(); setOpen(false) }} className="block w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-white/5">
            Rename
          </button>
          <button type="button" onClick={() => { onDelete(); setOpen(false) }} className="block w-full px-3 py-1.5 text-left text-xs text-rose-300 hover:bg-white/5">
            Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ChatMenu({
  chat,
  onRename,
  onDelete,
  onPin,
  onArchive
}: {
  chat: StandaloneChat
  onRename: () => void
  onDelete: () => void
  onPin: () => void
  onArchive: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative opacity-0 transition group-hover:opacity-100">
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded p-1 text-slate-500">
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-white/10 bg-[#0a0e16] py-1 shadow-xl">
          <button type="button" onClick={() => { onRename(); setOpen(false) }} className="block w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-white/5">
            Rename
          </button>
          <button type="button" onClick={() => { onPin(); setOpen(false) }} className="block w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-white/5">
            {chat.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button type="button" onClick={() => { onArchive(); setOpen(false) }} className="block w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-white/5">
            <Archive className="mr-1 inline h-3 w-3" />
            Archive
          </button>
          <button type="button" onClick={() => { onDelete(); setOpen(false) }} className="block w-full px-3 py-1.5 text-left text-xs text-rose-300 hover:bg-white/5">
            Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}
