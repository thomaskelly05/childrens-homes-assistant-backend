import type { PricingModel } from './revenue-types'

export const DEFAULT_PRICING_MODELS: PricingModel[] = [
  {
    id: 'pricing-orb-individual',
    name: 'ORB Individual User',
    pricePerUser: 9.99,
    includedUsage: '500 ORB conversations per month',
    overageModel: '£0.02 per additional conversation',
    targetCustomer: 'Individual practitioners in children\'s homes',
    marginNotes: 'Target 70%+ gross margin at scale with model routing',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'pricing-provider-licence',
    name: 'Provider Licence',
    pricePerUser: 7.5,
    pricePerProvider: 299,
    includedUsage: 'Unlimited homes under provider; fair-use ORB per seat',
    overageModel: 'Per-seat overage above licensed headcount',
    targetCustomer: 'Registered children\'s homes providers',
    marginNotes: 'Provider bundle improves ARPU; monitor AI cost per home',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'pricing-pilot',
    name: 'Pilot Pricing',
    pricePerUser: 0,
    pricePerProvider: 0,
    includedUsage: '90-day pilot with capped ORB usage',
    overageModel: 'Pilot ends; convert to standard licence',
    targetCustomer: 'Early adopter children\'s homes and Ofsted-focused pilots',
    marginNotes: 'Pilot AI cost absorbed; conversion target required',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'pricing-enterprise-bundle',
    name: 'Enterprise / Provider Bundle',
    pricePerUser: 6.99,
    pricePerProvider: 499,
    includedUsage: 'Multi-home provider; priority support; inspection readiness pack',
    overageModel: 'Annual contract with usage review',
    targetCustomer: 'Multi-site providers and strategic partners',
    marginNotes: 'Enterprise discount justified by volume and lower support ratio',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
]
