import { redirect } from 'next/navigation'

/** Legacy alias — canonical saved outputs station is /orb?station=saved */
export default function OrbOutputsPage() {
  redirect('/orb?station=saved')
}
