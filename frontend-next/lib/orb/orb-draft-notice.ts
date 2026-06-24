/** Shared draft/action notice styling — readable on light and dark residential themes. */
export const ORB_DRAFT_NOTICE_CLASS =
  'mx-3 mt-3 rounded-2xl border-2 border-amber-500/70 bg-amber-100 px-4 py-2.5 text-sm font-semibold leading-6 text-amber-950 shadow-sm md:mx-5 dark:border-amber-400/55 dark:bg-amber-950/70 dark:text-amber-50'

export const ORB_DRAFT_NOTICE_DATA_ATTR = 'data-orb-draft-notice'

/** Guard against unreadable pale-on-pale notice class strings. */
export function orbDraftNoticeHasReadableContrast(className: string): boolean {
  if (/\btext-amber-50\b/.test(className) && !/\bdark:text-amber-50\b/.test(className)) return false
  if (/\btext-amber-100\b/.test(className) && !/\btext-amber-9/.test(className)) return false
  return /\btext-amber-950\b/.test(className) || /\bdark:text-amber-50\b/.test(className)
}
