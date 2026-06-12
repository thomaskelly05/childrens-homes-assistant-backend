import { handleFinanceSnapshotPost } from '@/lib/founder/finance/finance-api'

export async function POST() {
  return handleFinanceSnapshotPost()
}
