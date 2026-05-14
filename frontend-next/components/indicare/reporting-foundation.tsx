'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { ActionsPanel, EvidenceGapsPanel } from '@/components/indicare/action-evidence-panels'
import { CitationList } from '@/components/indicare/citations/citation-list'
import { QualityStandardBadges } from '@/components/indicare/workflows/quality-standard-badges'
import { generateReport } from '@/lib/regulatory-reporting/generators'
import { reportTemplates } from '@/lib/regulatory-reporting/templates'
import { ReportTemplateId } from '@/lib/regulatory-reporting/types'
import { getEvidenceItems } from '@/lib/evidence/selectors'
import { indicareData } from '@/lib/indicare/demo-data'
import { getRegulatoryReferenceById } from '@/lib/regulatory-framework/selectors'

function isRegulatoryReference(reference: ReturnType<typeof getRegulatoryReferenceById>): reference is NonNullable<ReturnType<typeof getRegulatoryReferenceById>> {
  return Boolean(reference)
}

export function ReportingFoundation() {
  const [templateId, setTemplateId] = useState<ReportTemplateId>('reg44')
  const [youngPersonId, setYoungPersonId] = useState('')
  const [dateFrom, setDateFrom] = useState('2026-05-01')
  const [dateTo, setDateTo] = useState('2026-05-13')
  const [regulation, setRegulation] = useState('')
  const [exportMessage, setExportMessage] = useState('')

  const generated = useMemo(() => generateReport({
    templateId,
    homeId: 'home-oak',
    youngPersonId: youngPersonId || undefined,
    dateFrom,
    dateTo,
    regulation: regulation || undefined
  }), [templateId, youngPersonId, dateFrom, dateTo, regulation])

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Templates</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">Report template foundations</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {reportTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                setTemplateId(template.id)
                setRegulation(template.regulation || '')
              }}
              className={`rounded-[22px] border p-4 text-left transition ${templateId === template.id ? 'border-blue-200 bg-blue-50 shadow-lg shadow-blue-100/60' : 'border-slate-100 bg-slate-50/70 hover:bg-white'}`}
            >
              <h3 className="text-sm font-black text-slate-950">{template.title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{template.description}</p>
              {template.regulation ? <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">{template.regulation}</span> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <aside className="space-y-5">
          <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-black text-slate-950">Generate draft</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-bold text-slate-600">
                Young person
                <select value={youngPersonId} onChange={(event) => setYoungPersonId(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <option value="">Home-wide</option>
                  {indicareData.youngPeople.map((person) => <option key={person.id} value={person.id}>{person.preferredName} {person.lastName}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Date from
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Date to
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Regulation
                <input value={regulation} onChange={(event) => setRegulation(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" placeholder="Regulation 44" />
              </label>
            </div>
            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              {generated.disclaimer}
            </div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-black text-slate-950">Export controls</h2>
            <div className="mt-4 grid gap-2">
              {['PDF', 'Word', 'Email/share', 'Save to documents'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setExportMessage(`${item} export is not enabled in this workspace yet. This draft has not been saved, shared or marked complete.`)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600"
                >
                  {item} export unavailable
                </button>
              ))}
            </div>
            {exportMessage ? <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">{exportMessage}</p> : null}
          </div>
        </aside>

        <main className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="mb-6">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Generated report preview</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{generated.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Status: {generated.status}. Generated from {generated.citations.length} chronology citations.</p>
          </div>
          <div className="space-y-4">
            {generated.sections.map((section) => (
              <article key={section.id} className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
                <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">{section.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
                <div className="mt-4">
                  <QualityStandardBadges references={section.regulatoryReferenceIds.map((referenceId) => getRegulatoryReferenceById(referenceId)).filter(isRegulatoryReference)} limit={6} />
                </div>
                <div className="mt-4 grid gap-3 rounded-2xl border border-white bg-white p-4 text-xs font-bold leading-5 text-slate-500 md:grid-cols-3">
                  <p><strong className="text-slate-800">Linked SCCIF:</strong> {section.linkedSccifAreas.slice(0, 2).join(', ') || 'No mapped area yet'}</p>
                  <p><strong className="text-slate-800">Evidence gaps:</strong> {section.evidenceGaps.join(', ') || 'No current gap flagged'}</p>
                  <p><strong className="text-slate-800">Review:</strong> {section.reviewRequired ? 'Requires manager review' : 'No current review flag; still draft'}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.citations.map((citation) => <Link key={`${section.id}-${citation.eventId}`} href={`/chronology/${citation.eventId}`} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-500">{citation.label}</Link>)}
                </div>
              </article>
            ))}
          </div>
        </main>

        <aside className="space-y-5">
          <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-black text-slate-950">Citations panel</h2>
            <div className="mt-4 space-y-2">
              {generated.citations.map((citation) => (
                <Link key={citation.eventId} href={`/chronology/${citation.eventId}`} className="block rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-600">{citation.label}</Link>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-black text-slate-950">Report source panel</h2>
            <div className="mt-4 space-y-3 text-xs font-bold leading-5 text-slate-600">
              <p>Chronology events used: {generated.sourcePanel.chronologyEventIds.length}</p>
              <p>Documents used: {generated.sourcePanel.documentIds.length || 'No linked documents found'}</p>
              <p>Actions used: {generated.sourcePanel.actionIds.length}</p>
              <p>Evidence used: {generated.sourcePanel.evidenceIds.length}</p>
              <p>Missing expected evidence: {generated.sourcePanel.missingExpectedEvidence.join(', ') || 'No current missing expected evidence flagged'}</p>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-black text-slate-950">Evidence selector</h2>
            <div className="mt-4 space-y-2">
              {getEvidenceItems().slice(0, 5).map((item) => (
                <label key={item.id} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-600">
                  <input type="checkbox" defaultChecked={generated.citations.some((citation) => citation.sourceId === item.sourceId)} />
                  {item.title}
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-black text-slate-950">Evidence gaps</h2>
            <div className="mt-4"><EvidenceGapsPanel gaps={generated.evidenceGaps} /></div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-black text-slate-950">Traceability chips</h2>
            <div className="mt-4">
              <CitationList citations={generated.citations.map((citation) => ({ label: citation.label, href: `/chronology/${citation.eventId}`, confidence: 'source record', reviewRequired: true }))} />
            </div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-black text-slate-950">Actions</h2>
            <div className="mt-4"><ActionsPanel actions={generated.linkedActions} /></div>
          </div>
        </aside>
      </section>
    </div>
  )
}
