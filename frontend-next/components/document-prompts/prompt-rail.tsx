import type { DocumentTemplateSummary } from '@/lib/document-system/templates'

const evidencePrompts = [
  'Chronology reference',
  'Daily note evidence',
  'Direct child voice',
  'Manager review point'
]

export function DocumentPromptRail({ template, onInsertEvidence }: { template: DocumentTemplateSummary; onInsertEvidence?: (prompt: string) => void }) {
  return (
    <aside className="rounded-[28px] border border-blue-100 bg-blue-50/70 p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Orb prompts</p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">Reflective writing support</h2>
      <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-1 text-sm leading-6 text-slate-700">
        {template.prompts.slice(0, 7).map((prompt) => <li key={prompt}>- {prompt}</li>)}
      </ul>
      {onInsertEvidence ? (
        <div className="mt-4 border-t border-blue-100 pt-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Quick insert evidence</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {evidencePrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => onInsertEvidence(prompt)} className="rounded-full bg-white px-3 py-2 text-xs font-black text-blue-800 shadow-sm">
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-4 rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-slate-600">Orb suggestions are prompts only. They do not rewrite or save records until a staff member accepts and saves.</p>
    </aside>
  )
}
