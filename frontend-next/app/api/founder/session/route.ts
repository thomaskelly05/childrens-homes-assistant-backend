import { NextResponse } from 'next/server'

import { getRequestAuthProfile } from '@/lib/founder/auth/founder-session'
import { userHasFounderAccessFromProfile } from '@/lib/founder/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getRequestAuthProfile()
  if (!user) {
    return NextResponse.json({ authenticated: false, founder: false }, { status: 401 })
  }

  const founder = userHasFounderAccessFromProfile(user)
  return NextResponse.json({
    authenticated: true,
    founder,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  })
}
