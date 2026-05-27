import { redirect } from 'next/navigation'

/** Legacy duplicate OS entry — canonical home is `/`. */
export default function LegacyOsEntryRedirect() {
  redirect('/')
}
