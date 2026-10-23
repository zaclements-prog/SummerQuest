import { afterEach, describe, expect, it, vi } from 'vitest'
import { seededRng } from '../../random'
import { createProvider } from '..'
import {
  G1_FAMILIES,
  G1_HELPS,
  G1_LIGHTS,
  G1_LIVING,
  G1_NO_LIGHTS,
  G1_PARENTS,
  G1_PARTS,
  G1_DAY_NIGHT_THINGS,
  G1_SEASONS,
  G1_SKY_PATTERNS,
  MATERIAL_ASK,
  SEASON_PICS,
  SKY,
  SKY_TIERS,
  makeG1ScienceProvider,
  nextSeason,
  questionKey,
  type G1ScienceMode,
} from '../g1Science'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import type { Picture } from '../../problem'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { DRAWINGS } from '../../../games/listenPlay/drawings'
import { SKILLS } from '../../../tutoring/skills'
import { getZone, zoneStages } from '../../../curriculum'

/**
 * Sky Summit (1-PS4, 1-ESS1, 1-LS1/LS3): every picture question, over many
 * seeds, has exactly one card that answers what is said (worked out again
 * here from the pictures), every wrong card hears why, the pictures are
 * drawings the kit has or emoji every tablet draws, and every line resolves.
 */

afterEach(() => vi.restoreAllMocks())

const SEEDS = 40
const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

/** Unicode 9 or older, one symbol (a text-default symbol may carry U+FE0F). */
function oldEmoji(e: string): boolean {
  const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
  if (cps.length !== 1) return false
  const cp = cps[0]
  return cp < 0x1f6d3 || (cp >= 0x1f910 && cp <= 0x1f91e) || (cp >= 0x1f940 && cp <= 0x1f94b) || (cp >= 0x1f950 && cp <= 0x1f95e) || (cp >= 0x1f980 && cp <= 0x1f991) || cp === 0x1f9c0
}

function picOk(p: Picture | undefined): string[] {
  if (!p) return []
  if (p.kind === 'art') return DRAWINGS[p.name] ? [] : [`no drawing ${p.name}`]
  if (p.kind === 'emoji') return oldEmoji(p.emoji) ? [] : [`new emoji ${p.emoji}`]
  return [`a ${p.kind} picture`]
}

function round(mode: G1ScienceMode, seed: string, n = 18): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = makeG1ScienceProvider({ mode })
  return Array.from({ length: n }, () => p.next())
}

const artName = (p: Picture | undefined) => (p?.kind === 'art' ? p.name : '')

/** Which cards answer the question, worked out from what is shown and said (independently of the provider's answer). */
function rightCards(q: ListenProblem): string[] {
  const said = voiceText(q.speech!)
  const vals = q.options.map(String)
  switch (q.subtopic) {
    case 'dark':
      return vals.filter((v) => v in G1_LIGHTS)
    case 'sound':
      return vals.filter((v) => v.endsWith('Ring'))
    case 'stopSound':
      return vals.filter((v) => v.endsWith('Hold'))
    case 'shadow':
      return vals.filter((v) => v.endsWith('-away'))
    case 'material': {
      const ask = (Object.keys(MATERIAL_ASK) as (keyof typeof MATERIAL_ASK)[]).find((k) => voiceText({ line: `g1-science/${k}` }) === said)!
      return vals.filter((v) => v === MATERIAL_ASK[ask])
    }
    case 'dayNight':
      return vals.filter((v) => said.includes(`${v} sky`))
    case 'seeSky':
      // by day the sun; by night the moon or the stars
      return vals.filter((v) => (said.startsWith('It is day') ? v === 'sun' : v === 'moon' || v === 'stars'))
    case 'whenSee':
      return vals.filter((v) => (said.includes('stars') ? v === 'night' : v === 'day'))
    case 'sunMove':
      return vals.filter((v) => (said.includes('comes up') ? v === 'sunRise' : said.includes('high') ? v === 'sunHigh' : v === 'sunSet'))
    case 'skyNext':
      // morning, then high at lunch time, then going down, then night, then morning again
      return vals.filter((v) =>
        said.includes('coming up') ? v === 'sunHigh' : said.includes('high') ? v === 'sunSet' : said.includes('going down') ? v === 'nightSky' : said.startsWith('It is night') && v === 'sunRise',
      )
    case 'season':
      return vals.filter((v) => (said.includes('more daylight') ? v === 'summer' : v === 'winter'))
    case 'nightThing': {
      const thing = (Object.keys(G1_DAY_NIGHT_THINGS) as (keyof typeof G1_DAY_NIGHT_THINGS)[]).find((k) => q.picture?.kind === 'emoji' && q.picture.emoji === G1_DAY_NIGHT_THINGS[k].emoji)!
      return vals.filter((v) => v === G1_DAY_NIGHT_THINGS[thing].when)
    }
    case 'moonShape':
      return vals.filter((v) => (said.includes('full moon') ? v === 'moonFull' : said.includes('half moon') ? v === 'moonHalf' : said.includes('thin moon') && v === 'moonThin'))
    case 'skyPattern':
      // sun, moon, sun: the moon (night) next; moon, sun, moon: the sun (day)
      return vals.filter((v) => v === G1_SKY_PATTERNS[artName(q.picture) as keyof typeof G1_SKY_PATTERNS])
    case 'seasonSee': {
      const now = G1_SEASONS.find((x) => said === `It is ${x}. What might you see outside?`)!
      return vals.filter((v) => v === now)
    }
    case 'seasonNext': {
      const now = G1_SEASONS.find((x) => said === `It is ${x}. Which season comes next?`)!
      expect(q.picture).toEqual({ kind: 'emoji', emoji: SEASON_PICS[now] })
      return vals.filter((v) => v === nextSeason(now))
    }
    case 'baby': {
      const baby = Object.keys(G1_FAMILIES).find((b) => said === `This is a ${b}. Tap its parent!`) as keyof typeof G1_FAMILIES
      return vals.filter((v) => v === G1_FAMILIES[baby].parent)
    }
    case 'helps': {
      const ask = (Object.keys(G1_HELPS) as (keyof typeof G1_HELPS)[]).find((k) => voiceText({ line: `g1-science/${k}` }) === said)!
      return vals.filter((v) => v === G1_HELPS[ask])
    }
    case 'parts': {
      const part = (Object.keys(G1_PARTS) as (keyof typeof G1_PARTS)[]).find((k) => voiceText({ line: `g1-science/part-${k}` }) === said)!
      return vals.filter((v) => v === G1_PARTS[part].right)
    }
  }
  return []
}

