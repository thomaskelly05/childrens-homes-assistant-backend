import type {
  FounderActionLog,
  LabAuditEvent
} from '@/lib/indicare-lab/governance/types'
import { evaluationMemoryRepository } from '@/lib/indicare-lab/evaluations/evaluation-memory-repository'
import type { CreateEvaluationRunInput } from '@/lib/indicare-lab/evaluations/evaluation-repository'
import type { EvaluationRun } from '@/lib/indicare-lab/evaluations/types'
import { reviewEventMemoryRepository } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import type { CreateReviewEventInput } from '@/lib/indicare-lab/review-events/review-event-memory-repository'
import type { ReviewEvent, ReviewStatus } from '@/lib/indicare-lab/review-events/types'
import type {
  CreateAuditEventInput,
  CreateBuildBriefInput,
  CreateFounderActionLogInput,
  CreateSuggestionInput,
  LabStorageRepository
} from '@/lib/indicare-lab/storage/lab-storage-repository'
import {
  computeRedactedStoragePercentage,
  guardReviewEventForStorage,
  guardSuggestionForStorage
} from '@/lib/indicare-lab/storage/lab-storage-guard'
import type {
  AuditEventFilter,
  BuildBriefFilter,
  EvidenceTimelineEntry,
  EvidenceTimelineFilter,
  FounderActionLogFilter,
  LabStorageStats,
  ReviewEventFilter,
  StoredBuildBrief,
  StoredReviewEvent,
  StoredSuggestion,
  SuggestionFilter
} from '@/lib/indicare-lab/storage/lab-storage-types'

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isDemoReviewEvent(event: ReviewEvent): boolean {
  return event.origin === 'seeded-demo'
}

export class LabMemoryStorageRepository implements LabStorageRepository {
  private reviewClassifications = new Map<string, StoredReviewEvent['storageClassification']>()
  private suggestions: StoredSuggestion[] = []
  private buildBriefs: StoredBuildBrief[] = []
  private founderActionLogs: FounderActionLog[] = []
  private auditEvents: LabAuditEvent[] = []
  private detectedPatternIds = new Set<string>()

  createReviewEvent(input: CreateReviewEventInput): StoredReviewEvent {
    const raw = reviewEventMemoryRepository.createReviewEvent(input)
    return this.storeShadowReviewEvent(raw)
  }

  listReviewEvents(filter?: ReviewEventFilter): StoredReviewEvent[] {
    return reviewEventMemoryRepository.listReviewEvents(filter).map((event) => ({
      ...event,
      storageClassification:
        this.reviewClassifications.get(event.id) ??
        (isDemoReviewEvent(event) ? 'synthetic' : 'redacted')
    }))
  }

  updateReviewEventStatus(id: string, status: ReviewStatus): StoredReviewEvent | undefined {
    const updated = reviewEventMemoryRepository.updateReviewEventStatus(id, status)
    if (!updated) return undefined
    return {
      ...updated,
      storageClassification:
        this.reviewClassifications.get(id) ??
        (isDemoReviewEvent(updated) ? 'synthetic' : 'redacted')
    }
  }

  storeShadowReviewEvent(event: ReviewEvent): StoredReviewEvent {
    const guarded = guardReviewEventForStorage(event)
    const stored = reviewEventMemoryRepository.storeShadowReviewEvent(guarded.data)
    this.reviewClassifications.set(stored.id, guarded.storageClassification)

    this.createAuditEvent({
      eventType: 'review-event-captured',
      actorType: 'system',
      targetType: 'review-event',
      targetId: stored.id,
      summary: `Review event captured (${stored.origin}, ${stored.status})`,
      storageClassification: guarded.storageClassification,
      metadata: {
        wasRedacted: guarded.wasRedacted,
        wasTruncated: guarded.wasTruncated,
        fullTextBlocked: guarded.fullTextBlocked
      }
    })

    return { ...stored, storageClassification: guarded.storageClassification }
  }

  createSuggestion(input: CreateSuggestionInput): StoredSuggestion {
    const guarded = guardSuggestionForStorage(input)
    const existing = this.suggestions.find((s) => s.id === guarded.data.id)
    if (existing) {
      const merged: StoredSuggestion = {
        ...existing,
        ...guarded.data,
        storageClassification: guarded.storageClassification
      }
      this.suggestions = this.suggestions.map((s) => (s.id === merged.id ? merged : s))
      return merged
    }

    const stored: StoredSuggestion = {
      ...guarded.data,
      storageClassification: guarded.storageClassification
    }
    this.suggestions.unshift(stored)

    this.createAuditEvent({
      eventType: 'suggestion-created',
      actorType: 'system',
      targetType: 'suggestion',
      targetId: stored.id,
      summary: `Suggestion created: ${stored.title}`,
      storageClassification: guarded.storageClassification,
      evidenceLinks: stored.evidenceSources.map((source) => ({
        type:
          source.type === 'shadow-review-event'
            ? 'review-event'
            : source.type === 'detected-pattern'
              ? 'pattern'
              : source.type === 'benchmark-failure'
                ? 'benchmark-run'
                : source.type === 'approval-item'
                  ? 'approval-item'
                  : 'suggestion',
        id: source.id,
        label: source.label
      }))
    })

    return stored
  }

