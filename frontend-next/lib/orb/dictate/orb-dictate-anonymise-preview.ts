import { anonymiseText, type OrbDictateParticipant } from '@/lib/orb/dictate/orb-dictate-speaker'

export type OrbDictateAnonymisePreset =
  | 'young_person'
  | 'staff_role'
  | 'participant_role'
  | 'initials'
  | 'custom'

export type OrbDictateAnonymisePreview = {
  preset: OrbDictateAnonymisePreset
  previewText: string
  replacements: { from: string; to: string }[]
}

export function buildAnonymisePreview(
  text: string,
  participants: OrbDictateParticipant[],
  preset: OrbDictateAnonymisePreset,
  customReplacements?: { from: string; to: string }[]
): OrbDictateAnonymisePreview {
  const replacements: { from: string; to: string }[] = []

  if (preset === 'young_person' || preset === 'staff_role' || preset === 'participant_role') {
    for (const p of participants) {
      if (!p.name?.trim()) continue
      const role = p.role?.trim() || 'participant'
      const to =
        preset === 'young_person'
          ? /child|young person|yp/i.test(role)
            ? 'young person'
            : role
          : preset === 'staff_role'
            ? role
            : role
      replacements.push({ from: p.name.trim(), to })
    }
  }

  if (preset === 'initials') {
    for (const p of participants) {
      if (!p.name?.trim()) continue
      const initials =
        p.initials?.trim() ||
        p.name
          .split(/\s+/)
          .map((part) => part[0])
          .join('')
          .toUpperCase()
      replacements.push({ from: p.name.trim(), to: initials || 'Initials' })
    }
  }

  if (preset === 'custom' && customReplacements?.length) {
    replacements.push(...customReplacements)
  }

  let previewText = text
  if (preset === 'staff_role' || preset === 'participant_role' || preset === 'young_person') {
    previewText = anonymiseText(text, participants)
    if (preset === 'young_person') {
      for (const p of participants) {
        if (p.name && /child|young person/i.test(p.role || '')) {
          previewText = previewText.split(p.name).join('young person')
        }
      }
    }
  } else {
    for (const { from, to } of replacements) {
      previewText = previewText.split(from).join(to)
    }
  }

  return { preset, previewText, replacements }
}
