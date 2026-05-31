export type OrbKnowledgeBuiltinTab =
  | 'official'
  | 'inspection'
  | 'safeguarding'
  | 'learning'
  | 'templates'
  | 'uploaded'
  | 'saved'

export type OrbKnowledgeBuiltinResource = {
  id: string
  title: string
  sourceType: string
  status: 'built-in' | 'official' | 'needs_connection'
  tab: Exclude<OrbKnowledgeBuiltinTab, 'uploaded' | 'saved'>
  description?: string
}

export const ORB_KNOWLEDGE_BUILTIN_TABS: { id: OrbKnowledgeBuiltinTab; label: string }[] = [
  { id: 'official', label: 'Official guidance' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'safeguarding', label: 'Safeguarding' },
  { id: 'learning', label: 'Learning reviews' },
  { id: 'templates', label: 'Templates' },
  { id: 'uploaded', label: 'Uploaded documents' },
  { id: 'saved', label: 'Saved sources' }
]

function res(
  id: string,
  title: string,
  sourceType: string,
  tab: OrbKnowledgeBuiltinResource['tab'],
  status: OrbKnowledgeBuiltinResource['status'] = 'built-in',
  description?: string
): OrbKnowledgeBuiltinResource {
  return { id, title, sourceType, tab, status, description }
}

export const ORB_KNOWLEDGE_BUILTIN_RESOURCES: OrbKnowledgeBuiltinResource[] = [
  res('off-regs', "Children's Homes Regulations 2015", 'Legislation', 'official', 'official'),
  res(
    'off-guide',
    "Guide to the Children's Homes Regulations including the Quality Standards",
    'Statutory guidance',
    'official',
    'official'
  ),
  res('off-sccif', "SCCIF: children's homes", 'Inspection framework', 'official', 'official'),
  res('off-wt', 'Working Together to Safeguard Children', 'Statutory guidance', 'official', 'official'),
  res('off-kcsie', 'Keeping Children Safe in Education (where relevant)', 'Statutory guidance', 'official', 'built-in'),
  res(
    'off-cpp',
    'Care Planning, Placement and Case Review statutory guidance',
    'Statutory guidance',
    'official',
    'official'
  ),
  res('insp-ch', "Ofsted children's homes inspection framework", 'Inspection framework', 'inspection', 'official'),
  res('insp-sccif', 'Ofsted social care common inspection framework', 'Inspection framework', 'inspection', 'official'),
  res('insp-r44', 'Reg 44 / Reg 45 evidence support', 'Regulatory', 'inspection', 'built-in'),
  res('insp-checklist', 'Inspection readiness checklist', 'Practice tool', 'inspection', 'built-in'),
  res('sg-mfc', 'Missing from care', 'Safeguarding guidance', 'safeguarding', 'built-in'),
  res('sg-exploit', 'Child exploitation', 'Safeguarding guidance', 'safeguarding', 'built-in'),
  res('sg-contextual', 'Contextual safeguarding', 'Safeguarding guidance', 'safeguarding', 'built-in'),
  res('sg-lado', 'Allegations / LADO', 'Safeguarding guidance', 'safeguarding', 'built-in'),
  res('sg-recruitment', 'Safer recruitment', 'Safeguarding guidance', 'safeguarding', 'built-in'),
  res('sg-medication', 'Medication / health safeguarding', 'Safeguarding guidance', 'safeguarding', 'built-in'),
  res('lr-cspr', 'Child safeguarding practice review learning', 'Learning review', 'learning', 'built-in'),
  res('lr-scr', 'Serious case review learning themes', 'Learning review', 'learning', 'built-in'),
  res('lr-curiosity', 'Professional curiosity', 'Practice guidance', 'learning', 'built-in'),
  res('lr-recording', 'Recording and information sharing', 'Practice guidance', 'learning', 'built-in'),
  res('lr-multi', 'Multi-agency working', 'Practice guidance', 'learning', 'built-in'),
  res('tpl-recording', 'Recording standards for residential care', 'Template pack', 'templates', 'built-in'),
  res('tpl-safeguarding', 'Safeguarding templates', 'Template pack', 'templates', 'built-in'),
  res('tpl-inspection', 'Inspection evidence templates', 'Template pack', 'templates', 'built-in')
]

export function builtinResourcesForTab(tab: OrbKnowledgeBuiltinTab): OrbKnowledgeBuiltinResource[] {
  if (tab === 'uploaded' || tab === 'saved') return []
  return ORB_KNOWLEDGE_BUILTIN_RESOURCES.filter((r) => r.tab === tab)
}

export function askOrbAboutResourcePrompt(title: string): string {
  return `Tell me about ${title} in the context of residential children's homes practice. What should a Registered Manager and staff team know?`
}
