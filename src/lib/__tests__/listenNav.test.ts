import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { curriculum, getZone, zoneTitle, type Stage } from '../../curriculum'
import {
  hasK1Set,
  isZoneSleeping,
  listenGrade,
  nextStageToPlay,
  stagePicture,
  stageVoice,
  zoneNameVoice,
  zoneWelcomeVoice,
} from '../listenNav'
import { npcGreeting, npcSleeping, npcTitle } from '../../world/listenWorld'
import { VOICE_PACKS, voiceText } from '../../voice/registry'
import { GRADE_LEVELS } from '../gradeTiers'

/*
 * Getting around without reading (K–1). The K–1 stage sets arrive with the
 * content work; these tests hang the pilot contract's sets on the real zones.
 */

const PILOT: Record<string, { title: string; stages: string[] }> = {
  'multiplication-mesa': { title: 'Counting Mesa', stages: ['k-count-1', 'k-count-parade', 'k-count-3'] },
  'geometry-grove': { title: 'Shape Grove', stages: ['k-shapes-1', 'k-shapes-2', 'k-shapes-3'] },
  'reading-reef': { title: 'Letter Reef', stages: ['k-letters-1', 'k-letters-2', 'k-letters-3'] },
}
const KINDS: Stage['kind'][] = ['concept', 'practice', 'mastery']
const kStage = (id: string, i: number): Stage => ({
  id,
  kind: KINDS[i],
  title: id,
  description: '',
  gameId: i === 1 && id === 'k-count-parade' ? 'critterParade' : 'listenPlay',
  providerConfig: { kind: 'multiplication', factorMin: 1, factorMax: 2 },
  starsToEarn: 3,
})
function withPilotSets() {
  for (const [zoneId, p] of Object.entries(PILOT)) getZone(zoneId)!.stagesByBand = { k1: p.stages.map(kStage) }
}
// Each test starts with no K–1 sets at all (whatever the build has), and the build's come back after.
const original = new Map(curriculum.zones.map((z) => [z, z.stagesByBand]))
beforeEach(() => {
  for (const z of curriculum.zones) delete z.stagesByBand
})
afterAll(() => {
  for (const [z, sets] of original) if (sets) z.stagesByBand = sets
})

describe('zones for a K–1 child', () => {
  it('K–1 titles for the pilot zones; every other grade (and zone) keeps its title', () => {
    for (const [zoneId, p] of Object.entries(PILOT)) {
      const zone = getZone(zoneId)!
      expect(zoneTitle(zone, 0)).toBe(p.title)
      expect(zoneTitle(zone, 1)).toBe(p.title)
      for (const g of [2, 3, 4, 5] as const) expect(zoneTitle(zone, g)).toBe(zone.title)
      expect(zoneTitle(zone, null)).toBe(zone.title)
    }
    expect(zoneTitle(getZone('division-dunes')!, 0)).toBe('Division Dunes')
  })

  it('a zone sleeps for K–1 until it has a K–1 stage set, and never for grades 2–5', () => {
    for (const zone of curriculum.zones) {
      expect(isZoneSleeping(zone, 0)).toBe(true)
      for (const g of [2, 3, 4, 5] as const) expect(isZoneSleeping(zone, g)).toBe(false)
    }
    withPilotSets()
    const open = curriculum.zones.filter((z) => !isZoneSleeping(z, 0)).map((z) => z.id)
    expect(open.sort()).toEqual(Object.keys(PILOT).sort())
    expect(curriculum.zones.filter((z) => isZoneSleeping(z, 1))).toHaveLength(9)
    expect(hasK1Set(getZone('multiplication-mesa')!)).toBe(true)
    expect(listenGrade(0) && listenGrade(1) && !listenGrade(2) && !listenGrade(null)).toBe(true)
  })

  it('the hand points at the next stage: the first open one with no star, then one short of its stars', () => {
    withPilotSets()
    const mesa = getZone('multiplication-mesa')!
    const stars = (m: Record<string, number>) => ({ stages: Object.fromEntries(Object.entries(m).map(([k, n]) => [k, { stars: n }])) })
    expect(nextStageToPlay(mesa, undefined, 0)?.id).toBe('k-count-1')
    expect(nextStageToPlay(mesa, stars({ 'k-count-1': 1 }), 0)?.id).toBe('k-count-parade')
    expect(nextStageToPlay(mesa, stars({ 'k-count-1': 1, 'k-count-parade': 3, 'k-count-3': 3 }), 0)?.id).toBe('k-count-1')
    expect(nextStageToPlay(mesa, stars({ 'k-count-1': 3, 'k-count-parade': 3, 'k-count-3': 3 }), 0)).toBeNull()
    // grades 2–4 climb their own stages
    expect(nextStageToPlay(mesa, undefined, 3)?.id).toBe(mesa.stages[0].id)
  })

  it('every pilot stage has a picture', () => {
    for (const p of Object.values(PILOT)) for (const [i, id] of p.stages.entries()) expect(stagePicture(kStage(id, i))).not.toMatch(/^[💡⚡🏆⭐]$/u)
    expect(stagePicture({ id: 'x', kind: 'mastery' })).toBe('🏆')
    expect(stagePicture({ id: 'x', kind: 'concept', emoji: '🐸' })).toBe('🐸')
  })
})

