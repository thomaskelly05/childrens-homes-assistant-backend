'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck,
  FileText,
  FolderKanban,
  FolderOpen,
  Library,
  MessageSquarePlus,
  Mic,
  PenLine,
  Save,
  Search,
  Settings,
  Sparkles,
  User,
  X
} from 'lucide-react'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbProjectMemoryModal } from '@/components/orb-residential/orb-project-memory-modal'
import { ORB_RESIDENTIAL_TAGLINE } from '@/lib/orb/orb-residential-copy'
import {
  readOrbSidebarSectionCollapsed,
  writeOrbSidebarSectionCollapsed,
  type OrbSidebarSectionKey
} from '@/lib/orb/orb-sidebar-section-preference'
import { asArray } from '@/lib/orb/orb-safe-array'
import type { AdultProfile } from '@/lib/orb/adult-profile-store'
import { OrbSidebarChatList } from '@/components/orb-standalone/orb-sidebar-chat-menu'
import {
  createStandaloneProject,
  searchChats,
  STANDALONE_GENERAL_PROJECT_ID,
  type StandaloneChat,
  type StandaloneProject,
  type StandaloneWorkspace
} from '@/lib/orb/standalone-local-store'

const NAV_ITEMS = [
  { id: 'skills', label: 'Skills', icon: Sparkles },
  { id: 'knowledge', label: 'Library', icon: Library },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'orb_voice', label: 'Voice', icon: Mic },
  { id: 'orb_dictate', label: 'Dictate', icon: PenLine },
  { id: 'review', label: 'Review', icon: FileCheck },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'saved', label: 'Saved outputs', icon: Save }
] as const

export type OrbResidentialStationId = (typeof NAV_ITEMS)[number]['id']

