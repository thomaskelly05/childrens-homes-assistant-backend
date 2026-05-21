const API_BASE = process.env.NEXT_PUBLIC_LIFEECHO_API ?? '/api/life-echo'

export async function fetchMemoryBox(childId: string) {
  const response = await fetch(
    `${API_BASE}/experience/${childId}/memory-box`,
    {
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    throw new Error('Failed to load LifeEcho memory box.')
  }

  return response.json()
}

export async function fetchUnifiedExperience(childId: string) {
  const response = await fetch(
    `${API_BASE}/experience/${childId}`,
    {
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    throw new Error('Failed to load LifeEcho experience.')
  }

  return response.json()
}
