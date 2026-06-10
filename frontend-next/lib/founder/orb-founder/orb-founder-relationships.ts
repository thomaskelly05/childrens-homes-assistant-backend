/**
 * ORB Founder — relationship intelligence integration.
 * Uses recorded relationship data only; never invents facts.
 */

import { createFounderMemoryItem } from '@/lib/founder/memory/founder-memory-store'
import { evidenceAudienceLabel } from '@/lib/founder/relationships/relationship-evidence'
import {
  analyseRelationship,
  getColdRelationships,
  getFollowUpRecommendations,
  getPilotOpportunityPriorities,
  getTopRelationships
} from '@/lib/founder/relationships/relationship-intelligence-engine'
import {
  generateFollowUpDraft,
  getRelationship,
  getRelationships,
  hydrateRelationshipsFromPersistence
} from '@/lib/founder/relationships/relationship-store'
import { RELATIONSHIP_TYPE_LABELS } from '@/lib/founder/relationships/relationship-types'
import type { FounderOrbAnswer } from './orb-founder-engine'

function noRelationshipDataAnswer(): FounderOrbAnswer {
  return {
    answer:
      'No relationship records are stored yet. Add contacts at /founder/relationships before I can advise on follow-ups, priorities or drafts. I will not invent investor or provider interest.',
    usedSources: ['Founder Relationship Intelligence'],
    suggestedFollowUps: [
      'Add a provider relationship',
      'Add an investor relationship',
      'Which evidence pack fits a local authority?'
    ],
    confidence: 'high'
  }
}

function relationshipFromQuestion(question: string): { id?: string; name?: string; organisation?: string } {
  const q = question.toLowerCase()
  const relationships = getRelationships().filter((r) => r.status !== 'archived')

  for (const rel of relationships) {
    const org = rel.organisation.toLowerCase()
    const name = rel.name.toLowerCase()
    if (org && q.includes(org)) return { id: rel.id, name: rel.name, organisation: rel.organisation }
    if (name && q.includes(name)) return { id: rel.id, name: rel.name, organisation: rel.organisation }
  }

  if (/openai/.test(q)) {
    const match = relationships.find((r) => /openai/i.test(r.organisation) || /openai/i.test(r.name))
    if (match) return { id: match.id, name: match.name, organisation: match.organisation }
  }
  if (/microsoft/.test(q)) {
    const match = relationships.find((r) => /microsoft/i.test(r.organisation) || /microsoft/i.test(r.name))
    if (match) return { id: match.id, name: match.name, organisation: match.organisation }
  }
  if (/innovate\s*uk/.test(q)) {
    const match = relationships.find((r) => /innovate\s*uk/i.test(r.organisation) || /innovate\s*uk/i.test(r.name))
    if (match) return { id: match.id, name: match.name, organisation: match.organisation }
  }

  return {}
}

export function matchesRelationshipQuestion(question: string): boolean {
  const q = question.toLowerCase()
  return (
    /follow up/.test(q) ||
    /relationship/.test(q) ||
    /going cold/.test(q) ||
    /pilot opportunit/.test(q) ||
    /what should i send (?:this )?(?:provider|investor)/.test(q) ||
    /evidence pack fits/.test(q) ||
    /openai|microsoft|innovate\s*uk/.test(q) ||
    /matter most right now/.test(q)
  )
}

