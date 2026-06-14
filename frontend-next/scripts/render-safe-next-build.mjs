#!/usr/bin/env node
/**
 * Render-safe Next.js production build wrapper.
 *
 * Render dashboard services may ignore render.yaml env vars (e.g. NODE_OPTIONS).
 * This script enforces heap headroom inside npm run build so constrained hosts
 * do not OOM around the default ~2 GB Node limit, and logs memory at key steps.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Stay below Render starter RAM; heap + webpack overhead must fit ~8 GB total. */
export const DEFAULT_HEAP_MB = 4096
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

/**
 * Production build env applied before spawning `next build`.
 * Exported for unit tests — does not mutate process.env.
 */
export function resolveRenderBuildEnv(env = process.env, sizeMb = DEFAULT_HEAP_MB) {
  const next = { ...env }
  next.NODE_OPTIONS = ensureMaxOldSpaceSize(next.NODE_OPTIONS, sizeMb)
  if (!next.NEXT_TELEMETRY_DISABLED) {
    next.NEXT_TELEMETRY_DISABLED = '1'
  }
  if (!next.NODE_ENV) {
    next.NODE_ENV = 'production'
  }
  return next
}

/** RSS snapshot for build diagnostics (Render OOM forensics). */
export function formatBuildMemorySnapshot(label = 'memory') {
  const { rss, heapUsed, heapTotal, external } = process.memoryUsage()
  const mb = (bytes) => `${Math.round(bytes / 1024 / 1024)}MB`
  return `[render-safe-next-build] ${label}: rss=${mb(rss)} heap=${mb(heapUsed)}/${mb(heapTotal)} external=${mb(external)}`
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
  const buildEnv = resolveRenderBuildEnv(process.env)
  Object.assign(process.env, buildEnv)

  console.log(formatBuildMemorySnapshot('before next build'))
  console.log(
    `[render-safe-next-build] NODE_ENV=${process.env.NODE_ENV} NODE_OPTIONS=${process.env.NODE_OPTIONS}`
  )

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
    console.log(formatBuildMemorySnapshot('after next build'))
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
