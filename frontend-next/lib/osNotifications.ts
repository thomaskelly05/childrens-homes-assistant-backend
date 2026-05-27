/** Thin re-exports for operational notification surfaces used across OS UI. */

export {
  applyOperationalNotificationAction,
  categoryLabel,
  getOperationalNotificationFeed,
  getOperationalNotificationSummary,
  markAllOperationalNotificationsRead,
  type OsNotificationFeed,
  type OsNotificationItem,
  type OsNotificationSeverity
} from '@/lib/os-api/notifications'

export async function fetchConnectUnreadCount(): Promise<number> {
  try {
    const response = await fetch('/api/connect/unread', { credentials: 'include' })
    if (!response.ok) return 0
    const data = (await response.json()) as { count?: number }
    return Number(data.count || 0)
  } catch {
    return 0
  }
}
