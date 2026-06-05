'use client'

import { useState } from 'react'

import {
  OrbPremiumButton,
  OrbPremiumPill,
  OrbPremiumTextarea,
  OrbPremiumTrustStrip
} from '@/components/orb/premium'
import { ORB_PREMIUM_ACTION_LABELS } from '@/components/orb/premium/orb-premium-theme'
import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbPremiumWorkspaceLayout } from '@/components/orb-standalone/orb-premium-workspace-layout'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  buildOrbInspectionReadinessPrompt,
  buildOrbRecordProperlyPrompt,
  buildOrbSafeguardingThinkingPrompt
} from '@/lib/orb/orb-practice-prompts'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

function fieldLabel(text: string) {
  return <span className="text-xs font-medium text-[var(--orb-muted)]">{text}</span>
}

export function OrbInspectionReadinessPanel({
  open,
  onClose,
  onRun,
  residentialSurface
}: {
  open: boolean
  onClose: () => void
  onRun: (payload: { prompt: string; mode: StandaloneOrbMode }) => void
  residentialSurface?: boolean
}) {
  const [evidence, setEvidence] = useState('')
  const [focus, setFocus] = useState<'inspector_questions' | 'readiness_questions' | 'action_plan'>(
    'readiness_questions'
  )

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Inspection Readiness"
      subtitle="Explore evidence, gaps and inspection readiness without making regulatory judgements."
      panelId="inspection_readiness"
      {...orbStationShellProps(residentialSurface, 'wide')}
      onClose={onClose}
    >
      <div className="p-4 sm:p-5" data-orb-inspection-readiness-panel data-orb-premium-page="inspection_readiness">
        <OrbPremiumWorkspaceLayout
          panelId="inspection_readiness"
          intro={
            <OrbPremiumTrustStrip tone="safety" data-orb-inspection-disclaimer>
              ORB supports inspection readiness. It does not make regulatory judgements.
            </OrbPremiumTrustStrip>
          }
          primaryAction={
            <OrbPremiumButton
              disabled={!evidence.trim()}
              fullWidth
              data-orb-inspection-run
              onClick={() => {
                onRun({
                  prompt: buildOrbInspectionReadinessPrompt({ evidence, focus }),
                  mode: 'Ofsted Lens'
                })
                onClose()
              }}
            >
              {ORB_PREMIUM_ACTION_LABELS.continueInChat}
            </OrbPremiumButton>
          }
          advanced={
            <ul className="space-y-1 text-xs text-[var(--orb-muted)]">
              <li>Evidence themes and gaps</li>
              <li>Questions an inspector may explore</li>
              <li>Readiness questions for staff</li>
              <li>Practical follow-up actions</li>
            </ul>
          }
        >
          <label className="block">
            {fieldLabel('Paste evidence / notes')}
            <OrbPremiumTextarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={6}
              placeholder="Policies, records, visit notes, staff reflections…"
              className="mt-2"
              data-orb-inspection-evidence
            />
          </label>
          <fieldset className="mt-3 space-y-2">
            <legend className="text-xs font-medium text-[var(--orb-muted)]">First action</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['inspector_questions', 'What may an inspector look for?'],
                  ['readiness_questions', 'Generate readiness questions'],
                  ['action_plan', 'Create action plan']
                ] as const
              ).map(([id, label]) => (
                <OrbPremiumPill
                  key={id}
                  active={focus === id}
                  onClick={() => setFocus(id)}
                  data-orb-inspection-focus={id}
                >
                  {label}
                </OrbPremiumPill>
              ))}
            </div>
          </fieldset>
        </OrbPremiumWorkspaceLayout>
      </div>
    </OrbStandalonePanelShell>
  )
}

