const API_BASE = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_API_URL || ''

function residentialHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-ORB-Surface': 'orb_residential',
  }
}

export async function fetchOrbResidential<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...residentialHeaders(),
      ...(init?.headers || {}),
    },
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    throw Object.assign(new Error('ORB Residential request failed'), { status: response.status, detail })
  }
  return response.json() as Promise<T>
}
