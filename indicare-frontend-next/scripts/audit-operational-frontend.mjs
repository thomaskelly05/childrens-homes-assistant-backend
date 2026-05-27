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
const workflows = file('lib/child-journey/workflows.ts')
const recordingRoute = file('app/api/recording/route.ts')
const recordingForm = file('components/child-journey/recording-form.tsx')
const childJourney = file('app/young-people/[id]/journey/page.tsx')
const orbConversation = file('components/orb-operational/orb-conversation-experience.tsx')
const orbCognitionPanels = file('components/orb-operational/orb-cognition-panels.tsx')
const governanceCommandCentre = file('app/governance/command-centre/page.tsx')
const workforceCommandCentre = file('app/staff/command-centre/page.tsx')
const chronologyPage = file('app/chronology/page.tsx')

for (const route of ['app/command-centre/page.tsx', 'app/young-people/page.tsx', 'app/daily-logs/page.tsx', 'app/chronology/page.tsx', 'app/documents/page.tsx', 'app/staff/page.tsx', 'app/governance/command-centre/page.tsx', 'app/reports/page.tsx', 'app/orb/page.tsx', 'app/settings/page.tsx']) {
  check(`route exists: ${route}`, existsSync(join(root, route)))
}

for (const label of ['Care Hub', 'Children', 'Record', 'Chronology', 'Actions', 'Documents', 'Workforce', 'Governance', 'Reports', 'ORB', 'Admin']) {
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
check('command centre surfaces Care Hub operational pulse', commandCentre.includes('care-hub-operational-pulse') && ['What changed today?', 'What may need review?', 'What support appears effective?', 'What should the next shift understand?'].every((copy) => commandCentre.includes(copy)))
check('chronology foundation exposes unified test id', chronology.includes('unified-chronology-timeline'))
check('chronology page surfaces meaning synthesis', chronologyPage.includes('chronology-meaning-synthesis') && ['Repeated themes', 'Emotional shifts', 'Support responses', 'Child voice visibility'].every((copy) => chronologyPage.includes(copy)))
check('record timeline exposes unified test id', ui.includes('unified-chronology-timeline'))
check('recording form exposes draft and submit lifecycle', recordingForm.includes('Save draft') && recordingForm.includes('Submit for review') && recordingForm.includes('Lifecycle and links'))
check('recording workflows include Sprint I child records', ['daily-note', 'incidents', 'safeguarding', 'missing', 'keywork', 'family-contact', 'education-update', 'health', 'medication-record', 'risk-assessment', 'support-plan', 'documents', 'reg44-action', 'reg45-evidence'].every((workflow) => workflows.includes(workflow)))
check('recording route forwards to live backend workflow paths', ['daily-notes', 'incidents', 'keywork', 'family/records', 'education-records', 'health-records', 'medication-records', '/risk', '/plans', '/os/evidence/attach'].every((path) => recordingRoute.includes(path)))
check('recording workflows carry SCCIF lifecycle linkage metadata', workflows.includes('sccifAreas') && workflows.includes('qualityStandards') && workflows.includes('audit trail') && workflows.includes('ORB context'))
check('child journey has live empty states', childJourney.includes('EmptyState') && childJourney.includes('Live evidence is not yet available for this area'))
check('child journey has child-centred ORB prompts', ['What changed for the child?', 'What helped them feel safe?', 'What did adults do?', 'lived experience'].every((copy) => childJourney.includes(copy)))
check('child journey surfaces lived experience and relationship intelligence', childJourney.includes('child-lived-experience-view') && ['What is helping?', 'What remains difficult?', 'Where is child voice strongest?', 'Relationship intelligence'].every((copy) => childJourney.includes(copy)))
check('ORB renders converged cognition payloads', orbConversation.includes('OrbCognitionPanels') && ['operational_atmosphere', 'operational_cognition'].every((copy) => orbCognitionPanels.includes(copy)))
check('ORB cognition panel surfaces relationship child impact reflection', ['Operational atmosphere', 'Relationship and child impact', 'Reflective maturity', 'rm_reflection'].every((copy) => orbCognitionPanels.includes(copy)))
check('governance surfaces meaningful oversight', governanceCommandCentre.includes('governance-meaningful-oversight') && ['What themes are emerging?', 'Where may evidence need strengthening?', 'Where is child voice visible?'].every((copy) => governanceCommandCentre.includes(copy)))
check('workforce surfaces practice quality and wellbeing', workforceCommandCentre.includes('workforce-practice-wellbeing') && ['Reflective culture', 'Safeguarding confidence', 'Positive practice visibility'].every((copy) => workforceCommandCentre.includes(copy)))
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