export function OrbSafeguardingThinkingPanel({
  open,
  onClose,
  onRun,
  residentialSurface
}: {
  open: boolean
  onClose: () => void
  onRun: (payload: { prompt: string; mode: StandaloneOrbMode }) => void
  residentialSurface?: boolean
}) {
  const [concern, setConcern] = useState('')
  const [immediateRisk, setImmediateRisk] = useState('')
  const [context, setContext] = useState('')

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Safeguarding Thinking"
      subtitle="Think through concerns, immediate risk, missing information and escalation considerations."
      panelId="safeguarding_thinking"
      {...orbStationShellProps(residentialSurface, 'wide')}
      onClose={onClose}
    >
      <div className="p-4 sm:p-5" data-orb-safeguarding-thinking-panel data-orb-premium-page="safeguarding_thinking">
        <OrbPremiumWorkspaceLayout
          panelId="safeguarding_thinking"
          intro={
            <OrbPremiumTrustStrip tone="safety" data-orb-safeguarding-reminder>
              Follow local safeguarding procedures and emergency escalation where needed. ORB supports thinking; it
              does not make safeguarding decisions.
            </OrbPremiumTrustStrip>
          }
          primaryAction={
            <OrbPremiumButton
              disabled={!concern.trim()}
              fullWidth
              data-orb-safeguarding-run
              onClick={() => {
                onRun({
                  prompt: buildOrbSafeguardingThinkingPrompt({ concern, immediateRisk, context }),
                  mode: 'Safeguarding Thinking'
                })
                onClose()
              }}
            >
              {ORB_PREMIUM_ACTION_LABELS.continueInChat}
            </OrbPremiumButton>
          }
          advanced={
            <>
              <label className="block">
                {fieldLabel('Immediate risk?')}
                <OrbPremiumTextarea
                  value={immediateRisk}
                  onChange={(e) => setImmediateRisk(e.target.value)}
                  rows={2}
                  placeholder="e.g. current location, known risks, who is present…"
                  className="mt-2"
                  data-orb-safeguarding-risk
                />
              </label>
              <label className="mt-3 block">
                {fieldLabel('Known vulnerabilities / context')}
                <OrbPremiumTextarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={2}
                  placeholder="Optional — history, plans, communication needs…"
                  className="mt-2"
                  data-orb-safeguarding-context
                />
              </label>
            </>
          }
        >
          <label className="block">
            {fieldLabel('Describe the concern')}
            <OrbPremiumTextarea
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              rows={5}
              placeholder="What are you worried about?"
              className="mt-2"
              data-orb-safeguarding-concern
            />
          </label>
        </OrbPremiumWorkspaceLayout>
      </div>
    </OrbStandalonePanelShell>
  )
}

export function OrbRecordProperlyPanel({
  open,
  onClose,
  onRun,
  residentialSurface
}: {
  open: boolean
  onClose: () => void
  onRun: (payload: { prompt: string; mode: StandaloneOrbMode }) => void
  residentialSurface?: boolean
}) {
  const [whatHappened, setWhatHappened] = useState('')
  const [whoInvolved, setWhoInvolved] = useState('')
  const [staffObservations, setStaffObservations] = useState('')
  const [staffActions, setStaffActions] = useState('')
  const [followUp, setFollowUp] = useState('')

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Record This Properly"
      subtitle="Turn what happened into the right kind of professional residential record."
      panelId="record_properly"
      {...orbStationShellProps(residentialSurface, 'wide')}
      onClose={onClose}
    >
      <div className="p-4 sm:p-5" data-orb-record-properly-panel data-orb-premium-page="record_properly">
        <OrbPremiumWorkspaceLayout
          panelId="record_properly"
          intro={
            <OrbPremiumTrustStrip>
              Tell ORB what happened. ORB will shape a draft record for your review — not a live care record.
            </OrbPremiumTrustStrip>
          }
          primaryAction={
            <OrbPremiumButton
              disabled={!whatHappened.trim()}
              fullWidth
              data-orb-record-run
              onClick={() => {
                onRun({
                  prompt: buildOrbRecordProperlyPrompt({
                    whatHappened,
                    whoInvolved,
                    staffObservations,
                    staffActions,
                    followUp
                  }),
                  mode: 'Record This Properly'
                })
                onClose()
              }}
            >
              {ORB_PREMIUM_ACTION_LABELS.generateDraft}
            </OrbPremiumButton>
          }
          advanced={
            <>
              <label className="block">
                {fieldLabel('Who was involved?')}
                <OrbPremiumTextarea
                  value={whoInvolved}
                  onChange={(e) => setWhoInvolved(e.target.value)}
                  rows={2}
                  placeholder="Young people, staff, others…"
                  className="mt-2"
                  data-orb-record-who
                />
              </label>
              <label className="mt-3 block">
                {fieldLabel('What did staff see/hear?')}
                <OrbPremiumTextarea
                  value={staffObservations}
                  onChange={(e) => setStaffObservations(e.target.value)}
                  rows={2}
                  placeholder="Observations only — avoid opinion where possible…"
                  className="mt-2"
                  data-orb-record-observations
                />
              </label>
              <label className="mt-3 block">
                {fieldLabel('What did staff do?')}
                <OrbPremiumTextarea
                  value={staffActions}
                  onChange={(e) => setStaffActions(e.target.value)}
                  rows={2}
                  placeholder="Actions, de-escalation, contacts…"
                  className="mt-2"
                  data-orb-record-actions
                />
              </label>
              <label className="mt-3 block">
                {fieldLabel('What needs follow-up?')}
                <OrbPremiumTextarea
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  rows={2}
                  placeholder="Handover, manager, external agency…"
                  className="mt-2"
                  data-orb-record-followup
                />
              </label>
            </>
          }
        >
          <label className="block">
            {fieldLabel('What happened?')}
            <OrbPremiumTextarea
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              rows={5}
              placeholder="Facts in plain language…"
              className="mt-2"
              data-orb-record-what
            />
          </label>
        </OrbPremiumWorkspaceLayout>
      </div>
    </OrbStandalonePanelShell>
  )
}
