import Link from 'next/link'

import { OrbResidentialHome } from '@/components/orb-residential/orb-residential-home'

export default function OrbPage() {
  return (
    <div className="space-y-6">
      <OrbResidentialHome />
      <nav className="grid gap-2 text-sm text-[#4B5563] sm:grid-cols-2">
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb/ask">
          Ask ORB
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb/shift-builder">
          Shift Builder
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb/outputs">
          Saved outputs
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb/projects">
          Saved projects
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb/onboarding">
          Personalise ORB
        </Link>
        <Link className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]" href="/orb/access">
          Premium access
        </Link>
      </nav>
    </div>
  )
}
