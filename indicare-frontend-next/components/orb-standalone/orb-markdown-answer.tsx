'use client'

import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { OrbInlineCitation } from '@/components/orb-standalone/orb-inline-citation'
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

function buildMarkdownComponents(sources?: StandaloneOrbSource[]): Components {
  return {
    h1: ({ children }) => (
      <h2 className="orb-md-h2 mb-2 mt-5 first:mt-0 text-[17px] font-bold leading-snug text-[#0F172A]">{children}</h2>
    ),
    h2: ({ children }) => (
      <h2 className="orb-md-h2 mb-2 mt-5 first:mt-0 text-base font-bold leading-snug text-[#0F172A]">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="orb-md-h3 mb-2 mt-4 first:mt-0 text-[15px] font-bold leading-snug text-[#0F172A]">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="orb-md-h4 mb-1.5 mt-3 text-[14px] font-bold leading-snug text-[#0F172A]">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="orb-md-p mb-3 last:mb-0 text-[15px] leading-[1.7] text-[var(--orb-foreground)]">{children}</p>
    ),
    strong: ({ children }) => <strong className="font-bold text-[#0F172A]">{children}</strong>,
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
export function OrbMarkdownAnswer({ content, sources }: { content: string; sources?: StandaloneOrbSource[] }) {
  if (!content.trim()) return null

  const prepared = encodeInlineCitations(content)

  return (
    <div className="orb-markdown-answer" data-orb-markdown-answer>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildMarkdownComponents(sources)}>
        {prepared}
      </ReactMarkdown>
    </div>
  )
}
