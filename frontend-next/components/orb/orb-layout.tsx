'use client'

import type { DragEvent, ReactNode } from 'react'

export type OrbLayoutProps = {
  /** Residential `/orb` surface — enables collapsed sidebar widths. */
  residentialSurface?: boolean
  sidebarOpen: boolean
  sidebarCollapsed?: boolean
  onCloseSidebarOverlay: () => void
  /** Desktop sidebar + mobile drawer content. */
  sidebar: ReactNode
  /** Mobile top bar / desktop header row. */
  header: ReactNode
  /** Optional banners and context rows above the chat thread. */
  preThread?: ReactNode
  /** Scrollable chat thread (include scroll container ref in this tree). */
  thread: ReactNode
  /** Optional scroll-to-bottom control inside the main column. */
  scrollFab?: ReactNode
  /** Bottom composer dock. */
  composer: ReactNode
  /** Optional right contextual panel (station drawers use overlay modals elsewhere). */
  rightPanel?: ReactNode
  onDragOver?: (event: DragEvent) => void
  onDrop?: (event: DragEvent) => void
}

/**
 * Canonical ORB chat chrome: sidebar, header, central thread, composer, optional right panel.
 * Feature panels and modals stay in `OrbCareCompanion`; this component owns layout structure only.
 */
export function OrbLayout({
  residentialSurface = false,
  sidebarOpen,
  sidebarCollapsed = false,
  onCloseSidebarOverlay,
  sidebar,
  header,
  preThread,
  thread,
  scrollFab,
  composer,
  rightPanel,
  onDragOver,
  onDrop
}: OrbLayoutProps) {
  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          className="orb-panel-overlay fixed inset-0 z-40 lg:hidden"
          aria-label="Close sidebar"
          onClick={onCloseSidebarOverlay}
        />
      ) : null}

      <div
        className={`relative flex min-h-0 flex-1 ${residentialSurface ? 'orb-chat-shell' : ''}`}
        data-orb-sidebar-collapsed={residentialSurface && sidebarCollapsed ? 'true' : undefined}
      >
        <aside
          className={`orb-chat-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--orb-line)]/50 transition-[transform,width] duration-200 lg:static lg:z-auto lg:translate-x-0 ${
            residentialSurface
              ? sidebarCollapsed
                ? 'w-[var(--orb-sidebar-width-collapsed,4.25rem)] max-w-[var(--orb-sidebar-width-collapsed,4.25rem)] lg:w-[var(--orb-sidebar-width-collapsed,4.25rem)]'
                : 'w-[min(100%,var(--orb-sidebar-width,18.125rem))] max-w-[var(--orb-sidebar-width,18.125rem)] lg:w-[var(--orb-sidebar-width,18.125rem)]'
              : 'w-[min(100%,18.75rem)] lg:w-[18.75rem]'
          } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
          data-orb-sidebar-scroll-container
        >
          {sidebar}
        </aside>

        <div className="orb-chat-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {header}
          {preThread}
          <section
            className="flex min-h-0 flex-1 flex-col"
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            {thread}
            {scrollFab}
            {composer}
          </section>
        </div>

        {rightPanel ? (
          <div className="orb-chat-context-panel hidden shrink-0 xl:flex" data-orb-context-panel>
            {rightPanel}
          </div>
        ) : null}
      </div>
    </>
  )
}
