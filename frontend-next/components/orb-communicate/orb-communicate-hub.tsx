'use client'

import type { LucideIcon } from 'lucide-react'
import { BookOpen, Grid3x3, MessageCircle, Mic, PenLine } from 'lucide-react'

import { OrbGlassCard } from '@/components/orb-residential/ui/orb-glass-card'
import type { CommunicateMode } from '@/lib/orb/communicate/orb-communicate-types'

export type CommunicateHubCard = {
  id: Exclude<CommunicateMode, 'hub'>
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

export function OrbCommunicateHub({
  onSelect
}: {
  onSelect: (mode: Exclude<CommunicateMode, 'hub'>) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-orb-communicate-hub>
      {ORB_COMMUNICATE_HUB_CARDS.map((card) => {
        const Icon = card.icon
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelect(card.id)}
            className="text-left transition hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            data-orb-communicate-card={card.id}
          >
            <OrbGlassCard className="h-full border-white/10 bg-white/[0.04] p-5 hover:border-sky-400/25 hover:bg-white/[0.06]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400 [text-wrap:pretty]">
                {card.description}
              </p>
            </OrbGlassCard>
          </button>
        )
      })}
    </div>
  )
}
