import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const checks = []

function file(path) {
  const fullPath = join(root, path)
  if (!existsSync(fullPath)) throw new Error(`Missing file: ${path}`)
  return readFileSync(fullPath, 'utf8')
}

function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) })
}

const appShell = file('components/indicare/app-shell.tsx')
const mobileNav = file('components/mobile-nav.tsx')
const layout = file('app/layout.tsx')
const commandCentre = file('app/command-centre/page.tsx')
const nav = file('lib/navigation/operational-navigation.ts')
const operationalContext = file('lib/operational/operational-context.tsx')
const accessibility = file('lib/orb/accessibility/preferences.ts')
const applyAccessibility = file('lib/orb/accessibility/apply-accessibility.ts')
const chronology = file('components/indicare/chronology-foundation.tsx')
const ui = file('components/indicare/ui.tsx')

for (const route of ['app/command-centre/page.tsx', 'app/young-people/page.tsx', 'app/daily-logs/page.tsx', 'app/chronology/page.tsx', 'app/documents/page.tsx', 'app/staff/page.tsx', 'app/governance/command-centre/page.tsx', 'app/reports/page.tsx', 'app/orb/page.tsx', 'app/settings/page.tsx']) {
  check(`route exists: ${route}`, existsSync(join(root, route)))
}

for (const label of ['Care Hub', 'Young People', 'Daily Care', 'Chronology', 'Documents', 'Workforce', 'Governance', 'Reports', 'ORB', 'Admin']) {
  check(`domain navigation includes ${label}`, nav.includes(label))
}

for (const duplicate of ["href: '/homes'", "href: '/connect'", "href: '/chronology'", "href: '/safeguarding'", "href: '/profile'"]) {
  check(`primary nav removed duplicate ${duplicate}`, !appShell.includes(duplicate))
}

for (const role of ['rm', 'ri', 'staff', 'provider', 'admin']) {
  check(`operational role supported: ${role}`, nav.includes(`'${role}'`))
}

check('layout provides OperationalContextProvider', layout.includes('OperationalContextProvider'))
check('shell renders contextual ORB panel', appShell.includes('ContextualOrbPanel'))
check('shell renders operational alerts', appShell.includes('OperationalAlertsPanel'))
check('shell renders quick actions', appShell.includes('OperationalQuickActions'))
check('shell uses shared operational navigation', appShell.includes('visibleOperationalNavigation') && appShell.includes('hrefForOperationalItem'))
check('shell uses shared child workspace navigation', appShell.includes('childWorkspaceNavigation'))
check('mobile nav uses shared operational navigation', mobileNav.includes('visibleOperationalNavigation'))
check('ORB context receives operational memory', operationalContext.includes('operational_memory'))
check('ORB context includes chronology context', operationalContext.includes('currentChronologyContext'))
check('command centre fetches platform governance workforce data', commandCentre.includes('getCommandCentre') && commandCentre.includes('getGovernanceCommandCentre') && commandCentre.includes('getWorkforceCommandCentre'))
check('command centre surfaces ORB summary', commandCentre.includes('ORB summary'))
check('chronology foundation exposes unified test id', chronology.includes('unified-chronology-timeline'))
check('record timeline exposes unified test id', ui.includes('unified-chronology-timeline'))
check('accessibility supports sensory-safe mode', accessibility.includes('sensorySafeMode') && applyAccessibility.includes('orbSensorySafe'))
check('accessibility supports voice accessibility', accessibility.includes('voiceFirstNavigation'))
check('accessibility supports font scaling', accessibility.includes('largerText'))
check('feature flags exist', nav.includes('NEXT_PUBLIC_UNIFIED_OPERATIONAL_SHELL') && nav.includes('NEXT_PUBLIC_CONTEXTUAL_ORB_PANEL'))

const failures = checks.filter((item) => !item.ok)
if (failures.length) {
  console.error('Operational frontend audit failed:')
  failures.forEach((item) => console.error(`- ${item.name}`))
  process.exit(1)
}

console.log(`Operational frontend audit passed: ${checks.length} checks.`)