  listSuggestions(filter?: SuggestionFilter): StoredSuggestion[] {
    let result = [...this.suggestions]
    if (filter?.status) result = result.filter((s) => s.status === filter.status)
    if (filter?.isSynthetic !== undefined) {
      result = result.filter((s) => s.isSyntheticEvidence === filter.isSynthetic)
    }
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (filter?.limit && filter.limit > 0) result = result.slice(0, filter.limit)
    return result
  }

  createEvaluationRun(input: CreateEvaluationRunInput): EvaluationRun {
    const run = evaluationMemoryRepository.createEvaluationRun(input)
    this.createAuditEvent({
      eventType: 'benchmark-run-completed',
      actorType: 'system',
      targetType: 'benchmark-run',
      targetId: run.id,
      summary: `Benchmark run completed for scenario ${run.scenarioId}`,
      storageClassification: 'synthetic',
      evidenceLinks: [{ type: 'benchmark-run', id: run.id }]
    })
    return run
  }

  listEvaluationRuns(): EvaluationRun[] {
    return evaluationMemoryRepository.listEvaluationRuns()
  }

  createBuildBrief(input: CreateBuildBriefInput): StoredBuildBrief {
    const classification: StoredBuildBrief['storageClassification'] =
      input.sourceType === 'seeded-demo' ? 'synthetic' : 'metadata-only'

    const stored: StoredBuildBrief = {
      ...input,
      storageClassification: classification
    }
    this.buildBriefs.unshift(stored)

    this.createAuditEvent({
      eventType: 'build-brief-created',
      actorType: 'founder',
      targetType: 'build-brief',
      targetId: stored.id,
      summary: `Build brief created: ${stored.title}`,
      storageClassification: classification,
      evidenceLinks: input.sourceId
        ? [{ type: 'build-brief', id: stored.id, label: input.sourceType }]
        : [{ type: 'build-brief', id: stored.id }]
    })

    return stored
  }

  listBuildBriefs(filter?: BuildBriefFilter): StoredBuildBrief[] {
    let result = [...this.buildBriefs]
    if (filter?.sourceType) {
      result = result.filter((b) => b.sourceType === filter.sourceType)
    }
    if (filter?.limit && filter.limit > 0) result = result.slice(0, filter.limit)
    return result
  }

  createFounderActionLog(input: CreateFounderActionLogInput): FounderActionLog {
    const log: FounderActionLog = {
      id: nextId('fal'),
      status: input.status ?? 'recorded',
      createdAt: new Date().toISOString(),
      ...input
    }
    this.founderActionLogs.unshift(log)

    this.createAuditEvent({
      eventType: 'founder-action',
      actorType: input.actorType,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: `Founder action: ${input.actionType} on ${input.targetType}`,
      evidenceLinks: input.evidenceLinks,
      metadata: { riskLevel: input.riskLevel }
    })

    this.createAuditEvent({
      eventType: 'governance-decision',
      actorType: input.actorType,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: `Governance decision recorded: ${input.actionType}`,
      evidenceLinks: input.evidenceLinks
    })

    return log
  }

  listFounderActionLogs(filter?: FounderActionLogFilter): FounderActionLog[] {
    let result = [...this.founderActionLogs]
    if (filter?.actionType) {
      result = result.filter((l) => l.actionType === filter.actionType)
    }
    if (filter?.targetType) {
      result = result.filter((l) => l.targetType === filter.targetType)
    }
    if (filter?.limit && filter.limit > 0) result = result.slice(0, filter.limit)
    return result
  }

  createAuditEvent(input: CreateAuditEventInput): LabAuditEvent {
    const event: LabAuditEvent = {
      id: nextId('lae'),
      createdAt: new Date().toISOString(),
      ...input
    }
    this.auditEvents.unshift(event)
    return event
  }

  listAuditEvents(filter?: AuditEventFilter): LabAuditEvent[] {
    let result = [...this.auditEvents]
    if (filter?.eventType) {
      result = result.filter((e) => e.eventType === filter.eventType)
    }
    if (filter?.limit && filter.limit > 0) result = result.slice(0, filter.limit)
    return result
  }

  recordPatternDetection(patternId: string, title: string, detectedAt: string): void {
    if (this.detectedPatternIds.has(patternId)) return
    this.detectedPatternIds.add(patternId)
    this.createAuditEvent({
      eventType: 'pattern-detected',
      actorType: 'system',
      targetType: 'pattern',
      targetId: patternId,
      summary: `Pattern detected: ${title}`,
      storageClassification: 'metadata-only',
      evidenceLinks: [{ type: 'pattern', id: patternId, label: title }]
    })
  }

