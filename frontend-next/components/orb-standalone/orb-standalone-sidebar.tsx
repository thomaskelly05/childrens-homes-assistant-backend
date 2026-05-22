'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  Search,
  Settings,
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
  type StandaloneProject,
  type StandaloneWorkspace
} from '@/lib/orb/standalone-local-store'

type PromptEntry = { text: string; mode?: StandaloneOrbMode }

export function OrbStandaloneSidebar({
  workspace,
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
  onOpenSettings,
  onOpenKnowledgeLibrary,
  onClose
}: {
  workspace: StandaloneWorkspace
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
  onOpenSettings?: () => void
  onOpenKnowledgeLibrary?: () => void
  onClose?: () => void
}) {
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [profilesOpen, setProfilesOpen] = useState(() => workspace.profiles.length > 0)
  const [recentOpen, setRecentOpen] = useState(true)
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [projectEditorOpen, setProjectEditorOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [profileDraft, setProfileDraft] = useState({ name: '', label: 'Child context', notes: '' })

  const filteredChats = useMemo(
    () =>
      searchChats(workspace.chats, chatSearch, {
        projectId: chatSearch.trim() ? undefined : workspace.activeProjectId,
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
    setProfilesOpen(true)
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
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/25 to-violet-500/20 text-sm font-black text-cyan-100">
          O
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">ORB Care Companion</p>
          <p className="truncate text-[11px] text-slate-500">Standalone assistant</p>
        </div>
        {onClose ? (
          <button type="button" className="rounded-lg p-1 text-slate-400 lg:hidden" onClick={onClose} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <button
          type="button"
          onClick={() => onNewChat(workspace.activeProjectId)}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.06]"
        >
          <MessageSquarePlus className="h-4 w-4 text-slate-400" aria-hidden />
          New chat
        </button>

        <div className="mt-2 px-1">
          <label className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06] focus-within:ring-cyan-300/30">
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

        <SectionToggle label="Projects" open={projectsOpen} onToggle={() => setProjectsOpen((o) => !o)}>
          <ul className="space-y-0.5">
            {workspace.projects.map((project) => (
              <li key={project.id} className="group flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-[13px] transition ${
                    workspace.activeProjectId === project.id
                      ? 'bg-white/[0.08] font-medium text-white'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <span className="mr-2 opacity-70">{project.icon || '▣'}</span>
                  {project.name}
                </button>
                {project.id !== STANDALONE_GENERAL_PROJECT_ID ? (
                  <ProjectMenu onRename={() => renameProject(project)} onDelete={() => deleteProject(project.id)} />
                ) : null}
              </li>
            ))}
            <li>
              {projectEditorOpen ? (
                <div className="mx-1 mt-1 space-y-2 rounded-lg border border-white/10 p-2">
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={saveProject} className="flex-1 rounded-lg bg-white/[0.08] py-1 text-xs font-semibold text-white">
                      Save
                    </button>
                    <button type="button" onClick={() => setProjectEditorOpen(false)} className="flex-1 rounded-lg py-1 text-xs text-slate-500">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setProjectEditorOpen(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  Create project
                </button>
              )}
            </li>
          </ul>
        </SectionToggle>

        <SectionToggle label="Profiles" open={profilesOpen} onToggle={() => setProfilesOpen((o) => !o)}>
          {profilesOpen ? (
            <p className="mx-1 mb-1 px-2 text-[10px] leading-4 text-slate-500">
              User-provided context only — does not access IndiCare OS records.
            </p>
          ) : null}
          {workspace.profiles.length === 0 && !profileEditorOpen ? (
            <button
              type="button"
              onClick={() => {
                setProfileEditorOpen(true)
                setProfilesOpen(true)
              }}
              className="mx-1 block w-[calc(100%-0.5rem)] rounded-lg px-3 py-2 text-left text-xs text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
            >
              Create standalone profile
            </button>
          ) : (
            <ul className="space-y-0.5">
              {workspace.profiles.map((profile) => (
                <li key={profile.id} className="group flex items-center gap-2 px-1">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-100">
                    {profile.avatarInitial}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-300">{profile.name}</span>
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
                <li className="mx-1 mt-1 space-y-2 rounded-lg border border-white/10 p-2">
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
                    <button type="button" onClick={saveProfile} className="flex-1 rounded-lg bg-white/[0.08] py-1 text-xs font-semibold text-white">
                      Save profile
                    </button>
                    <button type="button" onClick={() => setProfileEditorOpen(false)} className="flex-1 rounded-lg py-1 text-xs text-slate-500">
                      Cancel
                    </button>
                  </div>
                </li>
              ) : (
                <li>
                  <button
                    type="button"
                    onClick={() => setProfileEditorOpen(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/[0.04]"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Create profile
                  </button>
                </li>
              )}
            </ul>
          )}
        </SectionToggle>

        <SectionToggle label="Recent chats" open={recentOpen} onToggle={() => setRecentOpen((o) => !o)}>
          <ul className="space-y-0.5">
            {filteredChats.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">
                {chatSearch.trim() ? 'No matching chats.' : 'No chats in this project yet.'}
              </li>
            ) : (
              filteredChats.map((chat) => (
                <li key={chat.id} className="group flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat.id)}
                    className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-[13px] transition ${
                      workspace.activeChatId === chat.id
                        ? 'bg-white/[0.08] font-medium text-slate-100'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    {chat.pinned ? <Pin className="mr-1 inline h-3 w-3 text-amber-300/90" /> : null}
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
        </SectionToggle>

        <SectionToggle label="Starters" open={startersExpanded} onToggle={onToggleStarters}>
          <div className="space-y-0.5">
            {suggestedPromptGroups.flatMap((group) => group.prompts.slice(0, 2)).map((prompt) => (
              <button
                key={prompt.text}
                type="button"
                onClick={() => onApplyPrompt(prompt)}
                className="w-full rounded-lg px-3 py-2 text-left text-xs leading-5 text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              >
                {prompt.text}
              </button>
            ))}
          </div>
        </SectionToggle>
      </div>

      <div className="shrink-0 space-y-2 border-t border-white/[0.06] p-3">
        <button
          type="button"
          onClick={onOpenKnowledgeLibrary}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Knowledge Library
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
        >
          <Settings className="h-4 w-4" aria-hidden />
          Settings
        </button>
        <div className="rounded-lg bg-emerald-500/[0.08] px-3 py-2 ring-1 ring-emerald-400/15">
          <p className="text-[11px] font-medium leading-5 text-emerald-100/90">Standalone — no OS records accessed</p>
        </div>
      </div>
    </>
  )
}

function SectionToggle({
  label,
  open,
  onToggle,
  children
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-400"
      >
        {label}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open ? <div className="mt-1">{children}</div> : null}
    </div>
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
