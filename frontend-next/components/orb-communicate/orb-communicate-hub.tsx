'use client'

import type { LucideIcon } from 'lucide-react'
import { BookOpen, Grid3x3, MessageCircle, Mic, PenLine } from 'lucide-react'

import type { CommunicateMode } from '@/lib/orb/communicate/orb-communicate-types'

export type CommunicateHubCard = {
  id: Exclude<CommunicateMode, 'hub' | 'support_pack'>
  title: string
  description: string
  icon: LucideIcon
}

export const ORB_COMMUNICATE_HUB_CARDS: CommunicateHubCard[] = [
  {
    id: 'easy_read',
    title: 'Easy Read',
    description:
      'Create plain-language explanations with clear structure for understanding what is happening and what happens next.',
    icon: BookOpen
  },
  {
    id: 'visual_board',
    title: 'Visual Board',
    description:
      'Build a grid of symbol cards for feelings, choices, people and places using IndiCare placeholder symbols.',
    icon: Grid3x3
  },
  {
    id: 'social_story',
    title: 'Social Story',
    description:
      'Write a respectful social story that prepares, reassures or supports repair — without compliance-led language.',
    icon: MessageCircle
  },
  {
    id: 'my_voice_profile',
    title: 'My Voice Profile',
    description:
      'Capture how the person communicates, what helps, and what staff should not assume — editable and previewable.',
    icon: Mic
  },
  {
    id: 'reflect_record',
    title: 'Reflect & Record',
    description:
      'Draft a warm, factual record of communication support — observation-based and free from judgemental wording.',
    icon: PenLine
  }
]

export function OrbCommunicateAdvancedTools({
  cards,
  onSelect
}: {
  cards: CommunicateHubCard[]
  onSelect: (mode: Exclude<CommunicateMode, 'hub' | 'support_pack'>) => void
}) {
  return (
    <details className="orb-communicate-advanced" data-orb-communicate-advanced-tools>
      <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--orb-res-workspace-muted)] [&::-webkit-details-marker]:hidden">
        Advanced tools
      </summary>
      <p className="mt-2 text-xs text-[var(--orb-res-workspace-muted)]">
        Individual workflows for Easy Read, Visual Board, Social Story, My Voice Profile and Reflect & Record.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" data-orb-communicate-hub>
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.id)}
              className="orb-communicate-advanced-card text-left"
              data-orb-communicate-card={card.id}
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--orb-res-accent-soft)] text-[var(--orb-res-accent)]">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <h3 className="text-sm font-semibold text-[var(--orb-res-navy)]">{card.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--orb-res-workspace-muted)] [text-wrap:pretty]">
                {card.description}
              </p>
            </button>
          )
        })}
      </div>
    </details>
  )
}

/** @deprecated Use OrbCommunicateAdvancedTools inside the create flow. */
export function OrbCommunicateHub({
  onSelect
}: {
  onSelect: (mode: Exclude<CommunicateMode, 'hub' | 'support_pack'>) => void
}) {
  return <OrbCommunicateAdvancedTools cards={ORB_COMMUNICATE_HUB_CARDS} onSelect={onSelect} />
}
