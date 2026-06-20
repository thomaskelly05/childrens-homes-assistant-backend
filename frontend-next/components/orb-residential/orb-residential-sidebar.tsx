'use client'

import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  FolderKanban,
  Home,
  LifeBuoy,
  MessageSquare,
  MessageSquarePlus,
  MessagesSquare,
  Mic,
  PenLine,
  Save,
  Search,
  Settings,
  X
} from 'lucide-react'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbBrandMark } from '@/components/orb-residential/ui/orb-brand-mark'
import { OrbIcon } from '@/components/orb-residential/ui/orb-icon'
import { OrbUserAvatar } from '@/components/orb-residential/orb-user-avatar'
import { OrbProjectMemoryModal } from '@/components/orb-residential/orb-project-memory-modal'
import { ORB_RESIDENTIAL_TAGLINE, ORB_RESIDENTIAL_TAGLINE_FULL } from '@/lib/orb/orb-residential-copy'
import {
  ORB_NAV_RECORDS,
  ORB_NAV_WRITE,
  ORB_VISIBLE_SIDEBAR_NAV
} from '@/lib/orb/orb-user-facing-names'
import { getOrbSearchSurface } from '@/lib/orb/orb-search-registry'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'
import {
  ORB_SIDEBAR_PROJECTS_COLLAPSED_KEY,
  ORB_SIDEBAR_RECENTS_COLLAPSED_KEY,
  readOrbSidebarSectionCollapsed,
  writeOrbSidebarSectionCollapsed,
  type OrbSidebarSectionKey
} from '@/lib/orb/orb-sidebar-section-preference'
import { formatOrbChatDisplayTitle, isMeaningfulOrbRecentChat } from '@/lib/orb/orb-chat-display-title'
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

/** Internal station ids — legacy panels hidden from primary nav but still routable. */
const NAV_ITEMS = [
  { id: 'skills', label: 'Skills', icon: Settings },
  { id: 'knowledge', label: 'Library', icon: BookOpen },
  { id: 'templates', label: 'Templates', icon: FileEdit },
  { id: 'orb_voice', label: 'Voice', icon: Mic },
  { id: 'orb_dictate', label: 'Dictate', icon: PenLine },
  { id: 'orb_communicate', label: 'Communicate', icon: MessagesSquare },
  { id: 'orb_write', label: ORB_NAV_WRITE, icon: FileEdit },
  { id: 'shift_builder', label: 'Shift Builder', icon: FileEdit },
  { id: 'review', label: 'Review', icon: FileEdit },
  { id: 'documents', label: 'Documents & Guidance', icon: BookOpen },
  { id: 'saved', label: ORB_NAV_RECORDS, icon: Save }
] as const

import type { OrbResidentialPracticePanelId } from '@/lib/orb/orb-navigation-convergence'

export type { OrbResidentialPracticePanelId }

const NAV_ICON_BY_ID: Record<string, typeof Home> = {
  home: Home,
  chat: MessageSquare,
  orb_dictate: PenLine,
  orb_communicate: MessagesSquare,
  orb_voice: Mic,
  orb_write: FileEdit,
  saved: Save,
  help: LifeBuoy,
  settings: Settings
}

const NAV_ICON_NAME_BY_ID: Record<string, import('@/components/orb-residential/ui/orb-icon').OrbIconName> = {
  home: 'home',
  chat: 'chat',
  orb_dictate: 'dictate',
  orb_voice: 'voice',
  orb_communicate: 'communicate',
  orb_write: 'write',
  saved: 'records',
  help: 'help',
  settings: 'settings'
}

