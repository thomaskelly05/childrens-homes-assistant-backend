#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const replacements = [
  ['ORB_FLAGSHIP_BILLING_INCLUDED_ITEMS', 'ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS'],
  ['data-orb-dictate-flagship-title', 'data-orb-dictate-title'],
  ['data-orb-dictate-flagship-subtitle', 'data-orb-dictate-subtitle-header'],
  ['orb-flagship-page-header', 'orb-workspace-header'],
  ['orb-flagship-page-title', 'orb-workspace-header-title'],
  ['orb-flagship-page-lead', 'orb-workspace-header-lead'],
  ['orb-guided-demo-panel__sheet--flagship', 'orb-modal'],
  ['orb-flagship-guided-demo-grid', 'orb-guided-demo-grid'],
  ['ORB Residential — Individual', 'ORB_RESIDENTIAL_BILLING_SUBTITLE'],
  ['ORB_VOICE_V2_STATUS_COPY', 'ORB_VOICE_V2_TITLE'],
  ['orb-composer-v2', 'orb-composer'],
  ['orb-residential-sidebar-v2', 'orb-sidebar'],
  ['orb-full-viewport-shell', 'orb-app-shell'],
  ['orb-flagship-shell', 'orb-app-shell'],
  ['orb-chat-shell', 'orb-app-shell__grid'],
  ['orb-chat-sidebar', 'orb-sidebar'],
  ['orb-chat-main', 'orb-main'],
  ['orb-login-flagship-shell', 'orb-login-shell'],
  ['orb-login-full-viewport-shell', 'orb-login-shell'],
  ['orb-product-modal-v2', 'orb-modal'],
  ['data-orb-starter-primary-chips', 'data-orb-workspace-starters'],
  ['data-orb-home-v2-starters', 'data-orb-workspace-starters'],
  ['orb-liquid-panel', 'orb-modal'],
  ['--orb-liquid-orb-glow', '--orb-res-composer-shadow'],
  ['--orb-liquid-orb-aura', '--orb-res-composer-shadow'],
  ["import './orb-components.css'", "import './orb-residential-shell.css'"],
  ["import './orb-stations.css'", "import './orb-residential-shell.css'"],
  ['ORB_LAYOUT_CSS_FILES.length, 5', 'ORB_LAYOUT_CSS_FILES.length, 1'],
  ['ORB_IMPLEMENTATION_CSS_FILES.length, 9', 'ORB_IMPLEMENTATION_CSS_FILES.length, 0'],
  ['premium-viewport-final', 'orb-residential-shell-only'],
  ["'app/orb/orb-login.css'", "'app/orb/orb-residential-shell.css'"]
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
  const text = readFileSync(file, 'utf8')
  let next = text
  for (const [from, to] of replacements) next = next.split(from).join(to)
  if (next !== text) {
    writeFileSync(file, next)
    changed += 1
  }
}
console.log(`Updated ${changed} test assertion files`)
