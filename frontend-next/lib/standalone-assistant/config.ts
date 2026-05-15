import {
  AppWindow,
  BookOpen,
  Bot,
  FileAudio,
  FileText,
  FolderKanban,
  Mic,
  PenLine,
  Search,
  Settings,
  Sparkles,
  UserRound
} from 'lucide-react'

import type { AssistantApp, AssistantBrain, AssistantNavItem } from './types'

export const assistantBrains: AssistantBrain[] = [
  { id: 'general_assistant', name: 'General Assistant', description: 'Everyday help with writing, planning, explanations and productivity.' },
  { id: 'childrens_homes_expert', name: "Children's Homes Expert", description: 'Static sector knowledge about regulations, SCCIF, safeguarding and care practice.' },
  { id: 'ofsted_sccif_coach', name: 'Ofsted / SCCIF Coach', description: 'Inspection preparation, challenge questions, evidence gaps and judgement language.' },
  { id: 'report_writer', name: 'Report Writer', description: 'Drafts Reg 44, Reg 45, LAC review, oversight and evidence pack structures.' },
  { id: 'policy_procedure_writer', name: 'Policy and Procedure Writer', description: 'Creates policy drafts and procedure outlines for manager review.' },
  { id: 'productivity_assistant', name: 'Productivity Assistant', description: 'Emails, minutes, action lists, planning and professional writing.' },
  { id: 'voice_assistant', name: 'Voice Assistant', description: 'Standalone voice-first assistant using Orb-style voice technology without OS context.' }
]

export const assistantPrompts = [
  'Explain Regulation 12 in plain English.',
  'Draft a child-centred supervision note.',
  'Create a Reg 45 improvement plan outline.',
  'What would Ofsted ask about leadership and management?',
  'Help me write a professional email.',
  'Summarise this uploaded document.',
  'Create a daily note template.',
  'Explain SCCIF judgement areas.'
]

export const assistantNavItems: AssistantNavItem[] = [
  { label: 'New chat', href: '/assistant', icon: Sparkles },
  { label: 'Search', href: '/assistant', icon: Search },
  { label: 'Conversations', href: '/assistant', icon: Bot },
  { label: 'Projects', href: '/assistant', icon: FolderKanban },
  { label: 'Apps', href: '/assistant/apps', icon: AppWindow },
  { label: 'Knowledge', href: '/assistant', icon: BookOpen },
  { label: 'Templates', href: '/assistant/apps/templates', icon: FileText },
  { label: 'Voice', href: '/assistant/voice', icon: Mic },
  { label: 'Profile', href: '/assistant/profile', icon: UserRound },
  { label: 'Settings', href: '/assistant/settings', icon: Settings }
]

export const assistantApps: AssistantApp[] = [
  { slug: 'connect', name: 'IndiCare Connect', description: 'Teams-style spaces, channels, DMs, meetings and announcement rooms for standalone collaboration.', route: '/assistant/apps/connect', status: 'foundation' },
  { slug: 'magic-notes', name: 'Magic Notes by IndiCare', description: 'Record, dictate, transcribe, summarise, extract actions and create professional notes.', route: '/assistant/apps/magic-notes', status: 'foundation' },
  { slug: 'docs', name: 'IndiCare Docs', description: 'Care-native word processor for Ofsted-ready documents, templates, drafting and exports.', route: '/assistant/apps/docs', status: 'foundation' },
  { slug: 'reports', name: 'Report Generator', description: 'Generate report drafts from uploaded or pasted source material with evidence gaps and action plans.', route: '/assistant/apps/reports', status: 'foundation' },
  { slug: 'templates', name: 'Templates', description: 'Reusable care-sector templates for notes, reports, policies, letters and plans.', route: '/assistant/apps/templates', status: 'foundation' },
  { slug: 'policies', name: 'Policy Writer', description: 'Policy and procedure drafting workspace with references and review controls.', route: '/assistant/apps/policies', status: 'foundation' },
  { slug: 'meetings', name: 'Meeting Notes', description: 'Meeting summaries, decisions, action extraction and follow-up drafting.', route: '/assistant/apps/meetings', status: 'foundation' },
  { slug: 'voice', name: 'Voice Studio', description: 'Standalone voice mode, captions and Orb-style glowing visual for general and sector support.', route: '/assistant/voice', status: 'foundation' }
]

export const documentTypes = [
  'Reg 44',
  'Reg 45',
  'LAC review',
  'Supervision',
  'Impact risk assessment',
  'Placement plan',
  'Missing episode review',
  'Incident analysis',
  'Policy',
  'Staff memo',
  'Professional letter'
]

export const appIcons = {
  connect: AppWindow,
  'magic-notes': FileAudio,
  docs: PenLine,
  reports: FileText,
  templates: FileText,
  policies: BookOpen,
  meetings: Bot,
  voice: Mic
}