export function answerRelationshipQuestion(question: string): FounderOrbAnswer | null {
  void hydrateRelationshipsFromPersistence().catch(() => undefined)

  const active = getRelationships().filter((r) => r.status !== 'archived')
  const q = question.toLowerCase()

  if (/who should i follow up with today/.test(q)) {
    if (active.length === 0) return noRelationshipDataAnswer()
    const followUps = getFollowUpRecommendations()
    if (followUps.length === 0) {
      return {
        answer:
          'No follow-ups are due based on recorded contact dates, statuses and next actions. Review /founder/relationships if you expect outreach today.',
        usedSources: ['Founder Relationship Intelligence'],
        suggestedFollowUps: ['Which relationships matter most right now?', 'What relationships are going cold?'],
        confidence: 'medium'
      }
    }
    const list = followUps
      .slice(0, 5)
      .map((f) => `• ${f.relationship.name} (${f.relationship.organisation}) — ${f.intelligence.followUpReason}`)
      .join('\n')
    return {
      answer: `Follow up today with:\n${list}\n\nDrafts require approval before any external message is sent.`,
      usedSources: ['Founder Relationship Intelligence'],
      suggestedFollowUps: [
        'Create a follow-up draft for this relationship.',
        'Which pilot opportunities should I prioritise?'
      ],
      confidence: 'high'
    }
  }

  if (/which relationships matter most|relationships matter most right now/.test(q)) {
    if (active.length === 0) return noRelationshipDataAnswer()
    const top = getTopRelationships(5)
    const list = top
      .map(
        (t) =>
          `• ${t.relationship.name} (${RELATIONSHIP_TYPE_LABELS[t.relationship.relationshipType]}) — score ${t.intelligence.priorityScore}, ${t.intelligence.suggestedNextAction}`
      )
      .join('\n')
    return {
      answer: `Highest-priority relationships from recorded data:\n${list}`,
      usedSources: ['Founder Relationship Intelligence', 'Founder Memory'],
      suggestedFollowUps: ['Who should I follow up with today?', 'What relationships are going cold?'],
      confidence: 'high'
    }
  }

  if (/going cold/.test(q)) {
    if (active.length === 0) return noRelationshipDataAnswer()
    const cold = getColdRelationships()
    if (cold.length === 0) {
      return {
        answer: 'No relationships are flagged as going cold from recorded contact dates.',
        usedSources: ['Founder Relationship Intelligence'],
        suggestedFollowUps: ['Who should I follow up with today?'],
        confidence: 'medium'
      }
    }
    const list = cold
      .slice(0, 5)
      .map((c) => `• ${c.relationship.name} — ${c.intelligence.riskOfGoingCold} risk, last contact: ${c.relationship.lastContactAt ?? 'not recorded'}`)
      .join('\n')
    return {
      answer: `Relationships at risk of going cold:\n${list}`,
      usedSources: ['Founder Relationship Intelligence'],
      suggestedFollowUps: ['Create a follow-up draft for this relationship.'],
      confidence: 'high'
    }
  }

  if (/pilot opportunit/.test(q)) {
    if (active.length === 0) return noRelationshipDataAnswer()
    const pilots = getPilotOpportunityPriorities()
    if (pilots.length === 0) {
      return {
        answer: 'No open pilot opportunities are recorded. Add opportunities on relationship detail pages when pilots are discussed.',
        usedSources: ['Founder Relationship Intelligence'],
        suggestedFollowUps: ['Which relationships matter most right now?'],
        confidence: 'medium'
      }
    }
    const list = pilots
      .slice(0, 5)
      .map((p) => `• ${p.relationship.organisation} — ${p.opportunity.title} (${p.opportunity.status})`)
      .join('\n')
    return {
      answer: `Prioritise these recorded pilot opportunities:\n${list}`,
      usedSources: ['Founder Relationship Intelligence'],
      suggestedFollowUps: ['Which evidence pack fits this relationship?'],
      confidence: 'high'
    }
  }

  const target = relationshipFromQuestion(question)
  const bundle = target.id ? getRelationship(target.id) : undefined

  if (/what should i send (?:this )?provider/.test(q)) {
    if (!bundle || bundle.relationship.relationshipType !== 'provider') {
      return {
        answer:
          bundle
            ? `Recorded relationship ${bundle.relationship.name} is typed as ${RELATIONSHIP_TYPE_LABELS[bundle.relationship.relationshipType]}, not provider. I can only draft from recorded relationship context.`
            : 'No matching provider relationship found in recorded data. Add the contact at /founder/relationships first.',
        usedSources: ['Founder Relationship Intelligence'],
        suggestedFollowUps: ['Create a follow-up draft for this relationship.'],
        confidence: bundle ? 'medium' : 'low'
      }
    }
    const intel = analyseRelationship(bundle)
    return {
      answer: `For provider ${bundle.relationship.organisation}: suggested next action — ${intel.suggestedNextAction}. Notes on file: ${bundle.relationship.notes || 'none recorded'}. I can generate a follow-up draft for your approval; nothing is sent automatically.`,
      usedSources: ['Founder Relationship Intelligence'],
      suggestedFollowUps: ['Create a follow-up draft for this relationship.', 'Generate an evidence pack for this relationship.'],
      confidence: 'medium'
    }
  }

  if (/what should i send (?:this )?investor/.test(q)) {
    if (!bundle || bundle.relationship.relationshipType !== 'investor') {
      return {
        answer:
          bundle
            ? `Recorded relationship ${bundle.relationship.name} is not typed as investor.`
            : 'No matching investor relationship found. Add investor contacts at /founder/relationships.',
        usedSources: ['Founder Relationship Intelligence'],
        suggestedFollowUps: ['Generate an investor evidence pack.'],
        confidence: 'low'
      }
    }
    const intel = analyseRelationship(bundle)
    return {
      answer: `For investor ${bundle.relationship.organisation}: ${intel.suggestedNextAction}. Use the investor evidence pack; approval required before sharing. Interests recorded: ${bundle.relationship.interests.join(', ') || 'none'}.`,
      usedSources: ['Founder Relationship Intelligence', 'Founder Evidence Engine'],
      suggestedFollowUps: ['Which evidence pack fits this relationship?', 'Create a follow-up draft for this relationship.'],
      confidence: 'medium'
    }
  }

  if (/evidence pack fits|which evidence pack/.test(q) || /what should i say to/.test(q)) {
    if (!bundle) {
      if (/openai/.test(q)) {
        return {
          answer: 'For OpenAI outreach, use the OpenAI evidence pack at /founder/evidence. Add an OpenAI relationship record to link packs and follow-ups.',
          usedSources: ['Founder Evidence Engine'],
          suggestedFollowUps: ['Generate an OpenAI evidence pack.'],
          confidence: 'medium'
        }
      }
      if (/microsoft/.test(q)) {
        return {
          answer: 'For Microsoft partnership outreach, use the Microsoft evidence pack. Record the Microsoft contact in Relationships to track follow-ups.',
          usedSources: ['Founder Evidence Engine'],
          suggestedFollowUps: ['Generate a Microsoft evidence pack.'],
          confidence: 'medium'
        }
      }
      if (/innovate\s*uk/.test(q)) {
        return {
          answer: 'For Innovate UK, use the Innovate UK evidence pack with honest limitations. No grant interest is assumed without recorded opportunities.',
          usedSources: ['Founder Evidence Engine'],
          suggestedFollowUps: ['Generate an Innovate UK pack.'],
          confidence: 'medium'
        }
      }
      return {
        answer: 'Specify a relationship or add contacts at /founder/relationships so I can recommend the right evidence pack from recorded type and organisation.',
        usedSources: ['Founder Relationship Intelligence'],
        suggestedFollowUps: ['Add an investor relationship', 'Add a provider relationship'],
        confidence: 'low'
      }
    }
    const intel = analyseRelationship(bundle)
    const audience = intel.recommendedEvidenceAudience ?? 'general'
    return {
      answer: `For ${bundle.relationship.organisation}, recommend ${evidenceAudienceLabel(audience as Parameters<typeof evidenceAudienceLabel>[0])}. ${intel.evidencePackRecommended ? 'An opportunity on file suggests evidence is needed.' : 'No open pilot/investment/partnership opportunity recorded yet.'} Approval required before external use.`,
      usedSources: ['Founder Relationship Intelligence', 'Founder Evidence Engine'],
      suggestedFollowUps: ['Generate an evidence pack for this relationship.'],
      confidence: 'high'
    }
  }

  if (/follow-up draft|follow up draft/.test(q)) {
    if (!bundle) {
      return {
        answer: 'Name the relationship or organisation so I can draft from recorded data. No draft is sent externally without approval.',
        usedSources: ['Founder Relationship Intelligence'],
        suggestedFollowUps: ['Who should I follow up with today?'],
        confidence: 'low'
      }
    }
    void generateFollowUpDraft(bundle.relationship.id, 'orb-founder').catch(() => undefined)
    return {
      answer: `I have queued a follow-up draft for ${bundle.relationship.name} at ${bundle.relationship.organisation}. Review it in Content and Approvals (type: relationship-message). No email or LinkedIn message will be sent automatically.`,
      usedSources: ['Founder Relationship Intelligence', 'Approval Centre'],
      suggestedFollowUps: ['What approvals are waiting?', 'Generate an evidence pack for this relationship.'],
      confidence: 'high'
    }
  }

  if (/save.*memory|founder memory/.test(q) && bundle) {
    void createFounderMemoryItem(
      {
        type: 'relationship-note',
        title: `Relationship: ${bundle.relationship.organisation}`,
        content: `Priority ${bundle.relationship.priority}. Next: ${bundle.relationship.nextAction}. Status: ${bundle.relationship.status}.`,
        status: 'active',
        source: 'orb-founder',
        linkedEntityId: bundle.relationship.id,
        linkedEntityType: 'relationship'
      },
      'orb-founder'
    ).catch(() => undefined)
    return {
      answer: `Saved relationship context for ${bundle.relationship.organisation} to Founder Memory.`,
      usedSources: ['Founder Memory', 'Founder Relationship Intelligence'],
      suggestedFollowUps: ['Which relationships matter most right now?'],
      confidence: 'high'
    }
  }

  return null
}
