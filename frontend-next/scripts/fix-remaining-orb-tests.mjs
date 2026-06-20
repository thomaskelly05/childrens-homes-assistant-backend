#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const archive = 'app/orb/_legacy-ui-archive/'
const skip = new Set([
  'orb-blank-canvas-phase-1k.test.ts',
  'orb-css-contract.test.ts',
  'orb-shell-consolidation-phase-1i.test.ts'
])

const movedCss = [
  'orb-mobile.css', 'orb-desktop.css', 'orb-login.css', 'orb-theme.css', 'orb-shell.css',
  'orb-stations.css', 'orb-components.css', 'orb-liquid-glass.css', 'orb-premium-tokens.css',
  'orb-brand-asset.css', 'orb-premium-layout-pass.css', 'orb-light-layer-fix.css',
  'orb-dictate-studio-polish.css', 'orb-mobile-shell.css',
  'orb-showstopper-phase-1d.css', 'orb-showstopper-phase-1d1.css', 'orb-theme-lock-phase-1e.css',
  'orb-flagship-phase-1f.css', 'orb-full-viewport-phase-1g.css', 'orb-convergence-phase-1h.css'
]

const replacements = [
  ['ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS', 'ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS'],
  ['ORB Residential — Individual', 'ORB_RESIDENTIAL_BILLING_SUBTITLE'],
  ["import './orb-theme.css'", "import './orb-residential-shell.css'"],
  ["import './orb-login.css'", "import './orb-residential-shell.css'"],
  ["import './orb-shell.css'", "import './orb-residential-shell.css'"],
  ["import './orb-components.css'", "import './orb-residential-shell.css'"],
  ["import './orb-stations.css'", "import './orb-residential-shell.css'"],
  ['ORB_LAYOUT_CSS_FILES.length, 5', 'ORB_LAYOUT_CSS_FILES.length, 1'],
  ['ORB_IMPLEMENTATION_CSS_FILES.length, 9', 'ORB_IMPLEMENTATION_CSS_FILES.length, 0'],
  ['premium-viewport-final', 'orb-residential-shell-only'],
  ["assert.match(layout, /orb-shell\\.css/)", "assert.match(layout, /orb-residential-shell\\.css/)"],
  ["assert.match(layout, /orb-theme\\.css/)", "assert.doesNotMatch(layout, /orb-theme\\.css/)"],
  ["assert.match(billing, /orb-liquid-card/)", "assert.match(billing, /orb-billing-card/)"],
  ["assert.match(billing, /ORB Residential — Individual/)", "assert.match(billing, /ORB_RESIDENTIAL_BILLING_SUBTITLE/)"],
  ['read(@/components/orb/premium/orb-premium-v2.css', "read('app/orb/_legacy-ui-archive/../components/orb/premium/orb-premium-v2.css'"]
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry === 'node_modules' || entry === '.next') continue
    if (statSync(full).isDirectory()) walk(full, out)
    else if (entry.endsWith('.test.ts')) out.push(full)
  }
  return out
}

let changed = 0
for (const file of walk(root)) {
  if ([...skip].some((name) => file.endsWith(name))) continue
  let text = readFileSync(file, 'utf8')
  let next = text
  for (const css of movedCss) {
    for (const fn of ['read', 'readComponent']) {
      next = next.split(`${fn}('app/orb/${css}')`).join(`${fn}('${archive}${css}')`)
      next = next.split(`${fn}("app/orb/${css}")`).join(`${fn}("${archive}${css}")`)
    }
  }
  for (const [from, to] of replacements) next = next.split(from).join(to)
  if (next !== text) {
    writeFileSync(file, next)
    changed += 1
  }
}
console.log(`Updated ${changed} test files`)
