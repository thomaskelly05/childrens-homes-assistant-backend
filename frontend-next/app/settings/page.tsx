import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OperationalLifecyclePanel } from '@/components/indicare/operational-lifecycle-panel'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { deriveLifecycleState } from '@/lib/lifecycle/selectors'
import { getAssistantGovernance, getProviderSettings } from '@/lib/os-api/platform'

function valueLabel(value: unknown) {
  if (value === true) return 'Enabled'
  if (value === false) return 'Disabled'
  if (value === undefined || value === null || value === '') return 'Not returned'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None returned'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default async function SettingsPage() {
  const [providerResult, governanceResult] = await Promise.all([getProviderSettings(), getAssistantGovernance()])
  const governance = governanceResult.data.aiGovernance || {}
  const account = providerResult.data.account || {}
  const profile = account.profile || {}
  const user = account.user || {}
  const osContext = providerResult.data.osContext || {}
  const aiRows = [
    ['External AI processing', governance.external_ai_enabled ?? governance.externalAIEnabled],
    ['Redaction mode', governance.redaction_mode ?? governance.redactionMode],
    ['Metadata extraction', governance.metadata_extraction_enabled ?? governance.metadataExtractionEnabled],
    ['Inspection readiness', governance.inspection_readiness_enabled ?? governance.inspectionReadinessEnabled],
    ['Allowed assistant features', governance.allowed_ai_features ?? governance.allowedAIFeatures],
    ['Restricted features', governance.restricted_feature_prefixes ?? governance.restrictedFeaturePrefixes],
    ['Streaming', governance.streaming_enabled ?? governance.streamingEnabled],
    ['Prompt/transcript storage', governance.store_prompts ?? governance.prompt_storage_enabled]
  ]
  const governanceLifecycle = aiRows.map(([label, value]) => deriveLifecycleState({
    id: String(label).toLowerCase().replaceAll(' ', '_'),
    type: 'governance_control',
    title: label,
    status: value === false || value === undefined || value === null ? 'in_review' : 'resolved',
    review_notes: valueLabel(value),
    governance_ids: [String(label)]
  }, 'governance_control'))
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Provider and AI governance"
        description="Provider context, home scope, assistant policy and audit foundations surfaced from live backend settings where available."
      />
      <LiveDataStatus result={providerResult} />
      <LiveDataStatus result={governanceResult} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Homes visible" value={Array.isArray(osContext.homes) ? osContext.homes.length : 0} detail="Returned by /api/os/context" />
        <StatCard label="Children visible" value={Array.isArray(osContext.children) ? osContext.children.length : 0} detail="Current role scope" />
        <StatCard label="Assistant policy" value={Object.keys(governance).length ? 'Returned' : 'Not configured'} detail="/api/ai/governance/status" />
        <StatCard label="ORB runtime" value={governanceResult.data.orbHealth ? 'Available' : 'Not returned'} detail="/orb/health" />
      </section>
      <Card>
        <SectionHeader eyebrow="Provider" title="Account and home context" />
        <DataTable
          headers={['Setting', 'Value', 'Status']}
          rows={[
            ['Signed-in user', profile.display_name || user.email || 'Not returned', <StatusBadge key="user" value={user.id ? 'returned' : 'not returned'} />],
            ['Role', user.role || 'Not returned', <StatusBadge key="role" value={user.role ? 'configured' : 'not returned'} />],
            ['Home id', user.home_id || 'Not returned', <StatusBadge key="home" value={user.home_id ? 'scoped' : 'not returned'} />],
            ['Provider id', user.provider_id || 'Not returned', <StatusBadge key="provider" value={user.provider_id ? 'scoped' : 'not returned'} />],
            ['Assistant default mode', profile.assistant_default_mode || 'Not returned', <StatusBadge key="assistant" value={profile.assistant_default_mode ? 'configured' : 'not returned'} />]
          ]}
          empty={<EmptyState title="No provider settings returned" description="The backend did not return account or provider settings for this session." />}
        />
      </Card>
      <Card>
        <SectionHeader eyebrow="AI governance" title="Assistant policy and data controls" description="These are governance flags, not clinical or legal assurances." />
        <DataTable
          headers={['Control', 'Backend value']}
          rows={aiRows.map(([label, value]) => [label, valueLabel(value)])}
          empty={<EmptyState title="No AI governance returned" description="No assistant governance settings are available for this session." />}
        />
        <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Assistant output remains draft support. Safeguarding, regulatory and clinical decisions require professional judgement and manager oversight.</p>
        <div className="mt-5">
          <Link href="/settings/ai-trust" className="inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">
            AI Trust &amp; Data Settings
          </Link>
        </div>
      </Card>
      <Card>
        <OperationalLifecyclePanel
          title="Governance review lifecycle"
          description="Provider and assistant controls are grouped as reviewable governance states without changing policy from the UI."
          items={governanceLifecycle}
        />
      </Card>
      <Card>
        <SectionHeader eyebrow="ORB" title="Voice and runtime settings" />
        <p className="text-sm leading-6 text-slate-600">Configure ORB voice profile, microphone onboarding, activation preferences, privacy and confirmation-before-write safety controls.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/settings/orb" className="inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">
            Open ORB settings
          </Link>
          <Link href="/setup" className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
            Provider setup
          </Link>
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Audit, retention and assistant policy" title="Configured routes and gaps" />
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['Users / Roles', 'Available through auth/session and manager routes where permitted.'],
            ['Audit', 'Manager audit routes exist; record-level audit panels still need a shared adapter.'],
            ['Retention', 'No unified retention endpoint was found during the audit.'],
            ['Assistant Policy', 'AI gateway and ORB status are wired; provider admins can edit trust settings at /settings/ai-trust.']
          ].map(([title, body]) => (
            <div key={title} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
