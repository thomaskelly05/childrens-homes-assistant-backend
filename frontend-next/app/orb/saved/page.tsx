import { redirect } from 'next/navigation'

export default function OrbSavedPage() {
  redirect('/orb?station=saved')
}
