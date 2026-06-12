#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const testFiles = [
  join(root, 'lib/orb/evaluation/orb-evaluation-infrastructure-errors.test.ts'),
  join(root, 'lib/orb/evaluation/orb-scoring-version.test.ts'),
  join(root, 'lib/orb/evaluation/orb-high-risk-safeguard-scaffold.test.ts'),
  join(root, 'lib/orb/quality-agent/orb-failure-classifier.test.ts'),
  join(root, 'lib/orb/quality-agent/orb-quality-safety-rules.test.ts'),
  join(root, 'lib/orb/quality-agent/orb-quality-build-brief-generator.test.ts'),
  join(root, 'lib/orb/quality-agent/orb-quality-pr-workflow.test.ts'),
  join(root, 'lib/orb/quality-agent/orb-quality-agent-service.test.ts'),
  join(root, 'components/founder/founder-orb-quality-agent-page.test.ts'),
  join(root, 'lib/founder/agents/autonomous/founder-agents.test.ts'),
  join(root, 'lib/founder/agents/autonomous/founder-agent-event-engine.test.ts'),
  join(root, 'lib/founder/learning-loop/learning-loop.test.ts'),
  join(root, 'components/founder/founder-learning-loop-page.test.ts')
]

const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--test', ...testFiles],
  { cwd: root, stdio: 'inherit' }
)

process.exit(result.status ?? 1)
