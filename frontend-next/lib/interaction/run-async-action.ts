'use client'

/**
 * Runs an async UI action with visible error feedback and guaranteed loading reset.
 */
export async function runAsyncAction<T>(options: {
  action: () => Promise<T>
  onError: (message: string) => void
  onStart?: () => void
  onFinally?: () => void
  fallbackMessage?: string
}): Promise<T | undefined> {
  const { action, onError, onStart, onFinally, fallbackMessage = 'That action could not complete. Please retry.' } = options
  onStart?.()
  try {
    return await action()
  } catch (error) {
    const message = error instanceof Error ? error.message : fallbackMessage
    onError(message)
    if (process.env.NODE_ENV === 'development') {
      console.error('[interaction]', error)
    }
    return undefined
  } finally {
    onFinally?.()
  }
}
