import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  isAdminCommandCentreRoute,
  userHasAdminCommandCentreAccessFromProfile
} from '../founder/access.ts'
import { getAdminAction } from '../admin-command-centre/admin-actions.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Admin Command Centre', () => {
  it('route is classified as founder dashboard surface', () => {
    assert.equal(isAdminCommandCentreRoute('/admin'), true)
    assert.equal(isAdminCommandCentreRoute('/admin/orb-quality'), true)
    assert.equal(isAdminCommandCentreRoute('/orb'), false)
  })

  it('admin layout wraps with AdminGuard', () => {
    assert.match(read('app/admin/layout.tsx'), /AdminGuard/)
    assert.match(read('app/admin/page.tsx'), /AdminCommandCentrePage/)
  })

  it('shell and all phase 1 panels exist', () => {
    const panels = [
      'admin-command-centre-shell.tsx',
      'admin-overview-panel.tsx',
      'users-panel.tsx',
      'providers-panel.tsx',
      'homes-panel.tsx',
      'live-usage-panel.tsx',
      'safety-flags-panel.tsx',
      'abuse-bots-panel.tsx',
      'onboarding-panel.tsx',
      'offboarding-panel.tsx',
      'marketing-panel.tsx',
      'support-panel.tsx',
      'audit-log-panel.tsx',
      'settings-panel.tsx'
    ]
    for (const panel of panels) {
      assert.match(read(`components/admin-command-centre/${panel}`), /export function/)
    }
  })

  it('grants admin/founder access and rejects staff', () => {
    assert.equal(userHasAdminCommandCentreAccessFromProfile({ role: 'admin' }), true)
    assert.equal(userHasAdminCommandCentreAccessFromProfile({ role: 'founder' }), true)
    assert.equal(userHasAdminCommandCentreAccessFromProfile({ role: 'support_worker' }), false)
    assert.equal(userHasAdminCommandCentreAccessFromProfile({ role: 'manager' }), false)
  })

  it('development metrics module exists', () => {
    const metrics = read('lib/admin-command-centre/admin-metrics.ts')
    assert.match(metrics, /buildAdminOverviewMetrics/)
    assert.match(metrics, /DEMO_USERS/)
  })

  it('admin actions reflect phase 2 wiring status', () => {
    assert.equal(getAdminAction('disable-user').wired, true)
    assert.equal(getAdminAction('resend-invite').wired, false)
    assert.match(getAdminAction('resend-invite').description ?? '', /not wired/i)
  })

  it('users panel uses live directory service', () => {
    const usersPanel = read('components/admin-command-centre/users-panel.tsx')
    assert.match(usersPanel, /listAdminUsers/)
    assert.match(usersPanel, /Placeholder users are hidden in live mode|listAdminUsers/)
    assert.doesNotMatch(usersPanel, /DEMO_USERS/)
  })

  it('audit log panel uses admin audit repository', () => {
    const auditPanel = read('components/admin-command-centre/audit-log-panel.tsx')
    assert.match(auditPanel, /listAdminAuditLog/)
    assert.doesNotMatch(auditPanel, /DEMO_AUDIT_LOG/)
  })

  it('admin user repository and audit modules exist', () => {
    assert.match(read('lib/admin-command-centre/users/admin-user-repository.ts'), /fetchAdminUsersFromApi/)
    assert.match(read('lib/admin-command-centre/audit/admin-audit-log.ts'), /appendAdminAuditLog/)
  })

  it('os app providers skip shell for admin routes', () => {
    const providers = read('components/indicare/scope/os-app-providers.tsx')
    assert.match(providers, /isFounderDashboardRoute/)
  })
})
