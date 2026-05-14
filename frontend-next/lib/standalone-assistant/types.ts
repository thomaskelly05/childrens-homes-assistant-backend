import type { LucideIcon } from 'lucide-react'

export type StandaloneBrainId =
  | 'general_assistant'
  | 'childrens_homes_expert'
  | 'ofsted_sccif_coach'
  | 'report_writer'
  | 'policy_procedure_writer'
  | 'productivity_assistant'
  | 'voice_assistant'

export type AssistantAppSlug =
  | 'connect'
  | 'magic-notes'
  | 'docs'
  | 'reports'
  | 'templates'
  | 'policies'
  | 'meetings'
  | 'voice'

export type AssistantNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export type AssistantBrain = {
  id: StandaloneBrainId
  name: string
  description: string
}

export type AssistantApp = {
  slug: AssistantAppSlug
  name: string
  description: string
  route: string
  status: 'foundation' | 'ready'
}
