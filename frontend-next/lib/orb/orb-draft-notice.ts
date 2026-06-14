/** Shared draft/action notice styling — readable on light and dark residential themes. */
export const ORB_DRAFT_NOTICE_CLASS =
  'mx-3 mt-3 rounded-2xl border border-amber-400/40 bg-amber-50 px-4 py-2.5 text-sm font-medium leading-6 text-amber-950 shadow-sm md:mx-5 dark:border-amber-400/30 dark:bg-amber-950/50 dark:text-amber-100'

export const ORB_DRAFT_NOTICE_DATA_ATTR = 'data-orb-draft-notice'

/** Guard against unreadable pale-on-pale notice class strings. */
export function orbDraftNoticeHasReadableContrast(className: string): boolean {
  if (/\btext-amber-50\b/.test(className) && !/\btext-amber-9/.test(className)) return false
  return /\btext-amber-950\b/.test(className) || /\bdark:text-amber-100\b/.test(className)
}
