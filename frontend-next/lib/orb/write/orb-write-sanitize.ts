/** Strip unsafe tags/attributes from contenteditable HTML before save/export. */
const BLOCKED_TAGS = /<\/?(script|iframe|object|embed|link|meta|style|form|input|button)[^>]*>/gi
const ON_ATTR = /\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi
const JS_HREF = /\shref\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi

export function sanitizeOrbWriteHtml(html: string): string {
  if (!html || !html.includes('<')) return html
  return html
    .replace(BLOCKED_TAGS, '')
    .replace(ON_ATTR, '')
    .replace(JS_HREF, '')
}
