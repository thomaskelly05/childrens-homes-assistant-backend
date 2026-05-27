import Link from 'next/link'

import { NotificationSettingsPanel } from '@/components/connect/notification-settings-panel'
import { PageHeader } from '@/components/indicare/ui'

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6" data-testid="notification-settings-page">
      <PageHeader
        eyebrow="Notifications"
        title="Notification settings"
        description="Choose how operational notifications appear in IndiCare. Urgent safeguarding notifications remain visible for safety."
      />
      <Link
        href="/notifications"
        className="inline-block text-xs font-black uppercase tracking-[0.12em] text-blue-700 hover:underline"
      >
        ← Back to notification centre
      </Link>
      <NotificationSettingsPanel />
    </div>
  )
}
