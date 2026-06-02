import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB ChatGPT UI structure', () => {
  it('sidebar uses premium section structure (Core, Intelligence, Workspace, Profiles)', () => {
    const source = readComponent('components/orb-standalone/orb-standalone-sidebar.tsx')
    for (const section of ['Core', 'Intelligence', 'Workspace', 'Profiles']) {
      assert.match(source, new RegExp(`title="${section}"`))
    }
    for (const label of ['New chat', 'Search chats', 'Library', 'Agents', 'Deep research', 'Tools']) {
      assert.match(source, new RegExp(label))
    }
    assert.match(source, /Conversations/)
    assert.doesNotMatch(source, /title="Apps"/)
  })

  it('care companion applies light theme markers by default', () => {
    const source = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(source, /data-orb-theme=\{effectiveTheme\}/)
    assert.match(source, /effectiveTheme = resolvedTheme/)
    assert.match(source, /data-orb-light-ui-build/)
    assert.match(source, /useOrbAppearance/)
    assert.match(source, /personalisedEmptyHeading/)
    assert.match(source, /OrbUserMessageBubble/)
    assert.match(source, /editMessageId/)
    assert.match(source, /OrbHelpPanel/)
    assert.match(source, /OrbVoiceSettingsPanel/)
  })

  it('orb layout bootstraps light theme on html before hydration', () => {
    const layout = readComponent('app/orb/layout.tsx')
    assert.match(layout, /ORB_APPEARANCE_BOOTSTRAP_SCRIPT/)
    assert.match(layout, /orb-appearance-bootstrap/)
    assert.match(layout, /orb-desktop\.css/)
    assert.match(layout, /orb-mobile\.css/)
    assert.match(layout, /data-orb-light-ui-build/)
    assert.match(layout, /__ORB_LIGHT_UI_BUILD__/)
    assert.match(layout, /data-orb-cognition-routing-build/)
    assert.match(layout, /__ORB_COGNITION_ROUTING_BUILD__/)
    assert.match(layout, /ORB_COGNITION_ROUTING_BUILD/)
    const build = readComponent('lib/orb/orb-cognition-routing-build.ts')
    assert.match(build, /1346/)
  })

  it('globals and route CSS ship ChatGPT-light build marker and hue pulse classes', () => {
    const globals = readComponent('app/globals.css')
    const routeCss = readComponent('app/orb/orb-desktop.css')
    assert.match(globals, /orb-chatgpt-light-build-marker-1338/)
    assert.match(routeCss, /orb-chatgpt-light-build-marker-1338/)
    assert.match(globals, /orb-hue-response-pulse|orb-response-active/)
    assert.match(routeCss, /orb-composer-answering|orb-assistant-thinking-mark/)
    assert.match(routeCss, /orb-hue-text|orb-theme-light|html\[data-orb-theme=light\]/)
    assert.match(globals, /#009dff[\s\S]*#00b8ff[\s\S]*#38bdf8/)
  })

  it('citation chips use readable light-mode styling', () => {
    const citation = readComponent('components/orb-standalone/orb-inline-citation.tsx')
    const routeCss = readComponent('app/orb/orb-desktop.css')
    assert.match(citation, /orb-citation-chip-light/)
    assert.match(routeCss, /#0284c7/)
    assert.match(routeCss, /#075985/)
    assert.match(routeCss, /font-weight:\s*700/)
    assert.match(routeCss, /orb-action-chip/)
  })

  it('active chat hides composer suggestion chips (starters only on empty state)', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /suggestions=\{undefined\}/)
    assert.match(companion, /data-orb-starter-cards/)
    assert.match(companion, /contextualSuggestedReplies/)
    assert.doesNotMatch(companion, /OrbSmartSuggestions/)
  })

  it('uses near-bottom scroll container for streaming', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /scrollContainerRef/)
    assert.match(companion, /data-orb-chat-scroll-container/)
    assert.match(companion, /isNearBottomRef/)
  })

  it('urgent safeguarding banner is context gated', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-safeguarding-urgent-banner/)
    assert.match(companion, /safeguardingBannerTextFromMessages/)
  })

  it('header does not duplicate full sidebar controls', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /data-orb-header-tools/)
    assert.doesNotMatch(companion, /data-orb-header-settings/)
    assert.match(companion, /data-orb-header-privacy/)
    assert.match(companion, /data-orb-header-profile/)
  })

  it('composer keeps send handler and Ask anything placeholder path', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-testid="orb-standalone-send-clickable"/)
    assert.match(composer, /Ask anything/)
    assert.match(composer, /type="submit"/)
    assert.match(composer, /orb-composer-answering/)
    assert.match(composer, /data-orb-composer-stop-generating/)
    assert.match(composer, /onStopGenerating/)
  })

  it('care companion wires stop generation and suggested reply chips', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /handleStopGeneration/)
    assert.match(companion, /OrbSuggestedReplyChips/)
    assert.match(companion, /OrbAskAboutThisChips/)
    assert.match(companion, /requestAbortRef/)
  })

  it('response pulse ties to answering state on layout', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-response-active/)
    assert.match(companion, /answering=\{isAnswering\}/)
  })

  it('hue branding components exist', () => {
    const hue = readComponent('components/orb-standalone/orb-hue-logo.tsx')
    assert.match(hue, /orb-hue-text/)
    assert.match(hue, /orb-electric-text/)
    assert.match(hue, /orb-hue-response-pulse/)
    assert.match(hue, /Powered by IndiCare/)
  })

  it('does not auto-enable microphone in care companion', () => {
    const source = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(source, /getUserMedia\(\)/)
    assert.match(source, /STANDALONE_ORB_VOICE_CAPTURE_ENABLED/)
  })

  it('help panel contains safeguarding boundary text', () => {
    const help = readComponent('components/orb-standalone/orb-help-panel.tsx')
    assert.match(help, /Using ORB/)
    assert.match(help, /does not access IndiCare OS records/)
    assert.match(help, /immediate risk/)
  })

  it('settings panel has voice, chat and privacy sections', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /data-orb-settings-section=\{section\.id\}/)
    assert.match(settings, /id: 'voice'/)
    assert.match(settings, /id: 'chat'/)
    assert.match(settings, /id: 'privacy'/)
    assert.match(settings, /ORB Residential does not access IndiCare OS/)
  })

  it('scroll-to-bottom fab is wired in care companion', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbScrollToBottomFab/)
    assert.match(readComponent('components/orb-standalone/orb-scroll-to-bottom-fab.tsx'), /data-orb-scroll-to-bottom/)
  })

  it('tools panel groups documents practice shift oversight research', () => {
    const tools = readComponent('components/orb-standalone/orb-tools-panel.tsx')
    assert.match(tools, /Documents/)
    assert.match(tools, /Practice/)
    assert.match(tools, /Shift/)
    assert.match(tools, /Oversight/)
    assert.match(tools, /Research/)
    assert.match(tools, /disabled=\{disabled\}/)
  })

  it('voice settings support auto-speak and per-message speakAloud', () => {
    const voice = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    const panel = readComponent('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(voice, /pickBritishFemaleVoice/)
    assert.match(voice, /speakAloud/)
    assert.match(voice, /speechRate/)
    assert.match(panel, /data-orb-voice-auto-speak/)
    assert.match(panel, /Preview voice/)
  })

  it('response action bar includes regenerate copy and ORB follow-up actions', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(assistant, /Regenerate/)
    assert.match(assistant, /data-orb-response-action-bar/)
    assert.match(assistant, /data-orb-response-actions/)
    assert.match(assistant, /Copy/)
    assert.match(assistant, /What am I missing/)
    assert.match(assistant, /onOrbFollowUp/)
    assert.match(companion, /handleOrbFollowUp/)
    assert.match(assistant, /data-orb-action-more-menu/)
    assert.match(assistant, /label="More"/)
  })

  it('composer documents residential slash commands', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(composer, /data-orb-composer-slash-hint/)
    assert.match(composer, /\/whatamimissing/)
    assert.match(companion, /SLASH_MODE_COMMANDS/)
    assert.match(companion, /\/reg44/)
  })

  it('temporary chat boundary is exposed in header', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-header-temporary-chat/)
    assert.match(companion, /startTemporaryChat/)
    assert.match(companion, /skipPersonalisation/)
  })

  it('adult profile includes ChatGPT-style personalisation fields', () => {
    const store = readComponent('lib/orb/adult-profile-store.ts')
    const drawer = readComponent('components/orb-standalone/orb-adult-profile-drawer.tsx')
    assert.match(store, /preferredAnswerLength/)
    assert.match(store, /defaultLenses/)
    assert.match(store, /STANDALONE_PROFILE_BOUNDARY_NOTE/)
    assert.match(drawer, /data-orb-profile-boundary-note/)
    assert.match(drawer, /data-orb-profile-answer-length/)
    assert.match(drawer, /CANONICAL_ADULT_PROFILE_ROLES/)
  })

  it('new chat defaults to Ask ORB for auto-routing', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /createStandaloneChat\([^)]+'Ask ORB'\)/)
  })

  it('user message edit flow markers exist', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-message-edit-button/)
    assert.match(companion, /Save & submit/)
    assert.match(companion, /data-orb-edit-save/)
  })

  it('handles greetings locally before backend for signed-in and signed-out users', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /standaloneGreetingLocalAnswer\(trimmed\)/)
    assert.match(companion, /local_greeting_response/)
    const greetingIdx = companion.indexOf('standaloneGreetingLocalAnswer(trimmed)')
    const setPendingIdx = companion.indexOf('setPending(true)')
    assert.ok(greetingIdx >= 0 && setPendingIdx >= 0)
    assert.ok(greetingIdx < setPendingIdx, 'greeting must be resolved before pending/backend send')
  })

  it('clears in-flight streaming placeholders on send failure', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /replaceInFlightWithError/)
    assert.match(companion, /streamAbortRef\.current = null/)
  })

  it('error cards use high-contrast ORB classes', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    const desktopCss = readComponent('app/orb/orb-desktop.css')
    assert.match(companion, /orb-message-error-card/)
    assert.match(companion, /orb-message-error-card__body/)
    assert.match(desktopCss, /\.orb-message-error-card[\s\S]*#78350f/)
    assert.match(mobileCss, /\.orb-panel-overlay/)
  })

  it('mobile sidebar overlay covers full viewport without harsh grey strip', () => {
    const layout = readComponent('components/orb/orb-layout.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(layout, /orb-panel-overlay fixed inset-0/)
    assert.match(mobileCss, /width:\s*100vw/)
    assert.match(mobileCss, /height:\s*100dvh/)
  })
})
