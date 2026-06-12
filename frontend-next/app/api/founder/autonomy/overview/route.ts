import { handleAutonomyOverviewGet } from '@/lib/founder/autonomy/autonomy-api'

export async function GET() {
  return handleAutonomyOverviewGet()
}
