#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const testFile = join(root, 'lib/orb/evaluation/orb-firewall-scorer-calibration.test.ts')

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--test', testFile],
  { cwd: root, stdio: 'inherit' }
)

process.exit(result.status ?? 1)
