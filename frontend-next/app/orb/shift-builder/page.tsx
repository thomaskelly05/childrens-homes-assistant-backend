import { redirect } from 'next/navigation'

/** Legacy alias — shift planning lives in Chat and Dictate. */
export default function OrbShiftBuilderPage() {
  redirect('/orb')
}
