import { handleLearningLoopBenchmarkBankGet } from '@/lib/founder/learning-loop/learning-loop-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return handleLearningLoopBenchmarkBankGet()
}
