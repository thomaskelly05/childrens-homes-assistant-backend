import Link from 'next/link'

import { OrbResidentialHome } from '@/components/orb-residential/orb-residential-home'

export default function OrbResidentialPage() {
  return (
    <div className="space-y-6">
      <OrbResidentialHome />
      <nav className="grid gap-2 text-sm text-[#4B5563] sm:grid-cols-2">
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb-residential/ask">
          Ask ORB
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb-residential/shift-builder">
          Shift Builder
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb-residential/outputs">
          Saved outputs
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb-residential/projects">
          Saved projects
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb-residential/onboarding">
          Personalise ORB
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb-residential/access">
          Premium access
        </Link>
      </nav>
    </div>
  )
}
