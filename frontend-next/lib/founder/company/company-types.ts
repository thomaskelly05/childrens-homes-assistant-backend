/**
 * Founder Company Operating Model V1 — type contracts.
 */

import type { MetricSourceStatus } from './live-data-guard'

export type CompanyDepartmentStatus = 'healthy' | 'watch' | 'at-risk' | 'unavailable'

export type CompanyKpi = {
  id: string
  name: string
  value: string | number | null
  unit: string
  sourceStatus: MetricSourceStatus
  dataSource: string
  lastUpdated: string | null
  target?: number
  trend?: number | null
  limitation?: string
}

export type CompanyDepartment = {
  id: string
  name: string
  executiveOwner: string
  aiAgentOwner: string
  agentId: string
  purpose: string
  responsibilities: string[]
  liveKpis: CompanyKpi[]
  currentPriorities: string[]
  openRisks: string[]
  openActions: string[]
  status: CompanyDepartmentStatus
  score?: number
  confidence?: number
  opportunities?: string[]
  evidence?: string[]
  operatingLoopOutputs?: string[]
  recommendedDecisions?: string[]
}

export type CompanyOperatingCadence = {
  id: string
  cadenceType: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  title: string
  owner: string
  agenda: string[]
  requiredInputs: string[]
  outputs: string[]
  approvalRequired: boolean
  generatedActions?: string[]
}

export type DepartmentScore = {
  departmentId: string
  score: number
  confidence: number
  reason: string
  risks: string[]
  recommendations: string[]
}

export type CompanyScorecard = {
  id: string
  generatedAt: string
  overallCompanyScore: number
  overallConfidence: number
  departmentScores: DepartmentScore[]
  liveKpis: CompanyKpi[]
  risks: string[]
  opportunities: string[]
  blockers: string[]
  limitations: string[]
}

export type CompanyBoardReportSection = {
  id: string
  title: string
  body: string
  sourceStatus: MetricSourceStatus | 'mixed'
  limitations: string[]
}

export type CompanyBoardReport = {
  id: string
  periodStart: string
  periodEnd: string
  title: string
  status: 'draft' | 'needs-review' | 'approved' | 'archived'
  sections: CompanyBoardReportSection[]
  liveMetrics: CompanyKpi[]
  forecasts: CompanyKpi[]
  limitations: string[]
  approvalId?: string
  createdAt: string
}

export type CompanyCeoAgendaItem = {
  id: string
  category: 'decision' | 'approval' | 'follow-up' | 'risk' | 'action'
  title: string
  detail: string
  departmentId?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export type CompanyOperatingModel = {
  scorecard: CompanyScorecard
  departments: CompanyDepartment[]
  companyKpis: CompanyKpi[]
  ceoAgenda: CompanyCeoAgendaItem[]
  cadences: CompanyOperatingCadence[]
  limitations: string[]
  generatedAt: string
}
