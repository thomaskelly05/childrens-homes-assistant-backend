import { redirect } from 'next/navigation'

/** Canonical app.indicare.co.uk entry — ORB Residential front door. */
export default function HomePage() {
  redirect('/orb')
}
