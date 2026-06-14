import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const REG_44_ACTION_PLAN_TABLE = `| Action | Why | Owner | Priority | Source basis |
| --- | --- | --- | --- | --- |
| Conduct a comprehensive review of leadership oversight | To ensure compliance with Reg 13 | Registered Manager | High | [Reg 13] Leadership and management standard |
| Schedule staff supervision focused on recording quality | To strengthen defensible practice | Deputy Manager | Medium | Internal practice knowledge |`

describe('ORB mobile-safe markdown tables', () => {
  it('markdown table renders inside data-orb-table-scroll wrapper', () => {
    const markdown = readComponent('components/orb-standalone/orb-markdown-answer.tsx')
    assert.match(markdown, /data-orb-table-scroll/)
    assert.match(markdown, /orb-md-table-wrap/)
    assert.match(markdown, /Scroll to view full table/)
    assert.doesNotMatch(markdown, /w-full min-w-\[16rem\]/)
  })

  it('mobile CSS enables horizontal table scroll without letter-break collapse', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    const desktopCss = readComponent('app/orb/orb-desktop.css')
    assert.match(mobileCss, /\[data-orb-table-scroll\]/)
    assert.match(mobileCss, /overflow-x:\s*auto/)
    assert.match(mobileCss, /min-width:\s*max-content/)
    assert.match(mobileCss, /word-break:\s*normal/)
    assert.match(desktopCss, /overflow-wrap:\s*normal/)
    assert.match(desktopCss, /word-break:\s*normal/)
    assert.match(desktopCss, /min-width:\s*max-content/)
  })

  it('table cells do not use word-break break-all in route CSS', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    const desktopCss = readComponent('app/orb/orb-desktop.css')
    assert.doesNotMatch(mobileCss, /orb-md-table[\s\S]*break-all/)
    assert.doesNotMatch(desktopCss, /orb-md-table[\s\S]*break-all/)
  })

  it('Reg 44 action plan fixture retains readable column headers', () => {
    const headers = REG_44_ACTION_PLAN_TABLE.split('\n')[0]
    for (const label of ['Action', 'Why', 'Owner', 'Priority', 'Source basis']) {
      assert.match(headers, new RegExp(label))
    }
    assert.ok(REG_44_ACTION_PLAN_TABLE.includes('Conduct a comprehensive review'))
  })

  it('desktop table styles remain defined', () => {
    const desktopCss = readComponent('app/orb/orb-desktop.css')
    assert.match(desktopCss, /\.orb-markdown-answer \.orb-md-table/)
    assert.match(desktopCss, /\.orb-markdown-answer \.orb-md-th/)
    assert.match(desktopCss, /border-collapse/)
  })

  it('dark mode table border contrast is preserved', () => {
    const desktopCss = readComponent('app/orb/orb-desktop.css')
    assert.match(desktopCss, /html\[data-orb-theme='dark'\][\s\S]*orb-md-th/)
    assert.match(desktopCss, /rgba\(255,\s*255,\s*255,\s*0\.12\)/)
  })
})

describe('ORB mobile output guidance and chat latency', () => {
  it('ORB output discipline includes mobile-friendly table/card instruction', () => {
    const prompts = readFileSync(join(root, '../assistant/prompts.py'), 'utf8')
    assert.match(prompts, /Where the output may be read on mobile/)
    assert.match(prompts, /action cards/)
    assert.match(prompts, /3–4 where possible/)
  })

  it('fast opening includes Reg 44 / action plan acknowledgement', () => {
    const fastOpening = readFileSync(join(root, '../services/orb_fast_opening_service.py'), 'utf8')
    assert.match(fastOpening, /action plan|reg\s\*44/i)
    assert.match(fastOpening, /child-centred action plan/)
  })

  it('stream status can show structuring message for action plans', () => {
    const status = readFileSync(join(root, '../services/orb_stream_status_service.py'), 'utf8')
    assert.match(status, /Structuring this safely/)
    assert.match(status, /message: str \| None = None/)
  })

  it('frontend shows immediate thinking state before async attachment work', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const sendStart = companion.indexOf('const sendMessage = useCallback')
    assert.ok(sendStart >= 0)
    const sendBlock = companion.slice(sendStart)
    const thinkingIndex = sendBlock.indexOf("markOrbChatLatency('thinking_visible')")
    const imageIndex = sendBlock.indexOf('readComposerFileAsDataUrl(item.file)')
    assert.ok(thinkingIndex > 0)
    assert.ok(imageIndex > thinkingIndex)
    assert.match(companion, /setPending\(true\)/)
    assert.match(companion, /ORB is thinking/)
  })

  it('chat latency instrumentation covers send through first token', () => {
    const latency = readComponent('lib/orb/orb-chat-latency.ts')
    const client = readComponent('lib/orb/standalone-client.ts')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    for (const mark of [
      'send_clicked',
      'thinking_visible',
      'request_started',
      'first_byte',
      'first_token',
      'final_chunk',
      'render_complete'
    ]) {
      assert.match(latency, new RegExp(`'${mark}'`))
    }
    assert.match(client, /markOrbChatLatency\('first_byte'\)/)
    assert.match(client, /markOrbChatLatency\('first_token'\)/)
    assert.match(companion, /logOrbChatLatencySnapshot/)
  })

  it('front-door verdict uses brief positive-session cache TTL', () => {
    const verdict = readComponent('lib/orb/orb-front-door-verdict-client.ts')
    assert.match(verdict, /VERDICT_CACHE_MS/)
    assert.match(verdict, /verdictCacheFresh/)
    assert.match(verdict, /payload\.verdict === 'ready'/)
  })
})
