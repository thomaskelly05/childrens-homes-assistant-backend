/**
 * Shared ORB Residential quality layer — frontend client for /orb/standalone/quality-check.
 */

import { authFetch } from '@/lib/auth/api'

export const ORB_SHARED_CAPTURE_PROMPTS = [
  'What happened?',
  'When did it happen?',
  'Who was present?',
  "What was the child's presentation?",
  'What did the child say?',
  'What was the adult response?',
  'What action was taken?',
  'Were there safeguarding concerns?',
  'Was a manager informed?',
  'Are follow-up actions needed?',
  'Is the record factual?',
  'Is the language respectful?',
  'Is the child central?'
] as const

export type OrbResidentialQualitySurface =
  | 'voice'
  | 'dictate'
  | 'chat'
  | 'write'
  | 'template'
  | 'output'

export type OrbResidentialQualityResult = {
  surface: OrbResidentialQualitySurface
  note_type: string
  quality_checks: Record<string, string>
  missing_prompts: string[]
  framework_gaps: string[]
  ofsted_readiness: {
    ofsted_ready: boolean
    reg44_reg45_useful: boolean
    strengths: string[]
    gaps: string[]
    recording_quality: string
  }
  manager_oversight_prompt: string | null
  shared_capture_prompts: string[]
  child_centred: boolean
  therapeutic_ready: boolean
}

export async function runOrbResidentialQualityCheck(
  text: string,
  options: {
    noteType?: string
    recordTypeId?: string
    templateId?: string
    surface?: OrbResidentialQualitySurface
    signal?: AbortSignal
  } = {}
): Promise<OrbResidentialQualityResult> {
  const json = await authFetch<{ success: boolean; data: OrbResidentialQualityResult }>(
    '/orb/standalone/quality-check',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        note_type: options.noteType ?? 'daily_record',
        record_type_id: options.recordTypeId ?? null,
        template_id: options.templateId ?? null,
        surface: options.surface ?? 'write'
      }),
      signal: options.signal
    }
  )
  if (!json?.success || !json.data) throw new Error('Quality check failed')
  return json.data
}
