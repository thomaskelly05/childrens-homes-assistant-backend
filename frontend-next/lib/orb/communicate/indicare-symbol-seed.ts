/**
 * IndiCare Visual Language — internal placeholder symbol seed.
 * Original placeholders only; designed for future IndiCare symbol library integration.
 */

import type { VisualSymbol } from './orb-communicate-types.ts'

export const INDICARE_SYMBOL_SEED: VisualSymbol[] = [
  {
    id: 'feeling-worried',
    label: 'Worried',
    plainLanguage: 'I feel worried.',
    category: 'feeling',
    altText: 'Placeholder symbol for worried',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'feeling-angry',
    label: 'Angry',
    plainLanguage: 'I feel angry.',
    category: 'feeling',
    altText: 'Placeholder symbol for angry',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'feeling-sad',
    label: 'Sad',
    plainLanguage: 'I feel sad.',
    category: 'feeling',
    altText: 'Placeholder symbol for sad',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'feeling-happy',
    label: 'Happy',
    plainLanguage: 'I feel happy.',
    category: 'feeling',
    altText: 'Placeholder symbol for happy',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'action-stop',
    label: 'Stop',
    plainLanguage: 'Please stop.',
    category: 'action',
    altText: 'Placeholder symbol for stop',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'action-help',
    label: 'Help',
    plainLanguage: 'I need help.',
    category: 'action',
    altText: 'Placeholder symbol for help',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'response-yes',
    label: 'Yes',
    plainLanguage: 'Yes.',
    category: 'response',
    altText: 'Placeholder symbol for yes',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'response-no',
    label: 'No',
    plainLanguage: 'No.',
    category: 'response',
    altText: 'Placeholder symbol for no',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'time-wait',
    label: 'Wait',
    plainLanguage: 'I can wait.',
    category: 'time',
    altText: 'Placeholder symbol for wait',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'time-later',
    label: 'Later',
    plainLanguage: 'Not now — later.',
    category: 'time',
    altText: 'Placeholder symbol for later',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'person-staff',
    label: 'Staff',
    plainLanguage: 'A staff member I know.',
    category: 'person',
    altText: 'Placeholder symbol for staff',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'person-family',
    label: 'Family',
    plainLanguage: 'My family.',
    category: 'person',
    altText: 'Placeholder symbol for family',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'person-mum',
    label: 'Mum',
    plainLanguage: 'My mum.',
    category: 'person',
    altText: 'Placeholder symbol for mum',
    safeguardingSensitive: false,
    ageSuitability: 'child'
  },
  {
    id: 'person-dad',
    label: 'Dad',
    plainLanguage: 'My dad.',
    category: 'person',
    altText: 'Placeholder symbol for dad',
    safeguardingSensitive: false,
    ageSuitability: 'child'
  },
  {
    id: 'health-pain',
    label: 'Pain',
    plainLanguage: 'Something hurts.',
    category: 'health',
    altText: 'Placeholder symbol for pain',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'support-quiet-space',
    label: 'Quiet Space',
    plainLanguage: 'I need a quiet space.',
    category: 'support',
    altText: 'Placeholder symbol for quiet space',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'support-phone',
    label: 'Phone',
    plainLanguage: 'I can use the phone.',
    category: 'support',
    altText: 'Placeholder symbol for phone',
    safeguardingSensitive: false,
    ageSuitability: 'young_person'
  },
  {
    id: 'place-home',
    label: 'Home',
    plainLanguage: 'At home.',
    category: 'place',
    altText: 'Placeholder symbol for home',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'place-school',
    label: 'School',
    plainLanguage: 'At school.',
    category: 'place',
    altText: 'Placeholder symbol for school',
    safeguardingSensitive: false,
    ageSuitability: 'child'
  },
  {
    id: 'place-appointment',
    label: 'Appointment',
    plainLanguage: 'I have an appointment.',
    category: 'place',
    altText: 'Placeholder symbol for appointment',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'time-change',
    label: 'Change',
    plainLanguage: 'Something is changing.',
    category: 'time',
    altText: 'Placeholder symbol for change',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  },
  {
    id: 'time-finished',
    label: 'Finished',
    plainLanguage: 'This is finished.',
    category: 'time',
    altText: 'Placeholder symbol for finished',
    safeguardingSensitive: false,
    ageSuitability: 'all'
  }
]

export function findSymbolById(id: string): VisualSymbol | undefined {
  return INDICARE_SYMBOL_SEED.find((symbol) => symbol.id === id)
}

export function symbolsForCategories(
  categories: VisualSymbol['category'][],
  opts?: { safeguardingSensitive?: boolean; limit?: number }
): VisualSymbol[] {
  const limit = opts?.limit ?? INDICARE_SYMBOL_SEED.length
  return INDICARE_SYMBOL_SEED.filter((symbol) => {
    if (!categories.includes(symbol.category)) return false
    if (opts?.safeguardingSensitive === false && symbol.safeguardingSensitive) return false
    return true
  }).slice(0, limit)
}
