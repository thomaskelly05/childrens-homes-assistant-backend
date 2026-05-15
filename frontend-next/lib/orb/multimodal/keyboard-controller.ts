export const orbKeyboardShortcuts = {
  activate: 'Ctrl+Shift+Space',
  interrupt: 'Escape',
  captions: 'Ctrl+Shift+C',
  transcript: 'Ctrl+Shift+T'
} as const

export function isOrbActivationShortcut(event: KeyboardEvent) {
  return event.ctrlKey && event.shiftKey && event.code === 'Space'
}

