import {
  handleLearningLoopAutonomySettingsGet,
  handleLearningLoopAutonomySettingsPost
} from '@/lib/founder/learning-loop/learning-loop-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return handleLearningLoopAutonomySettingsGet()
}

export async function POST(request: Request) {
  return handleLearningLoopAutonomySettingsPost(request)
}
