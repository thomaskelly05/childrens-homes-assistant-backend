'use client'

import { useState } from 'react'

import {
  OrbPremiumButton,
  OrbPremiumPill,
  OrbPremiumTextarea,
  OrbStudioComposerCard,
  OrbStudioPage,
  OrbStudioSidebarPanel
} from '@/components/orb/premium'
import { ORB_PREMIUM_ACTION_LABELS } from '@/components/orb/premium/orb-premium-theme'
import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
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

/** Deprecated from primary nav; capability now lives in Chat/Templates/ORB Write/Documents. */
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
      title="Inspection evidence preparation"
      subtitle="Explore evidence, gaps and Inspection evidence preparation without making regulatory judgements."
      panelId="inspection_readiness"
      {...orbStationShellProps(residentialSurface, 'wide')}
      onClose={onClose}
    >
      <OrbStudioPage
        studioId="inspection_readiness"
        trustStrip={
          <span data-orb-inspection-disclaimer>
            ORB supports Inspection evidence preparation. It does not make regulatory judgements.
          </span>
        }
        trustTone="safety"
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
        sidebar={
          <OrbStudioSidebarPanel title="Guidance" subtitle="What ORB can help with">
            <ul className="space-y-2 text-xs text-[var(--orb-muted)]">
              <li>Evidence themes and gaps</li>
              <li>Inspector question prompts</li>
              <li>Staff readiness questions</li>
              <li>Practical follow-up actions</li>
            </ul>
          </OrbStudioSidebarPanel>
        }
      >
        <div data-orb-inspection-readiness-panel data-orb-premium-page="inspection_readiness">
          <OrbStudioComposerCard label="Paste evidence / notes">
            <OrbPremiumTextarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={8}
              placeholder="Policies, records, visit notes, staff reflections…"
              data-orb-inspection-evidence
            />
          </OrbStudioComposerCard>
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
        </div>
      </OrbStudioPage>
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
      <OrbStudioPage
        studioId="safeguarding_thinking"
        trustStrip={
          <span data-orb-safeguarding-reminder>
            Follow local safeguarding procedures and emergency escalation where needed. ORB supports thinking; it
            does not make safeguarding decisions.
          </span>
        }
        trustTone="safety"
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
        sidebar={
          <OrbStudioSidebarPanel title="Safeguarding guidance" subtitle="ORB supports thinking — not decisions">
            <p className="text-xs text-[var(--orb-muted)]">
              Describe concerns in plain language. ORB will help you think through risk, missing information and
              escalation — you remain responsible for action.
            </p>
          </OrbStudioSidebarPanel>
        }
      >
        <div data-orb-safeguarding-thinking-panel data-orb-premium-page="safeguarding_thinking">
          <OrbStudioComposerCard label="Describe the concern">
            <OrbPremiumTextarea
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              rows={8}
              placeholder="What are you worried about?"
              data-orb-safeguarding-concern
            />
          </OrbStudioComposerCard>
        </div>
      </OrbStudioPage>
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
      <OrbStudioPage
        studioId="record_properly"
        trustStrip="Tell ORB what happened. ORB will shape a draft record for your review — not a live care record."
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
        sidebar={
          <OrbStudioSidebarPanel title="Recording guidance" subtitle="Child-centred professional records">
            <p className="text-xs text-[var(--orb-muted)]">
              Describe facts in plain language. ORB will suggest structure and wording — you review before saving or
              opening in ORB Write.
            </p>
          </OrbStudioSidebarPanel>
        }
      >
        <div data-orb-record-properly-panel data-orb-premium-page="record_properly">
          <OrbStudioComposerCard label="What happened?">
            <OrbPremiumTextarea
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              rows={8}
              placeholder="Facts in plain language…"
              data-orb-record-what
            />
          </OrbStudioComposerCard>
        </div>
      </OrbStudioPage>
    </OrbStandalonePanelShell>
  )
}
