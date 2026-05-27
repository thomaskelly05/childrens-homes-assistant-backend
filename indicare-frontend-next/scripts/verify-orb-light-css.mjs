#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const cssDir = join(process.cwd(), '.next/static/css')
const required = [
  'orb-chatgpt-light-build-marker-1338',
  'orb-hue-pulse',
  'orb-hue-text',
  'orb-theme-light',
  'html[data-orb-theme=light]',
  'orb-electric-text'
]

let files
try {
  files = readdirSync(cssDir).filter((f) => f.endsWith('.css'))
} catch {
  console.error('Run `npm run build` first — .next/static/css not found')
  process.exit(1)
}

const combined = files.map((f) => readFileSync(join(cssDir, f), 'utf8')).join('\n')
const missing = required.filter((token) => !combined.includes(token))

if (missing.length) {
  console.error('ORB light CSS verification failed. Missing in production bundle:', missing.join(', '))
  process.exit(1)
}

console.log(`ORB light CSS OK (${files.length} file(s), build marker 1338 present)`)
