import { describe, expect, it } from 'vitest'
import { VOICE_PACKS, fillTemplate, voiceText } from '../registry'
import { contentBand, experienceMode, isListenMode } from '../../lib/gradeBand'

describe('voice registry', () => {
  it('discovers the packs under ./packs', () => {
    expect(VOICE_PACKS.ui?.lines.tapToStart).toBe('Tap the star to start!')
  })

  it('resolves line text and rejects unknown lines', () => {
    expect(voiceText({ line: 'ui/greatJob' })).toBe('Great job!')
    expect(() => voiceText({ line: 'ui/nope' })).toThrow(/unknown voice line/)
    expect(() => voiceText({ template: 'ui/nope', slots: {} })).toThrow(/unknown voice template/)
  })

  it('fills template slots, keeping digits for captions', () => {
    expect(fillTemplate('Tap the group with {n} {thing}.', { n: 7, thing: 'apples' })).toBe('Tap the group with 7 apples.')
  })

  it('every pack line is clean caption text', () => {
    for (const pack of Object.values(VOICE_PACKS)) {
      for (const [id, text] of Object.entries(pack.lines)) {
        expect(text.trim(), `${pack.id}/${id}`).toBe(text)
        expect(text, `${pack.id}/${id}`).not.toMatch(/\s{2}|\{/)
      }
    }
  })
})

describe('grade bands', () => {
  it('maps grades to content bands and experience modes', () => {
    expect([0, 1, 2, 3, 4, 5].map(contentBand)).toEqual(['k1', 'k1', 'g24', 'g24', 'g24', 'g5'])
    expect([0, 1, 2, 3, 4, 5].map(experienceMode)).toEqual(['listen', 'listen', 'readHear', 'readHear', 'own', 'own'])
    expect(isListenMode(0) && isListenMode(1) && !isListenMode(2)).toBe(true)
  })
})
