import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderCompanyDepartmentsPage } from '@/components/founder/founder-company-departments-page'

export const metadata = {
  title: 'Company Departments | IndiCare Founder',
  robots: { index: false, follow: false }
}

export default function Page() {
  return (
    <FounderGuard>
      <FounderCompanyDepartmentsPage />
    </FounderGuard>
  )
}
