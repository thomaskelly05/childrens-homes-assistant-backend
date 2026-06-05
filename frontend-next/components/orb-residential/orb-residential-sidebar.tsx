'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ClipboardPen,
  CreditCard,
  FileCheck,
  FileEdit,
  FileText,
  FolderKanban,
  FolderOpen,
  Library,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  PenLine,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  User,
  X
} from 'lucide-react'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbProjectMemoryModal } from '@/components/orb-residential/orb-project-memory-modal'
import {
  ORB_RESIDENTIAL_TAGLINE,
  residentialModeDisplayLabel
} from '@/lib/orb/orb-residential-copy'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'
import {
  ORB_SIDEBAR_PROJECTS_COLLAPSED_KEY,
  ORB_SIDEBAR_RECENTS_COLLAPSED_KEY,
  readOrbSidebarSectionCollapsed,
  writeOrbSidebarSectionCollapsed,
  type OrbSidebarSectionKey
} from '@/lib/orb/orb-sidebar-section-preference'
import { asArray } from '@/lib/orb/orb-safe-array'
import type { AdultProfile } from '@/lib/orb/adult-profile-store'
import { OrbSidebarChatList } from '@/components/orb-standalone/orb-sidebar-chat-menu'
import { useOrbMobileViewport } from '@/components/orb-standalone/use-orb-mobile-viewport'
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
  { id: 'orb_write', label: 'ORB Write', icon: FileEdit },
  { id: 'shift_builder', label: 'Shift Builder', icon: ClipboardPen },
  { id: 'review', label: 'Review', icon: FileCheck },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'saved', label: 'Saved outputs', icon: Save }
] as const

export type OrbResidentialPracticePanelId =
  | 'inspection_readiness'
  | 'safeguarding_thinking'
  | 'record_properly'

const DESKTOP_MAIN_NAV: Array<{
  id: (typeof NAV_ITEMS)[number]['id'] | 'chat'
  label: string
  helper?: string
  icon: (typeof NAV_ITEMS)[number]['icon']
  magicNotes?: boolean
}> = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'orb_dictate', label: 'Dictate', helper: 'Rough notes to records', icon: PenLine, magicNotes: true },
  { id: 'orb_write', label: 'ORB Write', helper: 'Document studio', icon: FileEdit },
  {
    id: 'shift_builder',
    label: 'Shift Builder',
    helper: 'Handover and shift plan',
    icon: ClipboardPen
  },
  { id: 'orb_voice', label: 'Voice', icon: Mic },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'saved', label: 'Saved Outputs', icon: Save }
]

const DESKTOP_PRACTICE_NAV: Array<{
  id: (typeof NAV_ITEMS)[number]['id'] | OrbResidentialPracticePanelId
  label: string
  icon: (typeof NAV_ITEMS)[number]['icon']
  practicePanel?: OrbResidentialPracticePanelId
}> = [
  { id: 'review', label: 'Review', icon: FileCheck },
  {
    id: 'inspection_readiness',
    label: residentialModeDisplayLabel('Ofsted Lens'),
    icon: ClipboardList,
    practicePanel: 'inspection_readiness'
  },
  {
    id: 'safeguarding_thinking',
    label: 'Safeguarding Thinking',
    icon: Shield,
    practicePanel: 'safeguarding_thinking'
  },
  {
    id: 'record_properly',
    label: 'Record This Properly',
    icon: FileCheck,
    practicePanel: 'record_properly'
  }
]

const DESKTOP_LIBRARY_NAV: Array<{
  id: (typeof NAV_ITEMS)[number]['id']
  label: string
  icon: (typeof NAV_ITEMS)[number]['icon']
}> = [
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'knowledge', label: 'Knowledge Centre', icon: Library }
]