function startOfDay(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function groupChatsByRecency(chats: StandaloneChat[]) {
  const now = Date.now()
  const todayStart = startOfDay(now)
  const sevenDaysStart = todayStart - 6 * 86_400_000

  const today: StandaloneChat[] = []
  const previous7: StandaloneChat[] = []
  const older: StandaloneChat[] = []

  for (const chat of chats) {
    const stamp = chat.updatedAt || chat.createdAt
    if (stamp >= todayStart) today.push(chat)
    else if (stamp >= sevenDaysStart) previous7.push(chat)
    else older.push(chat)
  }

  const groups: Array<{ label: string; chats: StandaloneChat[] }> = []
  if (today.length) groups.push({ label: 'Today', chats: today })
  if (previous7.length) groups.push({ label: 'Recent', chats: previous7 })
  if (older.length) groups.push({ label: 'Older', chats: older })
  return groups
}

function SidebarCollapsibleSection({
  sectionKey,
  title,
  collapsed,
  onToggle,
  children
}: {
  sectionKey: OrbSidebarSectionKey
  title: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="mb-2" data-orb-sidebar-section={sectionKey}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]"
        onClick={onToggle}
        aria-expanded={!collapsed}
        data-orb-sidebar-section-toggle={sectionKey}
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${collapsed ? '-rotate-90' : ''}`}
          aria-hidden
        />
      </button>
      {!collapsed ? <div className="mt-1">{children}</div> : null}
    </div>
  )
}

function SidebarIconButton({
  label,
  onClick,
  children,
  active,
  dataOrb
}: {
  label: string
  onClick: () => void
  children: ReactNode
  active?: boolean
  dataOrb?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`orb-sidebar-nav-item w-full ${active ? 'orb-sidebar-nav-item--active' : ''}`}
      aria-label={label}
      title={label}
      {...(dataOrb ? { [`data-${dataOrb}`]: true } : {})}
    >
      {children}
      <span className="orb-sidebar-nav-item__label sr-only">{label}</span>
    </button>
  )
}

export function OrbResidentialSidebar({
  workspace,
  chatSearch,
  onChatSearchChange,
  onSelectChat,
  onNewChat,
  onOpenStation,
  onOpenSettings,
  onOpenSavedOutputs,
  onOpenProfile,
  onOpenBilling,
  onWorkspaceChange,
  onSelectProject,
  collapsed = false,
  onToggleCollapse,
  adultProfile,
  savedOutputsCount,
  onClose
}: {
  workspace: StandaloneWorkspace
  chatSearch: string
  onChatSearchChange: (value: string) => void
  onSelectChat: (chatId: string) => void
  onNewChat: (projectId?: string) => void
  onOpenStation: (station: OrbResidentialStationId) => void
  onOpenSettings?: () => void
  onOpenSavedOutputs?: () => void
  onOpenProfile?: () => void
  onOpenBilling?: () => void
  onWorkspaceChange: (next: StandaloneWorkspace) => void
  onSelectProject?: (projectId: string) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  adultProfile?: AdultProfile | null
  savedOutputsCount?: number
  onClose?: () => void
}) {
  const [projectsCollapsed, setProjectsCollapsed] = useState(() => readOrbSidebarSectionCollapsed('projects'))
  const [recentsCollapsed, setRecentsCollapsed] = useState(() => readOrbSidebarSectionCollapsed('recents'))
  const [appsCollapsed, setAppsCollapsed] = useState(() => readOrbSidebarSectionCollapsed('apps'))
  const [accountCollapsed, setAccountCollapsed] = useState(() => readOrbSidebarSectionCollapsed('account'))
  const [projectEditorOpen, setProjectEditorOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [memoryModalProject, setMemoryModalProject] = useState<StandaloneProject | null>(null)

  function toggleSection(section: OrbSidebarSectionKey, collapsed: boolean, setter: (v: boolean) => void) {
    const next = !collapsed
    setter(next)
    writeOrbSidebarSectionCollapsed(section, next)
  }

  const chats = asArray<StandaloneChat>(workspace.chats)
  const projects = asArray<StandaloneProject>(workspace.projects)

  const filteredChats = useMemo(
    () =>
      searchChats(chats, chatSearch, {
        projectId: chatSearch.trim() ? undefined : workspace.activeProjectId,
        includeArchived: false
      }),
    [chats, chatSearch, workspace.activeProjectId]
  )
  const timeGroupedChats = useMemo(() => groupChatsByRecency(filteredChats), [filteredChats])

  const activeProject = projects.find((project) => project.id === workspace.activeProjectId)

  function updateChat(chatId: string, patch: Partial<StandaloneChat>) {
    onWorkspaceChange({
      ...workspace,
      chats: chats.map((c) => (c.id === chatId ? { ...c, ...patch, updatedAt: Date.now() } : c))
    })
  }

  function deleteChat(chatId: string) {
    const nextChats = chats.filter((c) => c.id !== chatId)
    const activeChatId = workspace.activeChatId === chatId ? nextChats[0]?.id ?? null : workspace.activeChatId
    onWorkspaceChange({ ...workspace, chats: nextChats, activeChatId })
  }

  function renameChat(chatId: string) {
    const chat = chats.find((c) => c.id === chatId)
    if (!chat) return
    const next = window.prompt('Rename chat', chat.title)
    if (!next?.trim()) return
    updateChat(chatId, { title: next.trim() })
  }

  function moveChatToProject(chatId: string) {
    const chat = chats.find((c) => c.id === chatId)
    if (!chat) return
    const choice = window.prompt(
      `Move "${chat.title}" to project:\n${projects.map((p) => `• ${p.name}`).join('\n')}\n\nEnter project name`
    )
    if (!choice?.trim()) return
    const project = projects.find((p) => p.name.toLowerCase() === choice.trim().toLowerCase())
    if (!project) return
    updateChat(chatId, { projectId: project.id })
  }

  function saveProject() {
    const name = newProjectName.trim()
    if (!name) return
    const project = createStandaloneProject(name)
    onWorkspaceChange({
      ...workspace,
      projects: [...projects, project],
      activeProjectId: project.id
    })
    setNewProjectName('')
    setProjectEditorOpen(false)
    setProjectsCollapsed(false)
    writeOrbSidebarSectionCollapsed('projects', false)
    onSelectProject?.(project.id)
  }

  function renameProject(project: StandaloneProject) {
    const next = window.prompt('Rename project', project.name)
    if (!next?.trim()) return
    onWorkspaceChange({
      ...workspace,
      projects: projects.map((p) =>
        p.id === project.id ? { ...p, name: next.trim(), updatedAt: Date.now() } : p
      )
    })
  }

  function deleteProject(projectId: string) {
    if (projectId === STANDALONE_GENERAL_PROJECT_ID) return
    const nextChats = chats.map((c) =>
      c.projectId === projectId ? { ...c, projectId: STANDALONE_GENERAL_PROJECT_ID } : c
    )
    onWorkspaceChange({
      ...workspace,
      projects: projects.filter((p) => p.id !== projectId),
      chats: nextChats,
      activeProjectId:
        workspace.activeProjectId === projectId ? STANDALONE_GENERAL_PROJECT_ID : workspace.activeProjectId
    })
  }

  function saveProjectMemory(projectId: string, memory: string) {
    onWorkspaceChange({
      ...workspace,
      projects: projects.map((p) =>
        p.id === projectId
          ? { ...p, memory: memory || undefined, updatedAt: Date.now() }
          : p
      )
    })
  }

  if (collapsed) {
    return (
      <div className="orb-sidebar-rail flex h-full flex-col items-center gap-1 py-2" data-orb-sidebar-collapsed="true">
        {onToggleCollapse ? (
          <button
            type="button"
            className="mb-1 rounded-lg p-2 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            data-orb-sidebar-expand
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
        <GlassOrbMark size="sm" className="mb-2" pulse />
        <SidebarIconButton
          label="New chat"
          onClick={() => onNewChat(workspace.activeProjectId)}
          dataOrb="orb-sidebar-new-chat"
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
        </SidebarIconButton>
        <SidebarIconButton
          label="Search chats"
          onClick={() => {
            onToggleCollapse?.()
            window.setTimeout(() => {
              document.querySelector<HTMLInputElement>('[data-orb-sidebar-search]')?.focus()
            }, 120)
          }}
          dataOrb="orb-sidebar-search-nav"
        >
          <Search className="h-4 w-4 shrink-0" />
        </SidebarIconButton>
        <SidebarIconButton
          label="Projects"
          onClick={() => {
            onToggleCollapse?.()
            setProjectsCollapsed(false)
            writeOrbSidebarSectionCollapsed('projects', false)
          }}
          dataOrb="orb-sidebar-projects-nav"
        >
          <FolderKanban className="h-4 w-4 shrink-0" />
        </SidebarIconButton>
        <div className="mt-auto flex w-full flex-col gap-0.5 px-1">
          {NAV_ITEMS.slice(0, 3).map((station) => {
            const Icon = station.icon
            return (
              <SidebarIconButton
                key={station.id}
                label={station.label}
                onClick={() => {
                  if (station.id === 'saved') onOpenSavedOutputs?.()
                  else onOpenStation(station.id)
                }}
                dataOrb={`orb-sidebar-station-${station.id}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </SidebarIconButton>
            )
          })}
          <SidebarIconButton label="Settings" onClick={() => onOpenSettings?.()} dataOrb="orb-sidebar-settings">
            <Settings className="h-4 w-4 shrink-0" />
          </SidebarIconButton>
          <SidebarIconButton label="Account" onClick={() => onOpenProfile?.()} dataOrb="orb-sidebar-profile">
            <User className="h-4 w-4 shrink-0" />
          </SidebarIconButton>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="shrink-0 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <GlassOrbMark size="sm" className="mt-0.5" pulse />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-[var(--orb-foreground)]" data-orb-sidebar-brand>
              ORB Residential
            </p>
            <p className="orb-sidebar-powered-tagline mt-0.5 text-[10px]">{ORB_RESIDENTIAL_TAGLINE}</p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {onToggleCollapse ? (
              <button
                type="button"
                className="hidden rounded-lg p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] lg:inline-flex"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                data-orb-sidebar-collapse
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                className="rounded-lg p-1 text-[var(--orb-muted)] lg:hidden"
                onClick={onClose}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNewChat(workspace.activeProjectId)}
          className="orb-sidebar-nav-item orb-sidebar-nav-item--active mt-2.5 w-full"
          data-orb-sidebar-new-chat
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>New chat</span>
        </button>
      </div>

      <div className="orb-sidebar-group min-h-0 flex-1 overflow-y-auto px-2 py-2" data-orb-sidebar-scroll>
        <label className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-3 py-2">
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

        <SidebarCollapsibleSection
          sectionKey="projects"
          title="Projects"
          collapsed={projectsCollapsed}
          onToggle={() => toggleSection('projects', projectsCollapsed, setProjectsCollapsed)}
        >
          <div data-orb-sidebar-projects className="space-y-0.5">
              {projectEditorOpen ? (
                <div className="rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] p-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full rounded-lg border border-[var(--orb-line)]/50 bg-transparent px-2 py-1.5 text-sm text-[var(--orb-foreground)] outline-none"
                    data-orb-sidebar-new-project-input
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={saveProject}
                      className="rounded-full bg-[#168bff] px-3 py-1 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectEditorOpen(false)}
                      className="rounded-full px-3 py-1 text-xs text-[var(--orb-muted)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setProjectEditorOpen(true)}
                  className="orb-sidebar-nav-item w-full text-[var(--orb-muted)]"
                  data-orb-sidebar-new-project
                >
                  <FolderKanban className="h-4 w-4" />
                  <span>New project</span>
                </button>
              )}
              <ul className="space-y-0.5" data-orb-sidebar-project-list>
                {projects.map((project) => (
                  <li key={project.id} className="group flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onSelectProject?.(project.id)}
                      className={`min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
                        workspace.activeProjectId === project.id
                          ? 'orb-sidebar-nav-item--active font-semibold'
                          : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
                      }`}
                      data-orb-sidebar-project={project.id}
                      title={project.description}
                    >
                      <span className="truncate">{project.name}</span>
                    </button>
                    {project.id !== STANDALONE_GENERAL_PROJECT_ID ? (
                      <div className="flex opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded p-1 text-[10px] text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
                          aria-label={`Rename ${project.name}`}
                          onClick={() => renameProject(project)}
                        >
                          ···
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              {activeProject?.description ? (
                <p className="mt-1.5 px-2 text-[10px] leading-4 text-[var(--orb-muted)]" data-orb-sidebar-project-context>
                  {activeProject.description}
                  <button
                    type="button"
                    className="ml-1 underline underline-offset-2 hover:text-[var(--orb-foreground)]"
                    onClick={() => setMemoryModalProject(activeProject)}
                    data-orb-sidebar-edit-project-memory
                  >
                    Edit memory
                  </button>
                </p>
              ) : activeProject ? (
                <button
                  type="button"
                  className="mt-1 px-2 text-[10px] text-[var(--orb-muted)] underline underline-offset-2 hover:text-[var(--orb-foreground)]"
                  onClick={() => setMemoryModalProject(activeProject)}
                  data-orb-sidebar-add-project-memory
                >
                  Add optional project memory
                </button>
              ) : null}
          </div>
        </SidebarCollapsibleSection>

        <SidebarCollapsibleSection
          sectionKey="recents"
          title="Recent chats"
          collapsed={recentsCollapsed}
          onToggle={() => toggleSection('recents', recentsCollapsed, setRecentsCollapsed)}
        >
          {filteredChats.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--orb-muted)]">No chats yet — ask ORB anything.</p>
          ) : (
            <div className="space-y-2.5" data-orb-sidebar-recents>
              {timeGroupedChats.map((group) => (
                <div key={group.label}>
                  <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--orb-muted)]">
                    {group.label}
                  </p>
                  <OrbSidebarChatList
                    chats={group.chats}
                    activeChatId={workspace.activeChatId}
                    onSelectChat={onSelectChat}
                    onRename={renameChat}
                    onDelete={deleteChat}
                    onPin={(chat) => updateChat(chat.id, { pinned: !chat.pinned })}
                    onArchive={(chat) => updateChat(chat.id, { archived: true })}
                    onMoveToProject={moveChatToProject}
                  />
                </div>
              ))}
            </div>
          )}
        </SidebarCollapsibleSection>

        <SidebarCollapsibleSection
          sectionKey="apps"
          title="Apps"
          collapsed={appsCollapsed}
          onToggle={() => toggleSection('apps', appsCollapsed, setAppsCollapsed)}
        >
          <ul className="space-y-0.5" data-orb-sidebar-stations>
            {NAV_ITEMS.map((station) => {
              const Icon = station.icon
              const badge =
                station.id === 'saved' && savedOutputsCount ? String(savedOutputsCount) : undefined
              return (
                <li key={station.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (station.id === 'saved') onOpenSavedOutputs?.()
                      else onOpenStation(station.id)
                    }}
                    className="orb-sidebar-nav-item w-full"
                    data-orb-sidebar-station={station.id}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left text-sm">{station.label}</span>
                    {badge ? (
                      <span className="rounded-full bg-[var(--orb-surface-hover)] px-2 py-0.5 text-[10px]">
                        {badge}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </SidebarCollapsibleSection>
      </div>

      <SidebarCollapsibleSection
        sectionKey="account"
        title="Account / Workspace"
        collapsed={accountCollapsed}
        onToggle={() => toggleSection('account', accountCollapsed, setAccountCollapsed)}
      >
        <div className="shrink-0 space-y-0.5 p-2 pt-0" data-orb-sidebar-bottom>
          <button
            type="button"
            onClick={() => onOpenProfile?.()}
            className="orb-sidebar-nav-item w-full"
            data-orb-sidebar-profile
          >
            <User className="h-4 w-4" />
            <span className="truncate">{adultProfile?.name?.trim() || 'Profile'}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenSettings?.()}
            className="orb-sidebar-nav-item w-full"
            data-orb-sidebar-settings
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenBilling?.()}
            className="orb-sidebar-nav-item w-full"
            data-orb-sidebar-billing
          >
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </button>
          <Link href="/os" className="orb-sidebar-nav-item w-full" data-orb-sidebar-os-link>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-400/90">IndiCare OS</span>
          </Link>
        </div>
      </SidebarCollapsibleSection>

      <OrbProjectMemoryModal
        open={Boolean(memoryModalProject)}
        projectName={memoryModalProject?.name || 'Project'}
        initialMemory={memoryModalProject?.memory || memoryModalProject?.description || ''}
        onClose={() => setMemoryModalProject(null)}
        onSave={(memory) => {
          if (memoryModalProject) saveProjectMemory(memoryModalProject.id, memory)
        }}
      />
    </>
  )
}
