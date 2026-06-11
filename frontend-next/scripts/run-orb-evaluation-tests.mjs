#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const testFiles = [
  join(root, 'lib/orb/evaluation/orb-firewall-scorer-calibration.test.ts'),
  join(root, 'lib/orb/evaluation/orb-scoring-version.test.ts')
]

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--test', ...testFiles],
  { cwd: root, stdio: 'inherit' }
)

process.exit(result.status ?? 1)
