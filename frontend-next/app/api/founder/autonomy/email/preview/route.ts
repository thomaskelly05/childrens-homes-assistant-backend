import { handleAutonomyEmailPreviewGet, handleAutonomyEmailPreviewPost } from '@/lib/founder/autonomy/autonomy-api'

export async function GET() {
  return handleAutonomyEmailPreviewGet()
}

export async function POST(request: Request) {
  return handleAutonomyEmailPreviewPost(request)
}
