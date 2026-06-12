import { handleAutonomyEmailSettingsPatch } from '@/lib/founder/autonomy/autonomy-api'

export async function PATCH(request: Request) {
  return handleAutonomyEmailSettingsPatch(request)
}
