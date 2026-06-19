import { redirect } from 'next/navigation'

export default function OrbReviewPage() {
  redirect('/orb?station=orb_write')
}
