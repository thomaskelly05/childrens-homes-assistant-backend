import { redirect } from 'next/navigation'

/** Legacy alias — projects live in the /orb sidebar workspace */
export default function OrbProjectsPage() {
  redirect('/orb')
}