describe('Sky Summit: the stages', () => {
  it('are the contract’s three stages, each a round of six', () => {
    const set = zoneStages(getZone('science-summit')!, 1)
    expect(set.map((s) => [s.id, (s.providerConfig as { mode?: string }).mode, s.params?.questionCount])).toEqual([
      ['g1-science-1', 'lightSound', 6],
      ['g1-science-2', 'sky', 6],
      ['g1-science-3', 'families', 6],
    ])
    for (const s of set) expect(createProvider(s.providerConfig).topic).toBe('g1Science')
  })

  it('each stage starts easy and covers its kinds in its first round', () => {
    const first = (mode: G1ScienceMode) => round(mode, `ramp-${mode}`, 6).map((q) => q.subtopic)
    expect(first('lightSound')).toEqual(['dark', 'sound', 'stopSound', 'shadow', 'material', 'material'])
    expect(first('families')).toEqual(['baby', 'baby', 'helps', 'parts', 'helps', 'parts'])
    // the sky: two easy kinds, two middling, two harder, six different ones (its eleven kinds share the rounds)
    const seen = new Set<string>()
    for (let s = 0; s < SEEDS; s++) {
      const kinds = round('sky', `ramp-sky-${s}`, 6).map((q) => q.subtopic!)
      expect(new Set(kinds).size, kinds.join()).toBe(6)
      kinds.forEach((k, i) => expect(SKY_TIERS[Math.floor(i / 2)], `${i}: ${k}`).toContain(k))
      for (const k of kinds) seen.add(k)
    }
    expect(seen.size).toBe(SKY_TIERS.flat().length)
  })
})

