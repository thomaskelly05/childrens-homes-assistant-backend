'use client'

import { useMemo, useState } from 'react'
import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  ORB_RESIDENTIAL_SKILLS,
  ORB_SKILL_CATEGORY_LABELS,
  type OrbSkillCategory,
  type OrbSkillDefinition
} from '@/lib/orb/orb-skills-catalog'

export function OrbSkillsPanel({
  open,
  onClose,
  onStartSkill,
  residentialSurface
}: {
  open: boolean
  onClose: () => void
  onStartSkill: (skill: OrbSkillDefinition) => void
  residentialSurface?: boolean
}) {
  const [query, setQuery] = useState('')
  const categories = Object.keys(ORB_SKILL_CATEGORY_LABELS) as OrbSkillCategory[]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ORB_RESIDENTIAL_SKILLS
    return ORB_RESIDENTIAL_SKILLS.filter(
      (skill) =>
        skill.title.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q) ||
        skill.categoryLabel.toLowerCase().includes(q)
    )
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<OrbSkillCategory, OrbSkillDefinition[]>()
    for (const skill of filtered) {
      const list = map.get(skill.category) ?? []
      list.push(skill)
      map.set(skill.category, list)
    }
    return categories
      .map((category) => ({ category, skills: map.get(category) ?? [] }))
      .filter((entry) => entry.skills.length > 0)
  }, [categories, filtered])

  return (
    <OrbStandalonePanelShell
      open={open}
      onClose={onClose}
      title="Skills"
      subtitle="Focused workflows for residential practice — start with a skill, then refine in chat."
      panelId="skills"
      {...orbStationShellProps(residentialSurface, 'wide')}
    >
      <div className="space-y-4 p-4 sm:p-5" data-orb-skills-panel>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills"
          className="w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
          data-orb-skills-search
        />
        {grouped.map(({ category, skills }) => (
          <section key={category} data-orb-skills-category={category}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--orb-muted)]">
              {ORB_SKILL_CATEGORY_LABELS[category]}
            </h3>
            <ul className="mt-2 grid gap-2">
              {skills.map((skill) => (
                <li key={skill.id}>
                  <div className="rounded-xl border border-[var(--orb-line)]/50 bg-white/[0.02] p-3">
                    <p className="text-sm font-medium text-[var(--orb-foreground)]">{skill.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--orb-muted)]">{skill.description}</p>
                    <button
                      type="button"
                      className="mt-3 rounded-full bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-500/25"
                      data-orb-skill-start={skill.id}
                      onClick={() => {
                        onStartSkill(skill)
                        onClose()
                      }}
                    >
                      Start
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </OrbStandalonePanelShell>
  )
}
