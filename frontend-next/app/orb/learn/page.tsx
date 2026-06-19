import { redirect } from 'next/navigation'

/** Legacy alias — learning guidance lives in Help & Safety and Chat. */
export default function OrbLearnPage() {
  redirect('/orb')
}
