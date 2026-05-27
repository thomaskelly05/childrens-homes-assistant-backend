import { redirect } from 'next/navigation'

/** Legacy route — canonical LifeEcho workspace is /young-people/[id]/lifeecho */
export default async function LegacyChildLifeEchoRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/young-people/${id}/lifeecho`)
}