describe('what the voice says (k-nav)', () => {
  it('each pilot zone has its name and welcome, each pilot stage its title', () => {
    for (const [zoneId, p] of Object.entries(PILOT)) {
      expect(voiceText(zoneNameVoice(zoneId)!)).toBe(`${p.title}!`)
      expect(voiceText(zoneWelcomeVoice(zoneId))).toBe(`${p.title}! Tap a star to play!`)
      for (const id of p.stages) expect(stageVoice(id), id).not.toBeNull()
    }
    expect(zoneNameVoice('division-dunes')).toBeNull()
    expect(voiceText(zoneWelcomeVoice('division-dunes'))).toBe('Tap a star to play!')
    expect(voiceText(stageVoice('k-count-1')!)).toBe('Count with me!')
  })

  it("never says the child's name: no k-nav line has a slot, and none mentions a name", () => {
    const pack = VOICE_PACKS['k-nav']
    expect(pack.templates ?? {}).toEqual({})
    for (const text of Object.values(pack.lines)) expect(text).not.toMatch(/\{/)
    expect(voiceText({ line: 'k-nav/sleeping' })).toBe('This place is still sleeping. Come back soon!')
    expect(voiceText({ line: 'k-nav/quitAsk' })).toBe('Do you want to stop playing?')
    expect(voiceText({ line: 'k-nav/pickAnimal' })).toBe('Pick your animal friend!')
  })
})

describe('World gateways', () => {
  const npc = (zoneId?: string, hub?: 'schoolhouse' | 'library', label = 'X') => ({ zoneId, hub, label })

  it('K–1: a zone gateway follows its zone, the Library follows Letter Reef, the Schoolhouse opens with the K–1 lessons', () => {
    expect(npcSleeping(npc('multiplication-mesa'), 0)).toBe(true)
    withPilotSets()
    expect(npcSleeping(npc('multiplication-mesa'), 0)).toBe(false)
    expect(npcSleeping(npc('division-dunes'), 1)).toBe(true)
    expect(npcSleeping(npc('reading-reef', 'library', 'Library'), 0)).toBe(false)
    expect(npcSleeping(npc(undefined, 'schoolhouse', 'Schoolhouse'), 0)).toBe(false) // the K lessons (kCounting, kShapes, kLetters)
    expect(npcGreeting(npc(undefined, 'schoolhouse', 'Schoolhouse'), 1)).toEqual({ line: 'k-nav/lessonTime' })
    expect(npcGreeting(npc('multiplication-mesa'), 0)).toEqual({ line: 'k-nav/welcome-multiplication-mesa' })
    expect(npcGreeting(npc('division-dunes'), 0)).toEqual({ line: 'k-nav/sleeping' })
    expect(npcTitle(npc('multiplication-mesa', undefined, 'Multiplication Mesa'), 0)).toBe('Counting Mesa')
    expect(npcTitle(npc('reading-reef', 'library', 'Library'), 0)).toBe('Library')
  })

  it('grades 2–5: nothing ever sleeps', () => {
    for (const g of GRADE_LEVELS.filter((g) => g >= 2)) {
      for (const z of curriculum.zones) expect(npcSleeping(npc(z.id), g)).toBe(false)
      expect(npcSleeping(npc(undefined, 'schoolhouse'), g)).toBe(false)
      expect(npcTitle(npc('multiplication-mesa', undefined, 'Multiplication Mesa'), g)).toBe('Multiplication Mesa')
    }
  })
})
