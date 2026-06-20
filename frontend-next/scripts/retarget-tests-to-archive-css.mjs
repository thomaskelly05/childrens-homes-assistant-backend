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
  'orb-stations.css', 'orb-liquid-glass.css', 'orb-premium-tokens.css', 'orb-premium-layout-pass.css',
  'orb-light-layer-fix.css', 'orb-dictate-studio-polish.css', 'orb-mobile-shell.css',
  'orb-showstopper-phase-1d.css', 'orb-showstopper-phase-1d1.css', 'orb-theme-lock-phase-1e.css',
  'orb-flagship-phase-1f.css', 'orb-full-viewport-phase-1g.css', 'orb-convergence-phase-1h.css'
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
  if (next !== text) {
    writeFileSync(file, next)
    changed += 1
  }
}
console.log(`Updated ${changed} test files to read archived CSS`)
