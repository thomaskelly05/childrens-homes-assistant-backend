/**
 * Mobile OS shell visibility — bottom nav, padding, and route exclusions.
 */

export function shouldShowMobileBottomNav(pathname: string): boolean {
  if (pathname === '/orb' || pathname.startsWith('/orb/')) return false
  if (pathname === '/assistant/orb' || pathname.startsWith('/assistant/orb/')) return false
  if (pathname === '/assistant/voice' || pathname.startsWith('/assistant/settings/')) return false
  if (pathname === '/record' || pathname.startsWith('/record/')) return false
  if (/^\/young-people\/[^/]+\/(new|upload)\/?$/.test(pathname)) return false
  if (pathname === '/login' || pathname.startsWith('/login/')) return false
  if (pathname === '/unauthorized') return false
  return true
}

export const mobileWorkspaceBottomPaddingClass =
  'pb-[calc(120px+env(safe-area-inset-bottom))]'
