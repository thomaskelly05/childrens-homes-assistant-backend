/**
 * Signed-out /orb responses — mirrors backend orb_local_response_service fast paths
 * so greetings and help work without a session. Real questions require ORB sign-in.
 */

const GREETING_RE =
  /^(hi|hello|hey|hiya|yo|cheers|good morning|good afternoon|good evening)(\s+there|\s+orb)?[!?.]*$/i

const THANKS_RE = /^(thanks|thank you|thankyou)(\s+you|\s+orb)?[!?.]*$/i

export const ORB_GREETING_HELLO_ANSWER = 'Hello — what would you like to work on?'
export const ORB_GREETING_THANKS_ANSWER = "You're welcome."

export const STANDALONE_ORB_GUEST_CAPABILITIES_ANSWER =
  "I'm ORB Care Companion on standalone /orb. I can help with recording quality, safeguarding thinking, Ofsted/SCCIF reflection, therapeutic interpretation, supervision prep, documents you upload, NVQ learning support, and general questions — without accessing live OS records. What would you like to work on?"

export const STANDALONE_ORB_SIGN_IN_REQUIRED_ANSWER =
  'Sign in to ORB Residential to ask regulatory and practice questions with full answers. Standalone ORB does not access IndiCare OS child, home or staff records — only what you type here.'

export const STANDALONE_ORB_SIGN_IN_PATH = '/orb/login?returnUrl=%2Forb'

export function isStandaloneGuestThanks(message: string): boolean {
  const text = message.trim()
  if (!text) return false
  return THANKS_RE.test(text)
}

export function isStandaloneGuestGreeting(message: string): boolean {
  const text = message.trim()
  if (!text) return false
  return GREETING_RE.test(text) || isStandaloneGuestThanks(text)
}

export function standaloneGreetingLocalAnswer(message: string): string | null {
  const text = message.trim()
  if (!text) return null
  if (isStandaloneGuestThanks(text)) return ORB_GREETING_THANKS_ANSWER
  if (GREETING_RE.test(text)) return ORB_GREETING_HELLO_ANSWER
  return null
}

export function isOrbMinimalTurn(options: {
  userMessage?: string | null
  assistantContent?: string | null
}): boolean {
  const user = (options.userMessage || '').trim()
  if (user && isStandaloneGuestGreeting(user)) return true
  const content = (options.assistantContent || '').trim()
  if (content === ORB_GREETING_HELLO_ANSWER || content === ORB_GREETING_THANKS_ANSWER) return true
  return false
}

export function isStandaloneGuestHelpIntent(message: string): boolean {
  const lower = message.trim().toLowerCase()
  if (!lower) return false
  if (isStandaloneGuestGreeting(lower)) return true
  if (/\b(what can you do|how can you help|what do you do|help)\b/.test(lower) && lower.split(/\s+/).length <= 14) {
    return true
  }
  if (/\b(data safety|protect my data|how is my data|privacy|is my data safe)\b/.test(lower)) return true
  if (/\b(how to use orb|how do i use orb|getting started)\b/.test(lower)) return true
  if (/\bstandalone boundary\b/.test(lower)) return true
  return false
}

export function tryStandaloneGuestLocalAnswer(message: string): string | null {
  const lower = message.trim().toLowerCase()
  if (!lower) return null

  const greetingAnswer = standaloneGreetingLocalAnswer(message)
  if (greetingAnswer) return greetingAnswer

  if (/\b(what can you do|how can you help|what do you do)\b/.test(lower) && lower.split(/\s+/).length <= 14) {
    return STANDALONE_ORB_GUEST_CAPABILITIES_ANSWER
  }

  if (/\b(data safety|protect my data|how is my data|privacy|is my data safe)\b/.test(lower)) {
    return `**How ORB protects your data (standalone /orb)**

- Standalone ORB does **not** access IndiCare OS child, home, staff, chronology or care records.
- ORB only uses what you type, upload, choose to save, or submit as feedback in standalone ORB.
- **Temporary chat** skips your saved ORB profile context for that conversation.
- Please avoid unnecessary personal details. Use initials or anonymised details where you can.

For permissioned operational context, use IndiCare OS ORB at /assistant/orb where your role allows.`
  }

  if (/\bstandalone boundary\b/.test(lower)) {
    return (
      'Standalone ORB at /orb uses only what you provide — typed messages, uploads, saved outputs and feedback. ' +
      'It cannot access IndiCare OS child, home, staff or chronology records.'
    )
  }

  if (/\b(how to use orb|how do i use orb|getting started)\b/.test(lower)) {
    return `**How to use standalone ORB**
1. Choose a mode (Ask ORB, Safeguarding, Ofsted Lens, recording support, etc.).
2. Type your question — use initials where you can.
3. Use **Copy**, **Save**, or follow-up chips under answers you want to keep.
4. Sign in for full regulatory and practice answers backed by ORB Residential.`
  }

  return null
}

export function standaloneOrbMessageNeedsSignIn(message: string): boolean {
  if (tryStandaloneGuestLocalAnswer(message)) return false
  const trimmed = message.trim()
  if (!trimmed) return false
  return true
}

export function isStandaloneOrbSignInPromptMessage(message: string): boolean {
  return (
    message.includes(STANDALONE_ORB_SIGN_IN_REQUIRED_ANSWER) ||
    /sign in to orb residential/i.test(message) ||
    /sign in to use orb/i.test(message)
  )
}
