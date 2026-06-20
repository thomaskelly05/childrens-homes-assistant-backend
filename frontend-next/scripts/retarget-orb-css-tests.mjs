#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shell = 'app/orb/orb-residential-shell.css'

const replacements = [
  ["read('app/orb/orb-mobile.css')", `read('${shell}')`],
  ['read("app/orb/orb-mobile.css")', `read("${shell}")`],
  ["read('app/orb/orb-desktop.css')", `read('${shell}')`],
  ['read("app/orb/orb-desktop.css")', `read("${shell}")`],
  ["read('app/orb/orb-login.css')", `read('${shell}')`],
  ['read("app/orb/orb-login.css")', `read("${shell}")`],
  ["read('app/orb/orb-theme.css')", `read('${shell}')`],
  ["read('app/orb/orb-shell.css')", `read('${shell}')`],
  ["read('app/orb/orb-stations.css')", `read('${shell}')`],
  ["read('app/orb/orb-liquid-glass.css')", `read('${shell}')`],
  ["read('app/orb/orb-premium-tokens.css')", `read('${shell}')`],
  ["read('app/orb/orb-premium-layout-pass.css')", `read('${shell}')`],
  ["read('app/orb/orb-light-layer-fix.css')", `read('${shell}')`],
  ["read('app/orb/orb-dictate-studio-polish.css')", `read('${shell}')`],
  ["read('app/orb/orb-mobile-shell.css')", `read('${shell}')`],
  ["readComponent('app/orb/orb-mobile.css')", `readComponent('${shell}')`],
  ["readComponent('app/orb/orb-desktop.css')", `readComponent('${shell}')`],
  ["import './orb-theme.css'", "import './orb-residential-shell.css'"],
  ["import './orb-login.css'", "import './orb-residential-shell.css'"],
  ["import './orb-shell.css'", "import './orb-residential-shell.css'"],
  ['orb-flagship-copy.ts', 'orb-residential-ui-copy.ts'],
  ['@/lib/orb/orb-flagship-copy', '@/lib/orb/orb-residential-ui-copy'],
  ['../../lib/orb/orb-flagship-copy.ts', '../../lib/orb/orb-residential-ui-copy.ts']
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
console.log(`Updated ${changed} test files`)
