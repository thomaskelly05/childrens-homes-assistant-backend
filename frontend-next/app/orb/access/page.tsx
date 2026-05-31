import { redirect } from 'next/navigation'

/** Legacy route — canonical billing is /orb/billing */
export default function OrbAccessRedirect() {
  redirect('/orb/billing')
}
