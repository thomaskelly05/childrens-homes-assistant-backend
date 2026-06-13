import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  orbWriteBodyLooksLikeMarkdownTemplate,
  orbWriteBodyToMobileNotepadHtml
} from './orb-write-mobile-body.ts'

describe('orbWriteBodyToMobileNotepadHtml', () => {
  it('converts markdown section headings and italic placeholders to notepad HTML', () => {
    const input = `## Summary

*Brief overview of the situation or note.*

## What was observed or shared

*Factual account without judgement.*`

    const html = orbWriteBodyToMobileNotepadHtml(input)
    assert.match(html, /<h2>Summary<\/h2>/)
    assert.match(html, /Brief overview of the situation or note\./)
    assert.doesNotMatch(html, /## Summary/)
    assert.doesNotMatch(html, /\*Brief overview/)
    assert.match(html, /data-orb-write-placeholder="true"/)
  })

  it('leaves existing HTML unchanged', () => {
    const input = '<h2>Summary</h2><p>Already formatted</p>'
    assert.equal(orbWriteBodyToMobileNotepadHtml(input), input)
  })

  it('detects markdown template bodies', () => {
    assert.equal(orbWriteBodyLooksLikeMarkdownTemplate('## Summary\n\n*Hint*\n'), true)
    assert.equal(orbWriteBodyLooksLikeMarkdownTemplate('<h2>Summary</h2>'), false)
  })
})
