import { redirect } from 'next/navigation'

/** Deep link — `/orb/voice` opens Voice via station param on the main ORB shell. */
export default function OrbVoiceDeepLinkPage() {
  redirect('/orb?station=voice')
}
