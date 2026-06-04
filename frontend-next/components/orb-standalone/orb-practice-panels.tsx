'use client'

import { useState } from 'react'

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

function fieldTextarea(
  value: string,
  onChange: (v: string) => void,
  rows: number,
  placeholder: string,
  dataOrb: string
) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
      data-orb={dataOrb}
    />
  )
}

const primaryButtonClass =
  'w-full rounded-xl bg-gradient-to-r from-[#168bff] to-[#0d5fcc] py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(22,139,255,0.25)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none'

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
      <div className="p-4 sm:p-5" data-orb-inspection-readiness-panel>
        <OrbPremiumWorkspaceLayout
          panelId="inspection_readiness"
          intro={
            <p className="text-xs leading-5 text-[var(--orb-muted)]" data-orb-inspection-disclaimer>
              ORB supports inspection readiness. It does not make regulatory judgements.
            </p>
          }
          primaryAction={
            <button
              type="button"
              disabled={!evidence.trim()}
              className={primaryButtonClass}
              data-orb-inspection-run
              onClick={() => {
                onRun({
                  prompt: buildOrbInspectionReadinessPrompt({ evidence, focus }),
                  mode: 'Ofsted Lens'
                })
                onClose()
              }}
            >
              Continue in chat
            </button>
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
            {fieldTextarea(
              evidence,
              setEvidence,
              6,
              'Policies, records, visit notes, staff reflections…',
              'orb-inspection-evidence'
            )}
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
                <button
                  key={id}
                  type="button"
                  onClick={() => setFocus(id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    focus === id
                      ? 'border-[var(--orb-primary,#168bff)] bg-[var(--orb-primary-soft,rgba(22,139,255,0.16))] text-[var(--orb-foreground)]'
                      : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:border-[var(--orb-primary)]/35'
                  }`}
                  data-orb-inspection-focus={id}
                >
                  {label}
                </button>
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
      <div className="p-4 sm:p-5" data-orb-safeguarding-thinking-panel>
        <OrbPremiumWorkspaceLayout
          panelId="safeguarding_thinking"
          intro={
            <p className="text-xs leading-5 text-amber-700 dark:text-amber-200/90" data-orb-safeguarding-reminder>
              Follow local safeguarding procedures and emergency escalation where needed. ORB supports thinking; it
              does not make safeguarding decisions.
            </p>
          }
          primaryAction={
            <button
              type="button"
              disabled={!concern.trim()}
              className={primaryButtonClass}
              data-orb-safeguarding-run
              onClick={() => {
                onRun({
                  prompt: buildOrbSafeguardingThinkingPrompt({ concern, immediateRisk, context }),
                  mode: 'Safeguarding Thinking'
                })
                onClose()
              }}
            >
              Continue in chat
            </button>
          }
          advanced={
            <>
              <label className="block">
                {fieldLabel('Immediate risk?')}
                {fieldTextarea(
                  immediateRisk,
                  setImmediateRisk,
                  2,
                  'e.g. current location, known risks, who is present…',
                  'orb-safeguarding-risk'
                )}
              </label>
              <label className="mt-3 block">
                {fieldLabel('Known vulnerabilities / context')}
                {fieldTextarea(
                  context,
                  setContext,
                  2,
                  'Optional — history, plans, communication needs…',
                  'orb-safeguarding-context'
                )}
              </label>
            </>
          }
        >
          <label className="block">
            {fieldLabel('Describe the concern')}
            {fieldTextarea(concern, setConcern, 5, 'What are you worried about?', 'orb-safeguarding-concern')}
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
      <div className="p-4 sm:p-5" data-orb-record-properly-panel>
        <OrbPremiumWorkspaceLayout
          panelId="record_properly"
          intro={
            <p className="text-xs leading-5 text-[var(--orb-muted)]">
              Tell ORB what happened. ORB will shape a draft record for your review.
            </p>
          }
          primaryAction={
            <button
              type="button"
              disabled={!whatHappened.trim()}
              className={primaryButtonClass}
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
              Generate professional record
            </button>
          }
          advanced={
            <>
              <label className="block">
                {fieldLabel('Who was involved?')}
                {fieldTextarea(whoInvolved, setWhoInvolved, 2, 'Young people, staff, others…', 'orb-record-who')}
              </label>
              <label className="mt-3 block">
                {fieldLabel('What did staff see/hear?')}
                {fieldTextarea(
                  staffObservations,
                  setStaffObservations,
                  2,
                  'Observations only — avoid opinion where possible…',
                  'orb-record-observations'
                )}
              </label>
              <label className="mt-3 block">
                {fieldLabel('What did staff do?')}
                {fieldTextarea(staffActions, setStaffActions, 2, 'Actions, de-escalation, contacts…', 'orb-record-actions')}
              </label>
              <label className="mt-3 block">
                {fieldLabel('What needs follow-up?')}
                {fieldTextarea(followUp, setFollowUp, 2, 'Handover, manager, external agency…', 'orb-record-followup')}
              </label>
            </>
          }
        >
          <label className="block">
            {fieldLabel('What happened?')}
            {fieldTextarea(whatHappened, setWhatHappened, 5, 'Facts in plain language…', 'orb-record-what')}
          </label>
        </OrbPremiumWorkspaceLayout>
      </div>
    </OrbStandalonePanelShell>
  )
}
