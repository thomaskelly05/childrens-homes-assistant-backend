import { notFound } from 'next/navigation'

import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderTeamRolePage } from '@/components/founder/founder-team-role-page'
import { isValidStaffAgentId } from '@/lib/founder/team'

type PageProps = {
  params: Promise<{ role: string }>
}

export default async function Page({ params }: PageProps) {
  const { role } = await params
  if (!isValidStaffAgentId(role)) notFound()

  return (
    <FounderGuard>
      <FounderTeamRolePage roleId={role} />
    </FounderGuard>
  )
}
