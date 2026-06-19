/**
 * ORB search surface registry — consistent placeholders, empty states and privacy boundaries.
 */

import {
  ORB_RECORDS_SEARCH_EMPTY,
  ORB_RECORDS_SEARCH_LABEL,
  ORB_RECORDS_SEARCH_PLACEHOLDER
} from './orb-user-facing-names.ts'

export type OrbSearchPrivacySensitivity = 'low' | 'medium' | 'high'

export type OrbSearchSurface = {
  id: string
  label: string
  placeholder: string
  source: 'client' | 'server' | 'hybrid'
  supportsGlobalSearch: boolean
  privacySensitivity: OrbSearchPrivacySensitivity
  emptyState: string
  dataAttr: string
}

export const ORB_SEARCH_SURFACES: OrbSearchSurface[] = [
  {
    id: 'chats',
    label: 'Chats',
    placeholder: 'Search chats…',
    source: 'client',
    supportsGlobalSearch: false,
    privacySensitivity: 'high',
    emptyState: 'No chats match your search.',
    dataAttr: 'data-orb-sidebar-search'
  },
  {
    id: 'saved_outputs',
    label: ORB_RECORDS_SEARCH_LABEL,
    placeholder: ORB_RECORDS_SEARCH_PLACEHOLDER,
    source: 'server',
    supportsGlobalSearch: false,
    privacySensitivity: 'high',
    emptyState: ORB_RECORDS_SEARCH_EMPTY,
    dataAttr: 'data-orb-premium-search'
  },
  {
    id: 'record_types',
    label: 'Record types',
    placeholder: 'Search templates and record types…',
    source: 'server',
    supportsGlobalSearch: false,
    privacySensitivity: 'medium',
    emptyState: 'No record types match your search.',
    dataAttr: 'data-orb-premium-search'
  },
  {
    id: 'documents_guidance',
    label: 'Documents & guidance',
    placeholder: 'Search guidance, home documents and uploads…',
    source: 'hybrid',
    supportsGlobalSearch: false,
    privacySensitivity: 'high',
    emptyState: 'No documents match your search.',
    dataAttr: 'data-orb-premium-search'
  },
  {
    id: 'uploaded_documents',
    label: 'Uploaded documents',
    placeholder: 'Search uploads…',
    source: 'server',
    supportsGlobalSearch: false,
    privacySensitivity: 'high',
    emptyState: 'No uploads match your search.',
    dataAttr: 'data-orb-premium-search'
  },
  {
    id: 'settings_help_privacy',
    label: 'Settings & privacy',
    placeholder: 'Search settings…',
    source: 'client',
    supportsGlobalSearch: false,
    privacySensitivity: 'low',
    emptyState: 'No settings match your search.',
    dataAttr: 'data-orb-settings-search'
  },
  {
    id: 'orb_write_drafts',
    label: 'ORB Write drafts',
    placeholder: 'Search drafts…',
    source: 'client',
    supportsGlobalSearch: false,
    privacySensitivity: 'medium',
    emptyState: 'No drafts match your search.',
    dataAttr: 'data-orb-premium-search'
  }
]

export const ORB_SEARCH_DEFAULT_PLACEHOLDER = 'Search…'

export function getOrbSearchSurface(id: string): OrbSearchSurface | undefined {
  return ORB_SEARCH_SURFACES.find((surface) => surface.id === id)
}

export function orbSearchSurfacesForGlobal(): OrbSearchSurface[] {
  return ORB_SEARCH_SURFACES.filter((surface) => surface.supportsGlobalSearch)
}
