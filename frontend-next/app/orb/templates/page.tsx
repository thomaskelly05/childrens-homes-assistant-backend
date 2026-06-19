import { redirect } from 'next/navigation'

/** Legacy alias — templates support Dictate/Write workflows internally. */
export default function OrbTemplatesPage() {
  redirect('/orb?station=orb_dictate')
}
