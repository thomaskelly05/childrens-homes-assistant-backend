import { OsHomeClient } from '@/components/os/os-home-client'
import { getServerOsYoungPeople } from '@/lib/os-api/server-workspaces'

/** Child-first IndiCare OS entry — same experience as /os */
export default async function HomePage() {
  const peopleResult = await getServerOsYoungPeople()
  return <OsHomeClient initialPeople={peopleResult.data} />
}
