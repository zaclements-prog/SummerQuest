import { afterEach, describe, expect, it, vi } from 'vitest'
import { getZone, zoneStages } from '../../../curriculum'
import { createProvider } from '..'
import { LOWER_ROUND, makeG1WritingProvider, type G1WritingConfig } from '../g1Writing'
import { seededRng } from '../../random'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { CVC_WORDS, G1_WORDS, VOWEL_OF, soundsText, type G1Word } from '../../../voice/packs/g1-phonics'
import { G1_BUILD_IDS, G1_BUILD_SENTENCES } from '../../../voice/packs/g1-writing'
import { checkDot, checkTrace } from '../../trace/check'
import { dist, pointAlong } from '../../trace/geometry'
import { LOWER, LOWER_FAMILIES, LOWER_PHRASES, LOWER_RULING, STROKE_PHRASES, glyph, isDotStroke, strokeArrows, strokeLine } from '../../trace/glyphs'
import type { TraceSpec } from '../../trace/spec'
import type { TilesSpec } from '../../../games/listenPlay/activities/tilesSpec'
import { activityDef } from '../../../games/listenPlay/activities'
import { activityAskSteps } from '../../../games/listenPlay/script'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { SKILLS } from '../../../tutoring/skills'

/**
 * Writing Workshop for 1st grade (phase-2b contract): lowercase letters to
 * trace on four writing lines (ball-and-stick, school stroke order), words to
 * spell from letter tiles, and sentences to build from word tiles with a
 * capital and a period. Fuzzed over many seeds; everything said resolves.
 */

afterEach(() => vi.restoreAllMocks())

const SEEDS = 'abcdefghijkl'.split('')

function run(cfg: G1WritingConfig, seed: string, n: number): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(`g1write:${cfg.mode}:${seed}`))
  const p = makeG1WritingProvider(cfg)
  return Array.from({ length: n }, () => p.next())
}

const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

