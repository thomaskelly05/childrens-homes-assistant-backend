import { OsHomeClient } from '@/components/os/os-home-client'
import { getServerOsYoungPeople } from '@/lib/os-api/server-workspaces'

/** Canonical live IndiCare OS entry. Render builds from frontend-next. */
export default async function HomePage() {
  const peopleResult = await getServerOsYoungPeople()
  return <OsHomeClient initialPeople={peopleResult.data} />
}
