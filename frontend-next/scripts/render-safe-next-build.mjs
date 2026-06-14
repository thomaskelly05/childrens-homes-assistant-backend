#!/usr/bin/env node
/**
 * Render-safe Next.js production build wrapper.
 *
 * Render dashboard services may ignore render.yaml env vars (e.g. NODE_OPTIONS).
 * This script enforces heap headroom inside npm run build so constrained hosts
 * do not OOM around the default ~2 GB Node limit.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_HEAP_MB = 4096
const MAX_OLD_SPACE_SIZE_PATTERN = /--max-old-space-size(?:=\d+)?(?:\s|$)/

/**
 * Append --max-old-space-size when NODE_OPTIONS lacks it; otherwise leave unchanged.
 * Exported for unit tests — does not mutate process.env.
 */
export function ensureMaxOldSpaceSize(nodeOptions = '', sizeMb = DEFAULT_HEAP_MB) {
  const trimmed = String(nodeOptions).trim()
  if (MAX_OLD_SPACE_SIZE_PATTERN.test(trimmed)) {
    return trimmed
  }
  const flag = `--max-old-space-size=${sizeMb}`
  return trimmed ? `${trimmed} ${flag}` : flag
}

function resolveNextBinary(projectRoot) {
  const unixBin = join(projectRoot, 'node_modules', '.bin', 'next')
  if (process.platform === 'win32') {
    const winBin = `${unixBin}.cmd`
    if (existsSync(winBin)) {
      return { command: winBin, useShell: true }
    }
  }
  if (existsSync(unixBin)) {
    return { command: unixBin, useShell: false }
  }
  return { command: 'next', useShell: false }
}

function runNextBuild() {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  process.env.NODE_OPTIONS = ensureMaxOldSpaceSize(process.env.NODE_OPTIONS)
  if (!process.env.NEXT_TELEMETRY_DISABLED) {
    process.env.NEXT_TELEMETRY_DISABLED = '1'
  }

  const { command, useShell } = resolveNextBinary(projectRoot)
  const child = spawn(command, ['build'], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    shell: useShell
  })

  child.on('error', (error) => {
    console.error(error)
    process.exit(1)
  })

  child.on('close', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 1)
  })
}

const scriptPath = resolve(fileURLToPath(import.meta.url))
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (scriptPath === invokedPath) {
  runNextBuild()
}
