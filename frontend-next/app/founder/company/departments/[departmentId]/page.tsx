import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderCompanyDepartmentDetailPage } from '@/components/founder/founder-company-department-detail-page'

export const metadata = {
  title: 'Department Detail | IndiCare Founder',
  robots: { index: false, follow: false }
}

type Props = { params: Promise<{ departmentId: string }> }

export default async function Page({ params }: Props) {
  const { departmentId } = await params
  return (
    <FounderGuard>
      <FounderCompanyDepartmentDetailPage departmentId={departmentId} />
    </FounderGuard>
  )
}
