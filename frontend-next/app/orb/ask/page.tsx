import { redirect } from 'next/navigation'

/** Legacy ask surface — canonical ORB chat is `/orb` only (Phase 1 convergence). */
export default function OrbAskPage() {
  redirect('/orb')
}
