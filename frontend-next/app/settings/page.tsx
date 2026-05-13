import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'

const settings = [
  ['Service', 'Oak House', 'Configured'],
  ['Regulatory context', 'Ofsted children residential / supported accommodation workflows', 'Configured'],
  ['Assistant runtime', 'Mock deterministic adapter with live backend-ready interface', 'Operational'],
  ['Audit trail', 'Entity/action/timestamp foundation', 'Operational'],
  ['Data source', 'Central demo adapter; replaceable with backend API adapter', 'Operational']
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Settings" title="IndiCare OS settings" description="Service configuration, assistant mode, audit foundations and data adapter status." />
      <Card>
        <SectionHeader eyebrow="Configuration" title="Runtime foundations" />
        <div className="space-y-4">
          {settings.map(([label, value, status]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-slate-100 bg-slate-50/70 p-5">
              <div>
                <h3 className="text-sm font-black text-slate-950">{label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{value}</p>
              </div>
              <StatusBadge value={status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
