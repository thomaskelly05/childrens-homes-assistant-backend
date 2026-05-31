import type { Metadata } from 'next'

import { OsHomeClient } from '@/components/os/os-home-client'
import { getServerOsYoungPeople } from '@/lib/os-api/server-workspaces'

export const metadata: Metadata = {
  title: 'IndiCare OS',
  description: 'Children\'s home operational workspace — select a home and young person.'
}

/** IndiCare OS entry (preserved behind /os). */
export default async function OsEntryPage() {
  const peopleResult = await getServerOsYoungPeople()
  return <OsHomeClient initialPeople={peopleResult.data} />
}
