'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  Archive,
  Bookmark,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Grid3x3,
  HelpCircle,
  Library,
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  Search,
  Settings,
  Sparkles,
  Trash2,
  UserPlus,
  Wrench,
  X
} from 'lucide-react'

import { OrbHueMark, OrbHueLogo, OrbPoweredByIndicare } from '@/components/orb-standalone/orb-hue-logo'

import type { AdultProfile } from '@/lib/orb/adult-profile-store'

import {
  createStandaloneProfile,
  createStandaloneProject,
  searchChats,
  STANDALONE_GENERAL_PROJECT_ID,
  type StandaloneChat,
  type StandaloneProject,
  type StandaloneWorkspace
} from '@/lib/orb/standalone-local-store'

export function OrbStandaloneSidebar({
  workspace,
  chatSearch,
  onChatSearchChange,
  onSelectChat,
  onNewChat,
  onSelectProject,
  onWorkspaceChange,
  onOpenSettings,
  onOpenSavedOutputs,
  onOpenTools,
  onOpenAgents,
  onOpenLibrary,
  onOpenDeepResearch,
  onOpenHelp,
  onOpenAdultProfile,
  adultProfile,
  cognitionStatusLabel,
  cognitionModeLabel,
  savedOutputsCount,
  onClose
}: {
  workspace: StandaloneWorkspace
  chatSearch: string
  onChatSearchChange: (value: string) => void
  onSelectChat: (chatId: string) => void
  onNewChat: (projectId?: string) => void
  onSelectProject: (projectId: string) => void
  onWorkspaceChange: (next: StandaloneWorkspace) => void
  onOpenSettings?: () => void
  onOpenSavedOutputs?: () => void
  onOpenTools?: () => void
  onOpenAgents?: () => void
  onOpenLibrary?: () => void
  onOpenDeepResearch?: () => void
  onOpenHelp?: () => void
  onOpenAdultProfile?: () => void
  adultProfile?: AdultProfile | null
  cognitionStatusLabel?: string
  cognitionModeLabel?: string
  savedOutputsCount?: number
  onClose?: () => void
}) {
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [profilesOpen, setProfilesOpen] = useState(false)
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

  const pinnedChats = useMemo(
    () => filteredChats.filter((chat) => chat.pinned),
    [filteredChats]
  )

  const timeGroupedChats = useMemo(() => groupChatsByRecency(filteredChats.filter((c) => !c.pinned)), [filteredChats])

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
      <div className="border-b border-[var(--orb-line)] px-3 py-3.5">
        <div className="flex items-center gap-2.5">
          <OrbHueMark />
          <div className="min-w-0 flex-1">
            <p className="truncate" data-orb-sidebar-brand>
              <OrbHueLogo size="sm" />
            </p>
            <div className="truncate" data-orb-sidebar-powered>
              <OrbPoweredByIndicare />
            </div>
          </div>
          {onClose ? (
            <button type="button" className="rounded-lg p-1 text-[var(--orb-muted)] lg:hidden" onClick={onClose} aria-label="Close sidebar">
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="orb-sidebar-group flex-1 overflow-y-auto px-2 py-3">
        <SidebarNavButton
          icon={<MessageSquarePlus className="h-4 w-4" />}
          label="New chat"
          onClick={() => onNewChat(workspace.activeProjectId)}
          dataAttr="orb-sidebar-new-chat"
        />
        <SidebarNavButton
          icon={<Search className="h-4 w-4" />}
          label="Search chats"
          onClick={() => {
            const el = document.querySelector<HTMLInputElement>('[data-orb-sidebar-search]')
            el?.focus()
          }}
          dataAttr="orb-sidebar-search-nav"
        />
        <SidebarNavButton
          icon={<Library className="h-4 w-4" />}
          label="Library"
          onClick={() => onOpenLibrary?.()}
          dataAttr="orb-sidebar-library"
        />
        <SidebarNavButton
          icon={<Grid3x3 className="h-4 w-4" />}
          label="Apps"
          onClick={() => onOpenTools?.()}
          dataAttr="orb-sidebar-apps"
        />
        <SidebarNavButton
          icon={<Bot className="h-4 w-4" />}
          label="Agents"
          onClick={() => onOpenAgents?.()}
          dataAttr="orb-sidebar-agents"
        />
        <SidebarNavButton
          icon={<Sparkles className="h-4 w-4" />}
          label="Deep research"
          onClick={() => onOpenDeepResearch?.()}
          dataAttr="orb-sidebar-deep-research"
        />
        <SidebarNavButton
          icon={<Wrench className="h-4 w-4" />}
          label="Tools"
          onClick={() => onOpenTools?.()}
          dataAttr="orb-sidebar-tools-nav"
        />

        <div className="mt-2 px-1">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2 focus-within:ring-1 focus-within:ring-[#00B8FF]/30">
            <Search className="h-4 w-4 shrink-0 text-[var(--orb-muted)]" aria-hidden />
            <input
              type="search"
              value={chatSearch}
              onChange={(e) => onChatSearchChange(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
              data-orb-sidebar-search
            />
          </label>
        </div>

        <p className="orb-sidebar-section-label mt-3">Projects</p>
        <SidebarNavButton
          icon={<FolderPlus className="h-4 w-4" />}
          label="New project"
          onClick={() => setProjectEditorOpen(true)}
          muted
          dataAttr="orb-sidebar-new-project"
        />

        <SectionToggle label="Your projects" open={projectsOpen} onToggle={() => setProjectsOpen((o) => !o)}>
          <ul className="space-y-0.5">
            {workspace.projects.map((project) => (
              <li key={project.id} className="group flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-[13px] transition ${
                    workspace.activeProjectId === project.id
                      ? 'orb-sidebar-chat-active bg-[#EAF6FF] font-semibold text-[#0077FF]'
                      : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
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
                <div className="orb-sidebar-inline-form mx-1 mt-1 space-y-2 rounded-lg border p-2">
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={saveProject} className="flex-1 rounded-lg py-1 text-xs font-semibold">
                      Save
                    </button>
                    <button type="button" onClick={() => setProjectEditorOpen(false)} className="flex-1 rounded-lg py-1 text-xs text-[var(--orb-muted)]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setProjectEditorOpen(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  Create project
                </button>
              )}
            </li>
          </ul>
        </SectionToggle>

        {workspace.profiles.length > 0 ? (
          <SectionToggle label="Profiles" open={profilesOpen} onToggle={() => setProfilesOpen((o) => !o)}>
            {profilesOpen ? (
              <p className="mx-1 mb-1 px-2 text-[10px] leading-4 text-slate-500">
                User-provided context only — does not access IndiCare OS records.
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {workspace.profiles.map((profile) => (
                <li key={profile.id} className="group flex items-center gap-2 px-1">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-100">
                    {profile.avatarInitial}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--orb-foreground)]">{profile.name}</span>
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
            </ul>
          </SectionToggle>
        ) : (
          <button
            type="button"
            onClick={() => {
              setProfileEditorOpen(true)
              setProfilesOpen(true)
            }}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Create standalone profile
          </button>
        )}

        {profileEditorOpen ? (
          <div className="orb-sidebar-inline-form mx-1 mt-2 space-y-2 rounded-lg border p-2">
            <input
              value={profileDraft.name}
              onChange={(e) => setProfileDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Name"
              className="w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
            />
            <input
              value={profileDraft.label}
              onChange={(e) => setProfileDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="Type (e.g. Child context)"
              className="w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
            />
            <textarea
              value={profileDraft.notes}
              onChange={(e) => setProfileDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Notes / context"
              rows={2}
              className="w-full rounded-lg border bg-transparent px-2 py-1.5 text-xs"
            />
            <div className="flex gap-2">
              <button type="button" onClick={saveProfile} className="flex-1 rounded-lg py-1 text-xs font-semibold">
                Save profile
              </button>
              <button type="button" onClick={() => setProfileEditorOpen(false)} className="flex-1 rounded-lg py-1 text-xs text-[var(--orb-muted)]">
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {pinnedChats.length > 0 ? (
          <SectionToggle label="Pinned" open={recentOpen} onToggle={() => setRecentOpen((o) => !o)}>
            <ChatList
              chats={pinnedChats}
              activeChatId={workspace.activeChatId}
              onSelectChat={onSelectChat}
              onRename={renameChat}
              onDelete={deleteChat}
              onPin={(chat) => updateChat(chat.id, { pinned: !chat.pinned })}
              onArchive={(chat) => updateChat(chat.id, { archived: true })}
            />
          </SectionToggle>
        ) : null}

        <SectionToggle label="Conversations" open={recentOpen} onToggle={() => setRecentOpen((o) => !o)}>
          {filteredChats.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">
              {chatSearch.trim() ? 'No matching chats.' : 'No chats in this project yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {timeGroupedChats.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                    {group.label}
                  </p>
                  <ChatList
                    chats={group.chats}
                    activeChatId={workspace.activeChatId}
                    onSelectChat={onSelectChat}
                    onRename={renameChat}
                    onDelete={deleteChat}
                    onPin={(chat) => updateChat(chat.id, { pinned: !chat.pinned })}
                    onArchive={(chat) => updateChat(chat.id, { archived: true })}
                  />
                </div>
              ))}
            </div>
          )}
        </SectionToggle>
      </div>

      <div className="shrink-0 space-y-1 border-t border-[var(--orb-line)] p-2">
        <SidebarNavButton
          icon={<Bookmark className="h-4 w-4" />}
          label="Saved outputs"
          onClick={() => onOpenSavedOutputs?.()}
          badge={typeof savedOutputsCount === 'number' && savedOutputsCount > 0 ? String(savedOutputsCount) : undefined}
          dataAttr="orb-sidebar-saved-outputs"
        />
        <SidebarNavButton
          icon={<BookOpen className="h-4 w-4" />}
          label="Knowledge library"
          onClick={() => onOpenLibrary?.()}
          dataAttr="orb-sidebar-knowledge"
        />
        <SidebarNavButton
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          onClick={() => onOpenSettings?.()}
          dataAttr="orb-sidebar-settings"
        />
        <SidebarNavButton
          icon={<HelpCircle className="h-4 w-4" />}
          label="Help"
          onClick={() => onOpenHelp?.()}
          comingSoon
          dataAttr="orb-sidebar-help"
        />
        {adultProfile && onOpenAdultProfile ? (
          <button
            type="button"
            onClick={onOpenAdultProfile}
            className="orb-adult-profile-card w-full text-left"
            data-orb-adult-profile-card
          >
            <p className="truncate text-sm font-semibold text-[var(--orb-foreground)]">
              {adultProfile.name?.trim() || 'Your profile'}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--orb-muted)]">
              {adultProfile.roleLabel}
              {adultProfile.homeName ? ` · ${adultProfile.homeName}` : ''}
            </p>
            <p className="mt-1.5 text-[10px] text-[var(--orb-muted)]">
              {cognitionModeLabel ?? 'General cognition'} · Tap to edit
            </p>
          </button>
        ) : null}
      </div>
    </>
  )
}

function startOfDay(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function groupChatsByRecency(chats: StandaloneChat[]) {
  const now = Date.now()
  const todayStart = startOfDay(now)
  const yesterdayStart = todayStart - 86_400_000
  const weekStart = todayStart - 6 * 86_400_000

  const today: StandaloneChat[] = []
  const yesterday: StandaloneChat[] = []
  const thisWeek: StandaloneChat[] = []
  const older: StandaloneChat[] = []

  for (const chat of chats) {
    const stamp = chat.updatedAt || chat.createdAt
    if (stamp >= todayStart) today.push(chat)
    else if (stamp >= yesterdayStart) yesterday.push(chat)
    else if (stamp >= weekStart) thisWeek.push(chat)
    else older.push(chat)
  }

  const groups: Array<{ label: string; chats: StandaloneChat[] }> = []
  if (today.length) groups.push({ label: 'Today', chats: today })
  if (yesterday.length) groups.push({ label: 'Yesterday', chats: yesterday })
  if (thisWeek.length) groups.push({ label: 'This Week', chats: thisWeek })
  if (older.length) groups.push({ label: 'Earlier', chats: older })
  return groups
}

function ChatList({
  chats,
  activeChatId,
  onSelectChat,
  onRename,
  onDelete,
  onPin,
  onArchive
}: {
  chats: StandaloneChat[]
  activeChatId: string | null
  onSelectChat: (chatId: string) => void
  onRename: (chatId: string) => void
  onDelete: (chatId: string) => void
  onPin: (chat: StandaloneChat) => void
  onArchive: (chat: StandaloneChat) => void
}) {
  return (
    <ul className="space-y-0.5">
      {chats.map((chat) => (
        <li key={chat.id} className="group flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSelectChat(chat.id)}
            className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-[13px] transition ${
              activeChatId === chat.id
                ? 'orb-sidebar-chat-active bg-[#EAF6FF] font-semibold text-[#0077FF]'
                : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
            }`}
          >
            {chat.pinned ? <Pin className="mr-1 inline h-3 w-3 text-amber-300/90" /> : null}
            {chat.title}
          </button>
          <ChatMenu
            chat={chat}
            onRename={() => onRename(chat.id)}
            onDelete={() => onDelete(chat.id)}
            onPin={() => onPin(chat)}
            onArchive={() => onArchive(chat)}
          />
        </li>
      ))}
    </ul>
  )
}

function SidebarNavButton({
  icon,
  label,
  onClick,
  muted,
  comingSoon,
  badge,
  dataAttr
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  muted?: boolean
  comingSoon?: boolean
  badge?: string
  dataAttr?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`orb-sidebar-nav-item ${muted ? 'orb-sidebar-nav-item--muted' : ''}`}
      data-orb-sidebar-nav={dataAttr}
      disabled={comingSoon}
    >
      <span className="text-[var(--orb-muted)]">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {comingSoon ? (
        <span className="rounded-full bg-[var(--orb-surface-hover)] px-1.5 py-0.5 text-[9px] text-[var(--orb-muted)]">
          Soon
        </span>
      ) : null}
      {badge ? (
        <span className="rounded-full bg-[var(--orb-surface-hover)] px-2 py-0.5 text-[10px] text-[var(--orb-muted)]">{badge}</span>
      ) : null}
    </button>
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
    <div className="mt-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
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