/** Phase 1A — single visible sidebar list (no Library section). */
const RESIDENTIAL_VISIBLE_NAV = ORB_VISIBLE_SIDEBAR_NAV.map((entry) => ({
  ...entry,
  iconName: NAV_ICON_NAME_BY_ID[entry.id] ?? 'chat'
}))

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
  dataOrb,
  buttonRef
}: {
  label: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  children: ReactNode
  active?: boolean
  dataOrb?: string
  buttonRef?: RefObject<HTMLButtonElement | null>
}) {
  return (
    <button
      type="button"
      ref={buttonRef}
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

function IndiCareOsComingLaterButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`orb-sidebar-nav-item w-full items-start gap-0.5 py-2 opacity-80 ${className}`.trim()}
        data-orb-sidebar-os-link
        data-orb-sidebar-os-coming-later
        aria-label="IndiCare OS — coming later"
        onClick={() => setOpen(true)}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
          IndiCare OS
        </span>
        <span className="text-[10px] text-[var(--orb-muted)]/80">Coming later</span>
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
          data-orb-sidebar-os-coming-later-backdrop
        >
          <div
            role="dialog"
            aria-labelledby="orb-os-coming-later-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-[var(--orb-line)]/45 bg-[var(--orb-surface-elevated)] p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            data-orb-sidebar-os-coming-later-dialog
          >
            <h2 id="orb-os-coming-later-title" className="text-sm font-semibold text-[var(--orb-foreground)]">
              IndiCare OS — coming later
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--orb-muted)]">
              The full IndiCare operating system for children&apos;s homes is still in development. ORB Residential
              is available now for recording, reflection and safer wording.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-full bg-[var(--orb-primary)] px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
              data-orb-sidebar-os-coming-later-close
            >
              Continue with ORB Residential
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function OrbResidentialSidebar({
  workspace,
  chatSearch,
  onChatSearchChange,
  onSelectChat,
  onNewChat,
  onOpenChat,
  onOpenStation,
  onOpenHome,
  onOpenHelp,
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
  userName,
  userEmail,
  avatarUrl,
  subscriptionStatusLabel,
  onClose
}: {
  workspace: StandaloneWorkspace
  chatSearch: string
  onChatSearchChange: (value: string) => void
  onSelectChat: (chatId: string) => void
  onNewChat: (projectId?: string) => void
  /** Return to the active chat thread without starting a new chat. */
  onOpenChat?: () => void
  onOpenStation: (station: OrbResidentialStationId) => void
  onOpenHome?: () => void
  onOpenHelp?: () => void
  onOpenSettings?: () => void
  onOpenSavedOutputs?: () => void
  onOpenProfile?: (anchor?: HTMLElement | null) => void
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
  userName?: string | null
  userEmail?: string | null
  avatarUrl?: string | null
  subscriptionStatusLabel?: string | null
  onClose?: () => void
}) {
  const [projectsCollapsed, setProjectsCollapsed] = useState(() => readOrbSidebarSectionCollapsed('projects'))
  const [recentsCollapsed, setRecentsCollapsed] = useState(() => readOrbSidebarSectionCollapsed('recents'))
  const [accountCollapsed, setAccountCollapsed] = useState(() => readOrbSidebarSectionCollapsed('account'))
  const [projectEditorOpen, setProjectEditorOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [memoryModalProject, setMemoryModalProject] = useState<StandaloneProject | null>(null)
  const isMobile = useOrbMobileViewport()
  const accountDisplayName = userName?.trim() || adultProfile?.name?.trim() || 'Your account'
  const accountEmail = userEmail?.trim() || null
  const accountStatus = subscriptionStatusLabel?.trim() || null

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
  const hasVisibleProjects = projects.some((project) => project.id !== STANDALONE_GENERAL_PROJECT_ID)

  const filteredChats = useMemo(
    () =>
      searchChats(chats, chatSearch, {
        projectId: chatSearch.trim() ? undefined : workspace.activeProjectId,
        includeArchived: false
      }),
    [chats, chatSearch, workspace.activeProjectId]
  )
  const meaningfulRecentChats = useMemo(
    () => (chatSearch.trim() ? filteredChats : filteredChats.filter(isMeaningfulOrbRecentChat)),
    [chatSearch, filteredChats]
  )
  const timeGroupedChats = useMemo(() => groupChatsByRecency(meaningfulRecentChats), [meaningfulRecentChats])

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

  function handleVisibleNavClick(navId: string) {
    switch (navId) {
      case 'home':
      case 'chat':
        onOpenHome?.() ?? onOpenChat?.()
        break
      case 'saved':
        onOpenSavedOutputs?.()
        break
      case 'help':
        onOpenHelp?.()
        break
      case 'settings':
        onOpenSettings?.()
        break
      default:
        openStation(navId as OrbResidentialStationId)
        break
    }
  }

  if (collapsed) {
    return (
      <div
        className="orb-sidebar-rail flex h-full min-h-0 flex-col items-center gap-0.5 overflow-hidden py-2"
        data-orb-sidebar-collapsed="true"
        data-orb-sidebar-state="collapsed"
        data-orb-sidebar-icon-rail
      >
        {onToggleCollapse ? (
          <button
            type="button"
            className="mb-1 rounded-lg p-2 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            data-orb-sidebar-expand
            data-orb-sidebar-collapse-toggle
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
        <GlassOrbMark size="sm" className="mb-1 shrink-0" pulse aria-hidden />
        <SidebarIconButton
          label="New chat"
          onClick={() => onNewChat(workspace.activeProjectId)}
          dataOrb="orb-sidebar-new-chat"
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
        </SidebarIconButton>
        <nav className="flex w-full flex-col gap-0.5 px-1" aria-label="ORB navigation">
          {RESIDENTIAL_VISIBLE_NAV.map((entry) => (
              <SidebarIconButton
                key={entry.id}
                label={entry.label}
                onClick={() => handleVisibleNavClick(entry.id)}
                dataOrb={
                  entry.id === 'chat' || entry.id === 'home'
                    ? 'orb-sidebar-chat'
                    : `orb-sidebar-station-${entry.id}`
                }
              >
                <OrbIcon name={entry.iconName} size="md" />
              </SidebarIconButton>
            ))}
        </nav>
        <div className="mt-auto flex w-full flex-col gap-0.5 px-1">
          <SidebarIconButton
            label="Account"
            onClick={(e) => onOpenProfile?.(e.currentTarget)}
            dataOrb="orb-sidebar-profile"
          >
            <OrbUserAvatar
              name={accountDisplayName}
              avatarUrl={avatarUrl}
              size="sm"
              className="!h-8 !w-8 !rounded-full"
              testId="orb-sidebar-account-avatar"
            />
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
    <div className="flex h-full min-h-0 flex-col orb-sidebar" data-orb-sidebar-panel data-orb-sidebar-state="expanded">
      <div className="orb-sidebar-header shrink-0 px-3 py-3" data-orb-sidebar-header>
        <div className="flex items-start justify-between gap-2" data-orb-sidebar-brand>
          <OrbBrandMark
            size="sm"
            pulse
            className="min-w-0 flex-1"
            tagline={collapsed ? ORB_RESIDENTIAL_TAGLINE : ORB_RESIDENTIAL_TAGLINE_FULL}
          />
          <div className="flex shrink-0 items-center gap-0.5">
            {onToggleCollapse ? (
              <button
                type="button"
                className="hidden rounded-lg p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] lg:inline-flex"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                data-orb-sidebar-collapse
                data-orb-sidebar-collapse-toggle
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
          <OrbIcon name="new_chat" size="md" className="text-white" />
          <span className="orb-sidebar-new-chat-label">New chat</span>
        </button>
        <label
          className="orb-sidebar-search mt-2 flex items-center gap-2 rounded-lg border border-[var(--orb-line)]/40 bg-white px-3 py-2"
          data-orb-sidebar-search-wrap
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--orb-muted)]" aria-hidden />
          <input
            type="search"
            value={chatSearch}
            onChange={(e) => onChatSearchChange(e.target.value)}
            placeholder={getOrbSearchSurface('chats')?.placeholder ?? 'Search chats…'}
            aria-label={getOrbSearchSurface('chats')?.placeholder ?? 'Search chats'}
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
            {RESIDENTIAL_VISIBLE_NAV.map((item) => {
              const badge =
                item.id === 'saved' && savedOutputsCount ? String(savedOutputsCount) : undefined
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onClose?.()
                    handleVisibleNavClick(item.id)
                  }}
                  className="orb-sidebar-nav-item w-full"
                  data-orb-sidebar-station={item.id}
                  {...(item.id === 'orb_dictate' ? { 'data-orb-sidebar-dictate': true } : {})}
                >
                  <OrbIcon name={item.iconName} size="md" />
                  <span className="text-sm">{item.label}</span>
                  {badge ? (
                    <span className="rounded-full bg-[var(--orb-surface-hover)] px-2 py-0.5 text-[10px]">
                      {badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
            {meaningfulRecentChats.length ? (
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
            ) : null}
          </nav>
        ) : null}

        {hasVisibleProjects || projectEditorOpen ? (
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
        ) : null}

        {meaningfulRecentChats.length ? (
          <SidebarCollapsibleSection
            sectionKey="recents"
            title="Recent chats"
            collapsed={recentsCollapsed}
            onToggle={() => toggleSection('recents', recentsCollapsed, setRecentsCollapsed)}
          >
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
          </SidebarCollapsibleSection>
        ) : null}

        {!isMobile ? (
          <nav className="mb-2 space-y-0.5" aria-label="ORB desktop navigation" data-orb-sidebar-desktop-nav>
            <ul className="space-y-0.5" data-orb-sidebar-main>
              {RESIDENTIAL_VISIBLE_NAV.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => handleVisibleNavClick(entry.id)}
                      className="orb-sidebar-nav-item w-full"
                      {...(entry.id === 'orb_dictate' ? { 'data-orb-sidebar-dictate': true } : {})}
                      {...(entry.id === 'chat' || entry.id === 'home'
                        ? { 'data-orb-sidebar-chat': true }
                        : { 'data-orb-sidebar-station': entry.id })}
                    >
                      <OrbIcon name={entry.iconName} size="md" />
                      <span className="min-w-0 flex-1 truncate text-left text-sm">{entry.label}</span>
                      {entry.id === 'saved' && savedOutputsCount ? (
                        <span className="rounded-full bg-[var(--orb-surface-hover)] px-2 py-0.5 text-[10px]">
                          {savedOutputsCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
            </ul>
          </nav>
        ) : null}
      </div>

      <div
        className="orb-sidebar-footer mt-auto shrink-0 border-t border-[var(--orb-line)]/40 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        data-orb-sidebar-account-footer
        data-orb-sidebar-sign-out-reachable
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
                onClick={(e) => onOpenProfile?.(e.currentTarget)}
                className="orb-sidebar-nav-item w-full items-start gap-2.5 py-2"
                data-orb-sidebar-profile
                aria-label="Open account menu"
              >
                <OrbUserAvatar
                  name={accountDisplayName}
                  avatarUrl={avatarUrl}
                  size="sm"
                  className="!rounded-full"
                  testId="orb-sidebar-account-avatar"
                />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium text-[var(--orb-foreground)]">
                    {accountDisplayName}
                  </span>
                  {accountEmail ? (
                    <span className="block truncate text-[11px] text-[var(--orb-muted)]">{accountEmail}</span>
                  ) : null}
                  {accountStatus ? (
                    <span
                      className="orb-sidebar-account-status-pill mt-1 inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold capitalize text-emerald-100"
                      data-orb-sidebar-account-status
                    >
                      {accountStatus}
                    </span>
                  ) : null}
                </span>
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
            </div>
          </SidebarCollapsibleSection>
        ) : (
          <nav
            className="orb-sidebar-account-row space-y-0.5 border-t border-[var(--orb-line)]/30 pt-2"
            aria-label="Account and settings"
            data-orb-sidebar-bottom
            data-orb-sidebar-account-card
          >
            <button
              type="button"
              onClick={(e) => onOpenProfile?.(e.currentTarget)}
              className="orb-sidebar-nav-item w-full items-start gap-2.5 py-2"
              data-orb-sidebar-profile
              aria-label="Open account menu"
              data-orb-sidebar-account-trigger
            >
              <OrbUserAvatar
                name={accountDisplayName}
                avatarUrl={avatarUrl}
                size="sm"
                className="!rounded-full"
                testId="orb-sidebar-account-avatar"
              />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-[var(--orb-foreground)]">
                  {accountDisplayName}
                </span>
                {accountEmail ? (
                  <span className="block truncate text-[11px] text-[var(--orb-muted)]">{accountEmail}</span>
                ) : null}
                {accountStatus ? (
                  <span
                    className="orb-sidebar-account-status-pill mt-1 inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold capitalize text-emerald-100"
                    data-orb-sidebar-account-status
                  >
                    {accountStatus}
                  </span>
                ) : null}
              </span>
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
