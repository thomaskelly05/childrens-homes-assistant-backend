'use client'

import { useCallback, useState } from 'react'
import { Check, Copy, Linkedin } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import {
  approveContentDraft,
  copyDraftForLinkedIn,
  getContentDrafts,
  getContentDraftsByChannel,
  getContentDraftsByStatus,
  LINKEDIN_CONNECTOR_ENABLED,
  markContentDraftPosted,
  postToLinkedInDisabledNotice,
  rejectContentDraft,
  type ContentDraft
} from '@/lib/founder/content'

const SECTIONS: Array<{ title: string; filter: (drafts: ContentDraft[]) => ContentDraft[] }> = [
  { title: 'LinkedIn Drafts', filter: () => getContentDraftsByChannel('linkedin') },
  { title: 'Founder Updates', filter: () => getContentDraftsByChannel('founder-update') },
  { title: 'Provider Posts', filter: () => getContentDraftsByChannel('provider-update') },
  { title: 'Investor Updates', filter: () => getContentDraftsByChannel('investor-update') },
  { title: 'Newsletter Drafts', filter: () => getContentDraftsByChannel('newsletter') },
  { title: 'Website Copy Ideas', filter: () => getContentDraftsByChannel('website') },
  { title: 'Approved Content', filter: () => getContentDraftsByStatus('approved') },
  { title: 'Rejected Content', filter: () => getContentDraftsByStatus('rejected') }
]

function DraftCard({ draft, onUpdate }: { draft: ContentDraft; onUpdate: () => void }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    try {
      const text = copyDraftForLinkedIn(draft.id)
      void navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      void navigator.clipboard.writeText(draft.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-bold text-white">{draft.title}</h3>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-400">
          {draft.status}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{draft.body}</p>
      <p className="mt-3 text-xs text-slate-500">Data basis: {draft.dataBasis}</p>
      {draft.safetyNotes.length > 0 ? (
        <p className="mt-2 text-xs text-amber-300">Safety: {draft.safetyNotes.join('; ')}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {(draft.channel === 'linkedin' || draft.channel === 'founder-update') && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy for LinkedIn
          </button>
        )}
        {draft.status === 'needs-review' || draft.status === 'draft' ? (
          <>
            <button
              type="button"
              onClick={() => {
                approveContentDraft(draft.id)
                onUpdate()
              }}
              className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200"
            >
              Mark as Approved
            </button>
            <button
              type="button"
              onClick={() => {
                rejectContentDraft(draft.id)
                onUpdate()
              }}
              className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200"
            >
              Reject
            </button>
          </>
        ) : null}
        {draft.status === 'approved' ? (
          <button
            type="button"
            onClick={() => {
              markContentDraftPosted(draft.id)
              onUpdate()
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200"
          >
            <Linkedin className="h-3.5 w-3.5" />
            Mark as Posted
          </button>
        ) : null}
      </div>
      {!LINKEDIN_CONNECTOR_ENABLED ? (
        <p className="mt-3 text-xs text-slate-500">{postToLinkedInDisabledNotice()}</p>
      ) : null}
    </article>
  )
}

export function FounderContentPage() {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const allDrafts = getContentDrafts()

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Brand Content Centre"
          subtitle="Founder-only content drafting and approval centre. All external content requires your review before publishing."
        />

        {allDrafts.length === 0 ? (
          <div className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-12 text-center">
            <p className="text-lg font-bold text-slate-300">No content drafts yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Run the Brand Ambassador from the Founder Team or ask ORB Founder to draft a LinkedIn post.
            </p>
          </div>
        ) : (
          SECTIONS.map((section) => {
            const drafts = section.filter(allDrafts)
            if (drafts.length === 0) return null
            return (
              <FounderSectionCard key={section.title} eyebrow="Content" title={section.title}>
                <div className="grid gap-4 xl:grid-cols-2">
                  {drafts.map((draft) => (
                    <DraftCard key={draft.id} draft={draft} onUpdate={refresh} />
                  ))}
                </div>
              </FounderSectionCard>
            )
          })
        )}
      </div>
    </div>
  )
}
