import { describe, expect, it } from 'vitest'
import { getZone, zoneStages, zoneTitle } from '../../curriculum'
import { isZoneSleeping, nextStageToPlay, stagePicture, stageVoice, zoneNameVoice, zoneWelcomeVoice } from '../listenNav'
import { voiceText } from '../../voice/registry'

/**
 * Word Reef, Writing Workshop and Counting Towers for 1st grade (phase 2b),
 * found and played without reading: the zone's 1st-grade name and welcome are
 * said (Word Reef has a name of its own, the other two keep kindergarten's),
 * each stage button has a picture of its own and says its title, and the hand
 * points at the first stage. Kindergarten hears exactly what it did before.
 */
const ZONES = ['reading-reef', 'writing-workshop', 'tower-battlefront']

/** Unicode 9 or older, one symbol (a text-default symbol may carry U+FE0F). */
function oldEmoji(e: string): boolean {
  const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
  if (cps.length !== 1) return false
  const cp = cps[0]
  return cp < 0x1f6d3 || (cp >= 0x1f910 && cp <= 0x1f91e) || (cp >= 0x1f940 && cp <= 0x1f94b) || (cp >= 0x1f980 && cp <= 0x1f991)
}

describe('the 1st-grade zones on the map and their pages', () => {
  it.each(ZONES)('%s: its 1st-grade name and welcome are said; kindergarten’s unchanged', (id) => {
    const zone = getZone(id)!
    const title = zoneTitle(zone, 1)
    expect(isZoneSleeping(zone, 1)).toBe(false)
    expect(voiceText(zoneNameVoice(id, 1)!)).toBe(`${title}!`)
    expect(voiceText(zoneWelcomeVoice(id, 1))).toBe(`${title}! Tap a star to play!`)
    expect(voiceText(zoneNameVoice(id, 0)!)).toBe(`${zoneTitle(zone, 0)}!`)
  })

  it('Word Reef is "Word Reef" for 1st grade, still "Letter Reef" for kindergarten', () => {
    const reef = getZone('reading-reef')!
    expect(zoneTitle(reef, 1)).toBe('Word Reef')
    expect(zoneNameVoice('reading-reef', 1)).toEqual({ line: 'k-nav/name-g1-reading-reef' })
    expect(voiceText(zoneNameVoice('reading-reef', 0)!)).toBe('Letter Reef!')
    expect(zoneTitle(getZone('writing-workshop')!, 1)).toBe('Writing Workshop')
    expect(zoneTitle(getZone('tower-battlefront')!, 1)).toBe('Counting Towers')
  })

  it.each(ZONES)('%s: each stage button has its own picture and says its title; the hand points at the first', (id) => {
    const zone = getZone(id)!
    const set = zoneStages(zone, 1)
    const pics = set.map((s) => stagePicture(s))
    for (const [i, p] of pics.entries()) {
      expect(p, set[i].id).not.toMatch(/^[💡⚡🏆⭐]$/u)
      expect(oldEmoji(p), `${set[i].id} ${p}`).toBe(true)
    }
    expect(new Set(pics).size).toBe(pics.length)
    for (const s of set) expect(voiceText(stageVoice(s.id)!), s.id).toBe(/[?!]$/.test(s.title) ? s.title : `${s.title}!`)
    expect(nextStageToPlay(zone, undefined, 1)?.id).toBe(set[0].id)
  })
})
