/**
 * Default founder strategic memory — safe seed items for first load.
 */

import type { FounderMemoryItem } from './founder-memory-types'

const NOW = '2026-01-01T00:00:00.000Z'

function seedItem(
  id: string,
  type: FounderMemoryItem['type'],
  title: string,
  content: string,
  importance: FounderMemoryItem['importance'],
  tags: string[]
): FounderMemoryItem {
  return {
    id,
    type,
    title,
    content,
    status: 'active',
    importance,
    tags,
    source: 'system-seed',
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: 'system'
  }
}

export const DEFAULT_FOUNDER_MEMORY_ITEMS: FounderMemoryItem[] = [
  seedItem(
    'memory-seed-primary-objective',
    'priority',
    'Launch ORB Residential powered by IndiCare Intelligence',
    'Primary strategic objective: launch ORB Residential as the first commercial product, powered by IndiCare Intelligence.',
    'critical',
    ['orb-residential', 'strategy', 'primary-objective']
  ),
  seedItem(
    'memory-seed-product-focus',
    'product-direction',
    'ORB Residential first, IndiCare OS later',
    'Product focus is ORB Residential first. Full IndiCare OS platform expansion follows once ORB Residential proves demand.',
    'critical',
    ['orb-residential', 'indicare-os', 'product-focus']
  ),
  seedItem(
    'memory-seed-principle-live-metrics',
    'principle',
    'Live-only founder metrics',
    'Show live founder metrics only. Do not display fake traction, invented customer counts or unverified growth claims.',
    'critical',
    ['live-data', 'metrics', 'principle']
  ),
  seedItem(
    'memory-seed-principle-approval',
    'principle',
    'Founder approval before external claims',
    'Founder approval is required before public claims, LinkedIn posts, emails, external content or ORB knowledge changes.',
    'critical',
    ['approval', 'external-content', 'principle']
  ),
  seedItem(
    'memory-seed-principle-safeguarding',
    'principle',
    'Children, safeguarding and privacy before speed',
    'Children, safeguarding, privacy and therapeutic quality come before speed. Never compromise care quality for delivery pace.',
    'critical',
    ['safeguarding', 'privacy', 'principle']
  ),
  seedItem(
    'memory-seed-commercial-focus',
    'priority',
    'Pilot readiness and sector validation',
    'Commercial focus: pilot readiness, provider interest, sector validation, and partnership routes such as Microsoft, OpenAI and Innovate UK.',
    'high',
    ['commercial', 'pilot', 'partnerships']
  ),
  seedItem(
    'memory-seed-deferred-indicare-os',
    'deferred-item',
    'Full IndiCare OS until ORB Residential proves demand',
    'Defer full IndiCare OS platform build until ORB Residential demonstrates clear market demand and pilot traction.',
    'high',
    ['indicare-os', 'deferred', 'orb-residential']
  ),
  seedItem(
    'memory-seed-milestone-command-centre',
    'milestone',
    'Founder Command Centre infrastructure exists',
    'Founder Command Centre, Staff Team, Quality Lab, Telemetry, Persistence and Operating Loop are now in place.',
    'medium',
    ['milestone', 'founder-os', 'infrastructure']
  )
]
