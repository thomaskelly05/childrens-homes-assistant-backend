/** Strip markdown and UI noise before browser speechSynthesis. */

export function stripMarkdownForSpeech(content: string): string {
  let text = content.trim()
  if (!text) return ''

  text = text.replace(/```[\s\S]*?```/g, ' ')
  text = text.replace(/`([^`]+)`/g, '$1')
  text = text.replace(/^#{1,6}\s+/gm, '')
  text = text.replace(/^\s*[-*+]\s+\[[ xX]\]\s*/gm, '')
  text = text.replace(/^\s*[-*+]\s+/gm, '')
  text = text.replace(/^\s*\d+\.\s+/gm, '')
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  text = text.replace(/\n+Sources\s*\/\s*basis[\s\S]*$/i, '')
  text = text.replace(/\n+_{2,}\n[\s\S]*$/i, '')
  text = text.replace(/\s+/g, ' ').trim()
  return text
}