function common(q: ListenProblem) {
  const w = `${q.prompt} → ${q.answer}`
  expect(q.prompt, w).not.toMatch(/undefined|NaN|\{|\s{2}|\s[,.!;:]/)
  expect(said(q.speech), w).toBe(q.prompt)
  expect(SKILLS[q.skill!.id], w).toMatchObject({ zoneId: 'writing-workshop', lessonId: 'g1Writing' })
  for (const p of q.praise ?? []) said(p)
  expect(q.activity, w).toBeDefined()
  expect(activityDef(q.activity), w).not.toBeNull()
  const steps = activityAskSteps(q, activityDef(q.activity))
  expect(steps[0].voice).toEqual(q.speech)
  for (const s of steps) if (typeof s.cue === 'string') expect(phraseIndex(q.prompt, s.cue), `"${s.cue}" in ${q.prompt}`).toBeGreaterThanOrEqual(0)
}

describe('the lowercase letters (src/lib/trace/glyphs)', () => {
  const ys = (id: string) => glyph('lower', id).strokes.flatMap((s) => s.sampled.pts.map((p) => p.y))
  const top = (id: string) => Math.min(...ys(id))
  const bottom = (id: string) => Math.max(...ys(id))

  it('a–z, each in one stroke family, on their own four lines', () => {
    expect(LOWER.map((g) => g.id).join('')).toBe('abcdefghijklmnopqrstuvwxyz')
    expect(Object.values(LOWER_FAMILIES).flat().sort().join('')).toBe('abcdefghijklmnopqrstuvwxyz')
    for (const g of LOWER) {
      expect(g.kind).toBe('lower')
      expect(g.lines).toBe(true)
      expect(g.ruling).toEqual(LOWER_RULING)
      expect(g.strokes.length, g.id).toBeGreaterThan(0)
      expect(g.strokes.length, g.id).toBeLessThanOrEqual(3)
      for (const s of g.strokes) {
        for (const p of s.sampled.pts) {
          expect(p.x, g.id).toBeGreaterThanOrEqual(5)
          expect(p.x, g.id).toBeLessThanOrEqual(95)
          expect(p.y, g.id).toBeGreaterThanOrEqual(5)
          expect(p.y, g.id).toBeLessThanOrEqual(97)
        }
        // every stroke's phrase is a voice line: kindergarten's, or 1st grade's
        expect(s.say in STROKE_PHRASES || s.say in LOWER_PHRASES, `${g.id}: ${s.say}`).toBe(true)
        expect(() => voiceText({ line: strokeLine(s.say) }), `${g.id}: ${s.say}`).not.toThrow()
        // continuous: no jumps between samples
        for (let i = 1; i < s.sampled.pts.length; i++) expect(dist(s.sampled.pts[i - 1], s.sampled.pts[i]), g.id).toBeLessThan(3)
      }
    }
  })

  it('the x-height and the tails are right: small letters sit between the dashed line and the base line', () => {
    const { top: T, mid: Mi, base: B, desc: D } = { ...LOWER_RULING, desc: LOWER_RULING.desc! }
    const near = (a: number, b: number, tol = 1.5) => Math.abs(a - b) <= tol
    // tall letters reach the top line (t a little lower: it starts above the dashed line)
    for (const id of 'bdhkl') expect(near(top(id), T), `${id} top ${top(id)}`).toBe(true)
    expect(top('t')).toBeGreaterThan(T + 8)
    expect(top('t')).toBeLessThan(Mi - 8)
    // f's hook comes close to the top line
    expect(top('f')).toBeLessThan(T + 4)
    // i and j: a dot above the dashed line, the rest from it
    for (const id of 'ij') {
      const [line, dotS] = glyph('lower', id).strokes
      expect(isDotStroke(dotS)).toBe(true)
      expect(dotS.start.y).toBeLessThan(Mi - 6)
      expect(near(line.start.y, Mi)).toBe(true)
    }
    // small letters: from the dashed line to the base line
    for (const id of 'acemnorsuvwxz') {
      expect(near(top(id), Mi), `${id} top ${top(id)}`).toBe(true)
      expect(near(bottom(id), B), `${id} bottom ${bottom(id)}`).toBe(true)
    }
    // tails hang down to the descender line
    for (const id of 'gjpqy') expect(near(bottom(id), D, 2.5), `${id} bottom ${bottom(id)}`).toBe(true)
    // nothing else goes below the base line
    for (const id of 'abcdefhiklmnorstuvwxz') expect(bottom(id), id).toBeLessThanOrEqual(B + 1)
  })

  it('school order: bowls go round like a c from about two o’clock; humps and b/p bowls go the other way; lines go down', () => {
    // a, d, g, o, q, c: the first stroke starts up and right, and heads up and left (counter-clockwise)
    for (const id of 'adgoqc') {
      const s = glyph('lower', id).strokes[0]
      expect(s.start.x, id).toBeGreaterThan(55)
      expect(s.start.y, id).toBeLessThan(45)
      const { dir } = pointAlong(s.sampled, 3)
      expect(dir.x, id).toBeLessThan(0)
      expect(dir.y, id).toBeLessThan(0)
    }
    // b and p: the line first, then the bowl clockwise (up and right from the line)
    for (const id of 'bp') {
      const [line, bowl] = glyph('lower', id).strokes
      expect(line.end.y).toBeGreaterThan(line.start.y)
      const { dir } = pointAlong(bowl.sampled, 3)
      expect(dir.y, id).toBeLessThan(0)
      expect(dir.x, id).toBeGreaterThan(-0.2)
    }
    // n, m, h, r: the line first, then up and over to the right
    for (const id of 'nmhr') {
      const g = glyph('lower', id)
      expect(g.strokes[0].end.y).toBeGreaterThan(g.strokes[0].start.y)
      const { dir } = pointAlong(g.strokes[1].sampled, 3)
      expect(dir.y, id).toBeLessThan(0)
    }
    // every stroke starts at the top or the left, flat lines run left to right (a dot is a tap; r's curve goes up from its line)
    for (const g of LOWER)
      for (const s of g.strokes) {
        if (isDotStroke(s) || dist(s.start, s.end) < 1 || s.say === 'rCurve') continue
        expect(s.start.y <= s.end.y + 0.01, `${g.id}`).toBe(true)
        if (Math.abs(s.start.y - s.end.y) < 0.5) expect(s.start.x, g.id).toBeLessThan(s.end.x)
      }
    // the cross of f and t comes last
    for (const id of 'ft') expect(glyph('lower', id).strokes.at(-1)!.say).toBe('littleAcross')
  })

  it('a finger along each stroke passes the check; a dot is a tap; going the wrong way round does not', () => {
    for (const g of LOWER)
      for (const s of g.strokes) {
        if (isDotStroke(s)) {
          expect(checkDot(s.sampled, [s.start]).ok, g.id).toBe(true)
          expect(checkDot(s.sampled, [{ x: s.start.x + 30, y: s.start.y }]).ok, g.id).toBe(false)
          expect(strokeArrows(s), g.id).toEqual([])
          continue
        }
        expect(checkTrace(s.sampled, s.sampled.pts).ok, `${g.id} ${s.say}`).toBe(true)
        expect(strokeArrows(s).length, g.id).toBeGreaterThan(0)
      }
    const o = glyph('lower', 'o').strokes[0]
    expect(checkTrace(o.sampled, [...o.sampled.pts].reverse()).ok).toBe(false)
  })
})

describe('Little letters (g1-trace-1)', () => {
  const cfg = zoneStages(getZone('writing-workshop')!, 1).find((s) => s.id === 'g1-trace-1')!.providerConfig as G1WritingConfig

  it('a round deals six different letters, one from each family share, in family order', () => {
    for (const seed of SEEDS) {
      const qs = run(cfg, seed, LOWER_ROUND * 5)
      for (let r = 0; r < 5; r++) {
        const ids = qs.slice(r * LOWER_ROUND, (r + 1) * LOWER_ROUND).map((q) => String(q.answer))
        expect(new Set(ids).size).toBe(LOWER_ROUND)
        const fam = (id: string) => Object.entries(LOWER_FAMILIES).find(([, xs]) => (xs as readonly string[]).includes(id))![0]
        expect(ids.map(fam)).toEqual(['lines', 'curves', 'curves', 'humps', 'humps', 'slants'])
      }
      // five rounds meet most of the alphabet
      expect(new Set(qs.map((q) => q.answer)).size).toBeGreaterThanOrEqual(22)
    }
  })

  it('each is a trace of the lowercase glyph: said by name, then "A!" and its picture word', () => {
    for (const q of run(cfg, 'x', 26)) {
      common(q)
      const a = q.activity as TraceSpec
      expect(a).toMatchObject({ kind: 'trace', glyph: 'lower', id: q.answer })
      expect(said(q.speech)).toBe(`Let's trace little ${String(q.answer).toUpperCase()}!`)
      expect(said(a.name)).toBe(`${String(q.answer).toUpperCase()}!`)
      if (a.picture) said(a.picture.speech)
    }
  })
})

describe('Spell it (g1-spell-1)', () => {
  const cfg = zoneStages(getZone('writing-workshop')!, 1).find((s) => s.id === 'g1-spell-1')!.providerConfig as G1WritingConfig

  it('a picture, a slot per letter, the letters among a few others; tiles say their names; a miss sounds it out', () => {
    for (const seed of SEEDS)
      for (const q of run(cfg, seed, 12)) {
        common(q)
        const a = q.activity as TilesSpec
        const w = String(q.answer) as G1Word
        expect(CVC_WORDS as readonly string[]).toContain(w)
        expect(a).toMatchObject({ kind: 'tiles', mode: 'letters', units: [...G1_WORDS[w]] })
        expect(a.emoji).toBeTruthy()
        expect(new Set(a.tiles).size).toBe(a.tiles.length)
        for (const u of a.units) expect(a.tiles).toContain(u)
        expect(a.tileSpeech).toHaveLength(a.tiles.length)
        a.tiles.forEach((t, i) => expect(said(a.tileSpeech[i])).toBe(`${t.toUpperCase()}!`))
        expect(said(a.help.line)).toBe(soundsText(w))
        expect(a.help.at).toHaveLength(3)
        expect(said(a.done!.line).toLowerCase()).toBe(`${w}!`)
        said(a.helpIntro)
      }
  })

  it('one extra tile, then two, then three; later ones are easy to mix up', () => {
    for (const seed of SEEDS) {
      const qs = run(cfg, seed, 6)
      expect(qs.map((q) => (q.activity as TilesSpec).tiles.length)).toEqual([4, 4, 5, 5, 6, 6])
      for (const q of qs.slice(2)) {
        const a = q.activity as TilesSpec
        const extras = a.tiles.filter((t) => !a.units.includes(t))
        const v = VOWEL_OF[q.answer as G1Word]
        // another short vowel is always there to tell apart from the word's own
        expect(extras.some((t) => 'aeiou'.includes(t) && t !== v), JSON.stringify(a.tiles)).toBe(true)
      }
    }
  })
})

describe('Build a sentence (g1-sentence-1)', () => {
  const cfg = zoneStages(getZone('writing-workshop')!, 1).find((s) => s.id === 'g1-sentence-1')!.providerConfig as G1WritingConfig

  it('the bank: three to five words a 1st grader reads, a capital to start, a period to end', () => {
    for (const id of G1_BUILD_IDS) {
      const s = G1_BUILD_SENTENCES[id]
      expect(s, id).toMatch(/^[A-Z][a-z]*( [a-z]+)*\.$|^I( [a-z]+)*\.$/)
      const n = s.split(' ').length
      expect(n, id).toBeGreaterThanOrEqual(3)
      expect(n, id).toBeLessThanOrEqual(5)
    }
  })

  it('word tiles and the period; the sentence said, then read back as each slot lights; from the third, the first word in small letters too', () => {
    for (const seed of SEEDS) {
      const qs = run(cfg, seed, 5)
      expect(qs.map((q) => (q.activity as TilesSpec).units.length - 1)).toEqual([3, 3, 4, 4, 5])
      qs.forEach((q, i) => {
        common(q)
        const a = q.activity as TilesSpec
        expect(a.mode).toBe('words')
        expect(a.units.at(-1)).toBe('.')
        expect(`${a.units.slice(0, -1).join(' ')}.`).toBe(q.answer)
        expect(a.units[0][0]).toBe(a.units[0][0].toUpperCase())
        for (const u of a.units) expect(a.tiles).toContain(u)
        expect(a.tileSpeech.every((t) => t === null)).toBe(true)
        expect(said(q.speech)).toBe(`Make this sentence. ${q.answer}`)
        expect(said(a.done!.line)).toBe(q.answer)
        expect(said(a.helpIntro)).toBe('A sentence starts with a capital letter. It ends with a period.')
        const text = said(a.help.line)
        expect(a.help.at).toHaveLength(a.units.length)
        a.help.at.forEach((at, k) => expect(text.slice(at).startsWith(a.units[k]), `${text} @${at} ${a.units[k]}`).toBe(true))
        const extra = a.tiles.filter((t) => !a.units.includes(t))
        if (i < 2) expect(extra).toEqual([])
        else if (a.units[0] !== 'I') expect(extra).toEqual([a.units[0].toLowerCase()])
      })
    }
  })
})

describe('Writing Workshop in the curriculum', () => {
  it('every stage draws its questions from the createProvider registry', () => {
    for (const st of zoneStages(getZone('writing-workshop')!, 1)) {
      const p = createProvider(st.providerConfig)
      expect(p.topic).toBe('g1Writing')
      expect((p.next() as ListenProblem).activity).toBeDefined()
    }
  })
})