  getEvidenceTimeline(filter?: EvidenceTimelineFilter): EvidenceTimelineEntry[] {
    const includeDemo = filter?.includeDemo ?? false
    const includeSynthetic = filter?.includeSynthetic ?? true
    const entries: EvidenceTimelineEntry[] = []

    for (const event of this.listAuditEvents()) {
      entries.push({
        id: `timeline-audit-${event.id}`,
        entryType: 'audit-event',
        title: event.summary,
        summary: event.eventType,
        storageClassification: event.storageClassification,
        targetType: event.targetType,
        targetId: event.targetId,
        createdAt: event.createdAt,
        isSynthetic: event.storageClassification === 'synthetic',
        isDemo: false
      })
    }

    for (const event of this.listReviewEvents()) {
      if (!includeDemo && isDemoReviewEvent(event)) continue
      if (!includeSynthetic && event.storageClassification === 'synthetic') continue
      entries.push({
        id: `timeline-review-${event.id}`,
        entryType: 'review-event',
        title: `${event.source} · ${event.taskType}`,
        summary: event.reasonSummary,
        storageClassification: event.storageClassification,
        targetType: 'review-event',
        targetId: event.id,
        createdAt: event.createdAt,
        isDemo: isDemoReviewEvent(event),
        isSynthetic: event.storageClassification === 'synthetic'
      })
    }

    for (const suggestion of this.listSuggestions()) {
      if (!includeSynthetic && suggestion.isSyntheticEvidence) continue
      entries.push({
        id: `timeline-suggestion-${suggestion.id}`,
        entryType: 'suggestion',
        title: suggestion.title,
        summary: suggestion.description,
        storageClassification: suggestion.storageClassification,
        targetType: 'suggestion',
        targetId: suggestion.id,
        createdAt: suggestion.createdAt,
        isSynthetic: suggestion.isSyntheticEvidence
      })
    }

    for (const brief of this.listBuildBriefs()) {
      entries.push({
        id: `timeline-brief-${brief.id}`,
        entryType: 'build-brief',
        title: brief.title,
        summary: brief.objective,
        storageClassification: brief.storageClassification,
        targetType: 'build-brief',
        targetId: brief.id,
        createdAt: brief.createdAt,
        isSynthetic: brief.storageClassification === 'synthetic'
      })
    }

    for (const log of this.listFounderActionLogs()) {
      entries.push({
        id: `timeline-founder-${log.id}`,
        entryType: 'founder-decision',
        title: `Founder: ${log.actionType}`,
        summary: log.reasonNote ?? log.reason ?? `${log.targetType} · ${log.targetId}`,
        storageClassification: 'metadata-only',
        targetType: log.targetType,
        targetId: log.targetId,
        createdAt: log.createdAt
      })
    }

    for (const run of this.listEvaluationRuns()) {
      if (!includeSynthetic) continue
      entries.push({
        id: `timeline-benchmark-${run.id}`,
        entryType: 'benchmark-run',
        title: `Benchmark: ${run.scenarioId}`,
        summary: run.result?.scorecard.classification ?? run.status,
        storageClassification: 'synthetic',
        targetType: 'benchmark-run',
        targetId: run.id,
        createdAt: run.createdAt,
        isSynthetic: true
      })
    }

    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (filter?.limit && filter.limit > 0) {
      return entries.slice(0, filter.limit)
    }
    return entries
  }

  getStorageStats(): LabStorageStats {
    const reviewEvents = this.listReviewEvents()
    const suggestions = this.listSuggestions()
    const buildBriefs = this.listBuildBriefs()
    const classifications = [
      ...reviewEvents.map((e) => e.storageClassification),
      ...suggestions.map((s) => s.storageClassification),
      ...buildBriefs.map((b) => b.storageClassification)
    ]

    return {
      backend: 'memory-fallback',
      reviewEventCount: reviewEvents.length,
      suggestionCount: suggestions.length,
      buildBriefCount: buildBriefs.length,
      evaluationRunCount: this.listEvaluationRuns().length,
      founderActionCount: this.founderActionLogs.length,
      auditEventCount: this.auditEvents.length,
      redactedStoragePercentage: computeRedactedStoragePercentage(classifications),
      lastSuccessfulWriteAt: null,
      failedWriteCount: 0
    }
  }

  resetForTests(): void {
    reviewEventMemoryRepository.resetForTests()
    evaluationMemoryRepository.resetForTests()
    this.reviewClassifications.clear()
    this.suggestions = []
    this.buildBriefs = []
    this.founderActionLogs = []
    this.auditEvents = []
    this.detectedPatternIds.clear()
  }
}

export const labMemoryStorageRepository = new LabMemoryStorageRepository()