describe('every Sky Summit question', () => {
  for (const mode of ['lightSound', 'sky', 'families'] as const) {
    it(`${mode}: exactly one right card, a word for each wrong one, pictures and lines that exist`, () => {
      const at = new Map<number, number>()
      for (let s = 0; s < SEEDS; s++) {
        let last = ''
        for (const q of round(mode, `${mode}-${s}`)) {
          const key = `${q.subtopic}: ${q.prompt}`
          expect(q.prompt).toBe(said(q.speech))
          expect(q.options.length, key).toBeGreaterThanOrEqual(2)
          expect(q.options.length, key).toBeLessThanOrEqual(3)
          expect(new Set(q.options).size, key).toBe(q.options.length)
          const cards = q.pictureOptions!
          expect(cards.map((c) => c.value), key).toEqual(q.options)
          expect(new Set(cards.map((c) => JSON.stringify(c.picture))).size, key).toBe(cards.length)
          expect(picOk(q.picture), key).toEqual([])
          for (const c of cards) {
            expect(picOk(c.picture), key).toEqual([])
            if (c.speech) said(c.speech)
          }
          if (q.nameCards) for (const c of cards) expect(c.speech, `${key}: card ${c.value} is named, so it needs a name`).toBeDefined()
          // one card answers it, and it is the answer
          const right = rightCards(q)
          expect(right, key).toEqual([q.answer])
          // every wrong card hears why
          q.options.forEach((o, i) => {
            if (o === q.answer) expect(q.notes![i], key).toBeNull()
            else said(q.notes![i])
          })
          expect(SKILLS[q.skill!.id], q.skill!.id).toBeDefined()
          for (const p of q.praise ?? []) said(p)
          // never the same question twice in a row
          const sig = `${q.prompt}|${JSON.stringify(q.picture ?? null)}|${JSON.stringify(q.options)}`
          expect(sig, key).not.toBe(last)
          last = sig
          const i = q.options.indexOf(q.answer)
          at.set(i, (at.get(i) ?? 0) + 1)
        }
      }
      // the answer turns up in every place
      expect(at.size).toBeGreaterThanOrEqual(2)
    })
  }

  it('the sky has about 32 different questions, and a round never asks one twice', () => {
    const all = new Set<string>()
    for (let s = 0; s < 120; s++) {
      for (const n of [6, 12]) {
        const qs = round('sky', `sky-pool-${s}-${n}`, n)
        const keys = qs.map(questionKey)
        // (a round is six; a longer run, the daily quest's, keeps its last six apart)
        for (let i = 0; i < keys.length; i++) expect(keys.slice(Math.max(0, i - 5), i), keys[i]).not.toContain(keys[i])
        for (const k of keys) all.add(k)
      }
    }
    expect(all.size).toBeGreaterThanOrEqual(32)
  })

  it('every sky card has a picture and a voice line', () => {
    for (let s = 0; s < SEEDS; s++) {
      for (const q of round('sky', `sky-cards-${s}`, 12)) {
        for (const c of q.pictureOptions!) {
          expect(picOk(c.picture), `${q.prompt}: ${c.value}`).toEqual([])
          expect(c.picture, `${q.prompt}: ${c.value}`).toBeDefined()
          expect(said(c.speech).length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('wrong cards are never arguably right', () => {
    // no light source among the "no light" things; the moon is never a wrong card for the day
    for (const e of Object.values(G1_NO_LIGHTS)) expect(Object.values(G1_LIGHTS)).not.toContain(e)
    for (let s = 0; s < SEEDS; s++) {
      for (const q of round('sky', `sky-moon-${s}`)) {
        if (q.subtopic === 'seeSky' && q.answer === 'sun') expect(q.options).not.toContain('moon')
        // "what might you see?" offers only the season across the year (a snowman in summer, never in spring)
        if (q.subtopic === 'seasonSee') expect(q.options.length).toBe(2)
      }
      for (const q of round('families', `fam-${s}`)) {
        if (q.subtopic !== 'parts') continue
        // a turtle swims (never a wrong card for fins); an elephant has big ears (never a wrong card for ears)
        if (q.answer === 'fish') expect(q.options).not.toContain('turtle')
        if (q.answer === 'rabbit') expect(q.options).not.toContain('elephant')
        // the spines question is about plants only
        if (q.answer === 'cactus') for (const o of q.options) expect(['cactus', 'sunflower', 'tulip']).toContain(o)
      }
    }
    for (const e of [...Object.values(G1_LIGHTS), ...Object.values(G1_NO_LIGHTS), ...Object.values(SKY), ...Object.values(G1_PARENTS), ...Object.values(G1_LIVING), ...Object.values(G1_FAMILIES).map((f) => f.baby), ...Object.values(SEASON_PICS), ...Object.values(G1_DAY_NIGHT_THINGS).map((t) => t.emoji)]) expect(oldEmoji(e), e).toBe(true)
  })

  it('the shadow drawings: the right one has its shadow away from the sun', () => {
    for (let s = 0; s < 10; s++) {
      for (const q of round('lightSound', `shadow-${s}`)) {
        if (q.subtopic !== 'shadow') continue
        const right = q.pictureOptions!.find((c) => c.value === q.answer)!
        expect(artName(right.picture)).toMatch(/^shadow-(tree|kid)-[LR]-away$/)
        const sun = artName(right.picture).split('-')[2]
        for (const c of q.pictureOptions!) expect(artName(c.picture).split('-')[2]).toBe(sun)
      }
    }
  })
})
