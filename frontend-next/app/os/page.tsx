import { OsHomeClient } from '@/components/os/os-home-client'
import { getServerOsYoungPeople } from '@/lib/os-api/server-workspaces'

export default async function OsEntryPage() {
  const peopleResult = await getServerOsYoungPeople()
  return <OsHomeClient initialPeople={peopleResult.data} />
}