const MOBILE_DRAWER_QUICK_NAV: Array<{
  id: (typeof NAV_ITEMS)[number]['id'] | 'projects'
  label: string
  helper?: string
  icon: (typeof NAV_ITEMS)[number]['icon']
}> = [
  { id: 'orb_dictate', label: 'Dictate', helper: 'Rough notes to records', icon: PenLine },
  { id: 'orb_write', label: 'ORB Write', helper: 'Document studio', icon: FileEdit },
  {
    id: 'shift_builder',
    label: 'Shift Builder',
    helper: "Plans, handovers and what's missing",
    icon: ClipboardPen
  },
  { id: 'orb_voice', label: 'Voice', icon: Mic },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'saved', label: 'Saved Outputs', icon: Save },
  { id: 'projects', label: 'Projects', icon: FolderKanban }
]

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

function DesktopSidebarNavButton({
  label,
  helper,
  icon: Icon,
  onClick,
  badge,
  dataOrb,
  stationId,
  active
}: {
  label: string
  helper?: string
  icon: (typeof NAV_ITEMS)[number]['icon']
  onClick: () => void
  badge?: string
  dataOrb?: string
  stationId?: OrbResidentialStationId
  active?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`orb-sidebar-nav-item w-full ${active ? 'orb-sidebar-nav-item--active' : ''}`}
        aria-label={helper ? `${label} — ${helper}` : label}
        {...(stationId ? { 'data-orb-sidebar-station': stationId } : {})}
        {...(dataOrb ? { [`data-${dataOrb}`]: true } : {})}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="text-sm">{label}</span>
          {helper ? (
            <span className="text-[10px] leading-tight text-[var(--orb-muted)]">{helper}</span>
          ) : null}
        </span>
        {badge ? (
          <span className="rounded-full bg-[var(--orb-surface-hover)] px-2 py-0.5 text-[10px]">
            {badge}
          </span>
        ) : null}
      </button>
    </li>
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
  onSelectMode,
  onOpenPracticePanel,
  activeMode,
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
  onSelectMode?: (mode: StandaloneOrbMode) => void
  onOpenPracticePanel?: (panel: OrbResidentialPracticePanelId) => void
  activeMode?: StandaloneOrbMode
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
  const [accountCollapsed, setAccountCollapsed] = useState(() => readOrbSidebarSectionCollapsed('account'))
  const [projectEditorOpen, setProjectEditorOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [memoryModalProject, setMemoryModalProject] = useState<StandaloneProject | null>(null)
  const isMobile = useOrbMobileViewport()

  /** Desktop first visit — collapse Projects/Recents for a calmer menu (mobile defaults unchanged). */
  useEffect(() => {
    if (isMobile || typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(ORB_SIDEBAR_PROJECTS_COLLAPSED_KEY) === null) {
        setProjectsCollapsed(true)
        writeOrbSidebarSectionCollapsed('projects', true)
      }
      if (window.localStorage.getItem(ORB_SIDEBAR_RECENTS_COLLAPSED_KEY) === null) {
        setRecentsCollapsed(true)
        writeOrbSidebarSectionCollapsed('recents', true)
      }
    } catch {
      // ignore
    }
  }, [isMobile])

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

  function openStation(station: OrbResidentialStationId) {
    if (station === 'saved') onOpenSavedOutputs?.()
    else onOpenStation(station)
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-orb-sidebar-panel>
      <div className="orb-sidebar-header shrink-0 px-3 py-3" data-orb-sidebar-header>
        <div className="flex items-start gap-2.5">
          <GlassOrbMark size="sm" className="mt-0.5" pulse />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-[var(--orb-foreground)]" data-orb-sidebar-brand>
              ORB Residential
            </p>
            <p className="orb-sidebar-powered-tagline mt-0.5 text-[10px]" data-orb-sidebar-powered>
              {ORB_RESIDENTIAL_TAGLINE}
            </p>
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
          className="orb-sidebar-nav-item orb-sidebar-nav-item--primary mt-2.5 w-full"
          data-orb-sidebar-new-chat
          aria-label="New chat"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          <span>New chat</span>
        </button>
        <label
          className="orb-sidebar-search mt-2 flex items-center gap-2 rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-3 py-2"
          data-orb-sidebar-search-wrap
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--orb-muted)]" aria-hidden />
          <input
            type="search"
            value={chatSearch}
            onChange={(e) => onChatSearchChange(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="w-full bg-transparent text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
            data-orb-sidebar-search
          />
        </label>
      </div>

      <div className="orb-sidebar-group min-h-0 flex-1 overflow-y-auto px-2 py-2" data-orb-sidebar-scroll>

        {isMobile ? (
          <nav className="mb-3 shrink-0 space-y-0.5" aria-label="ORB menu" data-orb-sidebar-mobile-quick-nav>
            <button
              type="button"
              onClick={() => {
                onChatSearchChange('')
                document.querySelector<HTMLInputElement>('[data-orb-sidebar-search]')?.focus()
              }}
              className="orb-sidebar-nav-item w-full"
              data-orb-sidebar-search-shortcut
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="text-sm">Search</span>
            </button>
            {MOBILE_DRAWER_QUICK_NAV.map((item) => {
              const Icon = item.icon
              const badge =
                item.id === 'saved' && savedOutputsCount ? String(savedOutputsCount) : undefined
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onClose?.()
                    if (item.id === 'saved') {
                      onOpenSavedOutputs?.()
                      return
                    }
                    if (item.id === 'projects') {
                      setProjectsCollapsed(false)
                      writeOrbSidebarSectionCollapsed('projects', false)
                      return
                    }
                    onOpenStation(item.id)
                  }}
                  className="orb-sidebar-nav-item w-full"
                  data-orb-sidebar-station={item.id}
                  {...(item.id === 'orb_dictate' ? { 'data-orb-sidebar-magic-notes': true } : {})}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col text-left">
                    <span className="text-sm">{item.label}</span>
                    {item.helper ? (
                      <span className="text-[10px] leading-tight text-[var(--orb-muted)]">{item.helper}</span>
                    ) : null}
                  </span>
                  {badge ? (
                    <span className="rounded-full bg-[var(--orb-surface-hover)] px-2 py-0.5 text-[10px]">
                      {badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => {
                setRecentsCollapsed(false)
                writeOrbSidebarSectionCollapsed('recents', false)
                onClose?.()
              }}
              className="orb-sidebar-nav-item w-full"
              data-orb-sidebar-recent-chats-shortcut
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="text-sm">Recent chats</span>
            </button>
          </nav>
        ) : null}

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
                      className="rounded-full bg-[var(--orb-royal-blue,#168bff)] px-3 py-1 text-xs font-semibold text-white"
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

        {!isMobile ? (
          <nav className="mb-2 space-y-3" aria-label="ORB desktop navigation" data-orb-sidebar-desktop-nav>
            <div data-orb-sidebar-section="main">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
                Main
              </p>
              <ul className="mt-1 space-y-0.5" data-orb-sidebar-main>
                {DESKTOP_MAIN_NAV.map((entry) => {
                  const Icon = entry.icon
                  const isChat = entry.id === 'chat'
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isChat) {
                            onNewChat(workspace.activeProjectId)
                            return
                          }
                          openStation(entry.id as OrbResidentialStationId)
                        }}
                        className="orb-sidebar-nav-item w-full"
                        {...(entry.id === 'orb_dictate' ? { 'data-orb-sidebar-magic-notes': true } : {})}
                        {...(isChat ? { 'data-orb-sidebar-chat': true } : { 'data-orb-sidebar-station': entry.id })}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex min-w-0 flex-1 flex-col text-left">
                          <span className="text-sm">{entry.label}</span>
                          {entry.helper ? (
                            <span className="text-[10px] leading-tight text-[var(--orb-muted)]">{entry.helper}</span>
                          ) : null}
                        </span>
                        {entry.id === 'saved' && savedOutputsCount ? (
                          <span className="rounded-full bg-[var(--orb-surface-hover)] px-2 py-0.5 text-[10px]">
                            {savedOutputsCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div data-orb-sidebar-section="practice">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
                Practice
              </p>
              <ul className="mt-1 space-y-0.5" data-orb-sidebar-practice>
                {DESKTOP_PRACTICE_NAV.map((entry) => (
                  <DesktopSidebarNavButton
                    key={entry.id}
                    label={entry.label}
                    icon={entry.icon}
                    stationId={entry.practicePanel ? undefined : (entry.id as OrbResidentialStationId)}
                    onClick={() => {
                      if (entry.practicePanel) {
                        onOpenPracticePanel?.(entry.practicePanel)
                        return
                      }
                      openStation(entry.id as OrbResidentialStationId)
                    }}
                    dataOrb={
                      entry.practicePanel
                        ? `orb-sidebar-practice-${entry.practicePanel}`
                        : `orb-sidebar-station-${entry.id}`
                    }
                  />
                ))}
              </ul>
            </div>

            <div data-orb-sidebar-section="library">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
                Library
              </p>
              <ul className="mt-1 space-y-0.5" data-orb-sidebar-library>
                {DESKTOP_LIBRARY_NAV.map((station) => (
                  <DesktopSidebarNavButton
                    key={station.id}
                    label={station.label}
                    icon={station.icon}
                    stationId={station.id}
                    onClick={() => openStation(station.id)}
                  />
                ))}
              </ul>
            </div>
          </nav>
        ) : null}
      </div>

      <div
        className="orb-sidebar-footer mt-auto shrink-0 border-t border-[var(--orb-line)]/40 px-2 py-2"
        data-orb-sidebar-account-footer
      >
        {isMobile ? (
          <SidebarCollapsibleSection
            sectionKey="account"
            title="Account / Workspace"
            collapsed={accountCollapsed}
            onToggle={() => toggleSection('account', accountCollapsed, setAccountCollapsed)}
          >
            <div className="space-y-0.5 pt-0" data-orb-sidebar-bottom>
              <button
                type="button"
                onClick={() => onOpenProfile?.()}
                className="orb-sidebar-nav-item w-full"
                data-orb-sidebar-profile
                aria-label="Open profile"
              >
                <User className="h-4 w-4" aria-hidden />
                <span className="truncate">{adultProfile?.name?.trim() || 'Profile'}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenSettings?.()}
                className="orb-sidebar-nav-item w-full"
                data-orb-sidebar-settings
                aria-label="Open settings"
              >
                <Settings className="h-4 w-4" aria-hidden />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenBilling?.()}
                className="orb-sidebar-nav-item w-full"
                data-orb-sidebar-billing
                aria-label="Open billing"
              >
                <CreditCard className="h-4 w-4" aria-hidden />
                <span>Billing</span>
              </button>
              <Link href="/os" className="orb-sidebar-nav-item w-full" data-orb-sidebar-os-link>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-400/90">
                  IndiCare OS
                </span>
              </Link>
            </div>
          </SidebarCollapsibleSection>
        ) : (
          <nav className="space-y-0.5" aria-label="Account and settings" data-orb-sidebar-bottom>
            <button
              type="button"
              onClick={() => onOpenProfile?.()}
              className="orb-sidebar-nav-item w-full"
              data-orb-sidebar-profile
              aria-label="Open profile"
            >
              <User className="h-4 w-4" aria-hidden />
              <span className="truncate">{adultProfile?.name?.trim() || 'Profile'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSettings?.()}
              className="orb-sidebar-nav-item w-full"
              data-orb-sidebar-settings
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4" aria-hidden />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenBilling?.()}
              className="orb-sidebar-nav-item w-full"
              data-orb-sidebar-billing
              aria-label="Open billing"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              <span>Billing</span>
            </button>
            <Link
              href="/os"
              className="orb-sidebar-nav-item w-full"
              data-orb-sidebar-os-link
              aria-label="Open IndiCare OS"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-royal-blue,#168bff)]/90">
                IndiCare OS
              </span>
            </Link>
          </nav>
        )}
      </div>

      <OrbProjectMemoryModal
        open={Boolean(memoryModalProject)}
        projectName={memoryModalProject?.name || 'Project'}
        initialMemory={memoryModalProject?.memory || memoryModalProject?.description || ''}
        onClose={() => setMemoryModalProject(null)}
        onSave={(memory) => {
          if (memoryModalProject) saveProjectMemory(memoryModalProject.id, memory)
        }}
      />
    </div>
  )
}
