'use client'

import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { OrbInlineCitation } from '@/components/orb-standalone/orb-inline-citation'
import { normaliseOrbMarkdown } from '@/lib/orb/orb-markdown-normalise'
import type { StandaloneOrbSource } from '@/lib/orb/standalone-local-store'

const CITE_PREFIX = '#orb-cite:'

function sourceForLabel(label: string, sources?: StandaloneOrbSource[]): StandaloneOrbSource {
  const key = label.trim().toLowerCase()
  const match = sources?.find((s) => (s.label || '').trim().toLowerCase() === key)
  return (
    match ?? {
      label,
      type: 'regulatory_framework',
      basis: 'Institutional guidance anchor referenced in this response.'
    }
  )
}

/** Encode [Label] citations as markdown links so they stay inline inside paragraphs/lists. */
function encodeInlineCitations(content: string): string {
  return content.replace(/\[([^\]]+)\]/g, (_match, label: string) => {
    const encoded = encodeURIComponent(label.trim())
    return `[${label}](${CITE_PREFIX}${encoded})`
  })
}

function residentialHeadingClass(text: unknown): string {
  const value = String(text ?? '').toLowerCase()
  if (/fact|observ/.test(value)) return 'orb-md-section--facts'
  if (/child|voice|presentation/.test(value)) return 'orb-md-section--child'
  if (/staff|response/.test(value)) return 'orb-md-section--staff'
  if (/follow|oversight|manager/.test(value)) return 'orb-md-section--oversight'
  if (/policy|local/.test(value)) return 'orb-md-section--policy'
  return ''
}

function buildMarkdownComponents(
  sources?: StandaloneOrbSource[],
  residentialSurface = false
): Components {
  const sectionClass = (children: unknown) =>
    residentialSurface ? residentialHeadingClass(children) : ''

  return {
    h1: ({ children }) => (
      <h2
        className={`orb-md-h2 mb-2 mt-5 first:mt-0 text-[17px] font-bold leading-snug text-[var(--orb-foreground,#0F172A)] ${sectionClass(children)}`}
      >
        {children}
      </h2>
    ),
    h2: ({ children }) => (
      <h2
        className={`orb-md-h2 mb-2 mt-5 first:mt-0 text-base font-bold leading-snug text-[var(--orb-foreground,#0F172A)] ${sectionClass(children)}`}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className={`orb-md-h3 mb-2 mt-4 first:mt-0 text-[15px] font-bold leading-snug text-[var(--orb-foreground,#0F172A)] ${sectionClass(children)}`}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="orb-md-h4 mb-1.5 mt-3 text-[14px] font-bold leading-snug text-[var(--orb-foreground,#0F172A)]">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="orb-md-p mb-3 last:mb-0 text-[15px] leading-[1.7] text-[var(--orb-foreground)]">{children}</p>
    ),
    strong: ({ children }) => <strong className="font-bold text-[var(--orb-foreground,#0F172A)]">{children}</strong>,
    em: ({ children }) => <em className="italic text-[var(--orb-foreground)]">{children}</em>,
    ul: ({ children }) => <ul className="orb-md-ul mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="orb-md-ol mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>,
    li: ({ children }) => (
      <li className="orb-md-li mb-1.5 pl-1 text-[15px] leading-[1.7] text-[var(--orb-foreground)] last:mb-0">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="orb-md-blockquote my-3 border-l-2 border-[#0284C7]/40 pl-4 italic text-[var(--orb-muted)]">
        {children}
      </blockquote>
    ),
    code: ({ className, children }) => {
      const inline = !className
      if (inline) {
        return (
          <code className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[13px] text-[#0F172A]">{children}</code>
        )
      }
      return (
        <code
          className={`block overflow-x-auto rounded-lg bg-[#F8FAFC] p-3 font-mono text-[13px] leading-6 text-[#0F172A] ${className ?? ''}`}
        >
          {children}
        </code>
      )
    },
    pre: ({ children }) => (
      <pre className="orb-md-pre mb-3 overflow-x-auto rounded-lg border border-[var(--orb-line)] bg-[#F8FAFC] p-3 last:mb-0">
        {children}
      </pre>
    ),
    hr: () => <hr className="my-4 border-[var(--orb-line)]" />,
    table: ({ children }) => (
      <div
        className="orb-md-table-wrap mb-3 last:mb-0"
        data-orb-table-scroll
        role="region"
        aria-label="Table — scroll horizontally to view all columns"
      >
        <p className="orb-md-table-scroll-hint" aria-hidden="true">
          Scroll to view full table
        </p>
        <table className="orb-md-table border-collapse text-left text-[14px]">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="orb-md-thead bg-[var(--orb-surface-hover,#F1F5F9)]">{children}</thead>,
    tbody: ({ children }) => <tbody className="orb-md-tbody">{children}</tbody>,
    tr: ({ children }) => <tr className="orb-md-tr border-b border-[var(--orb-line)]">{children}</tr>,
    th: ({ children }) => (
      <th className="orb-md-th border border-[var(--orb-line)] px-3 py-2 text-[13px] font-semibold text-[var(--orb-foreground,#0F172A)]">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="orb-md-td border border-[var(--orb-line)] px-3 py-2 align-top text-[14px] leading-[1.6] text-[var(--orb-foreground)]">
        {children}
      </td>
    ),
    input: ({ checked, disabled, type }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={Boolean(checked)}
            disabled={Boolean(disabled)}
            readOnly
            className="mr-2 align-middle"
            aria-label="Checklist item"
          />
        )
      }
      return <input type={type} checked={checked} disabled={disabled} readOnly />
    },
    a: ({ href, children }) => {
      if (href?.startsWith(CITE_PREFIX)) {
        const label = decodeURIComponent(href.slice(CITE_PREFIX.length))
        return <OrbInlineCitation source={sourceForLabel(label, sources)} />
      }
      return (
        <a
          href={href}
          className="text-[#0284C7] underline underline-offset-2 hover:text-[#0369A1]"
          target="_blank"
          rel="noreferrer"
        >
          {children}
        </a>
      )
    }
  }
}

/** Render assistant answers as markdown with inline citation chips preserved. */
export function OrbMarkdownAnswer({
  content,
  sources,
  residentialSurface = false
}: {
  content: string
  sources?: StandaloneOrbSource[]
  residentialSurface?: boolean
}) {
  if (!content.trim()) return null

  const prepared = encodeInlineCitations(normaliseOrbMarkdown(content))

  return (
    <div
      className={`orb-markdown-answer ${residentialSurface ? 'orb-markdown-answer--residential' : ''}`}
      data-orb-markdown-answer
      data-orb-markdown-answer-residential={residentialSurface ? 'true' : undefined}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildMarkdownComponents(sources, residentialSurface)}>
        {prepared}
      </ReactMarkdown>
    </div>
  )
}
