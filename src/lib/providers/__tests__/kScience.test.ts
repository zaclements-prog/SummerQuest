import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  K_ACTIONS,
  K_FOOD,
  K_GEAR,
  K_GEAR_ARGUABLE,
  K_HOMES,
  K_HOME_OF,
  K_NOT_NEEDED,
  K_PLANT_EMOJI,
  K_SUN_EMOJI,
  K_THIRSTY_EMOJI,
  K_WATER_EMOJI,
  K_WEATHERS,
  makeKScienceProvider,
  type KAction,
  type KGear,
  type KScienceMode,
} from '../kScience'
import { createProvider } from '..'
import { K_HOME_ANIMALS, K_HUNGRY_ANIMALS, K_THIRSTY_ANIMALS } from '../../../voice/packs/k-science'
import { DRAWINGS } from '../../../games/listenPlay/drawings'
import { cardsFor, hasPicturePanel, questionSteps } from '../../../games/listenPlay/script'
import type { ListenProblem } from '../../../games/listenPlay/types'
import type { Picture } from '../../problem'
import { seededRng } from '../../random'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { SKILLS } from '../../../tutoring/skills'
import { curriculum, getZone, zoneStages } from '../../../curriculum'

/**
 * Nature Summit (K science): every question is fair and answerable from what
 * is shown and said, its wrong cards can't be argued right, every picture is
 * one every Android tablet draws (a drawing of ours, or an emoji of Unicode 9
 * or older), and everything said resolves to a recorded line.
 */

afterEach(() => vi.restoreAllMocks())

const MODES: KScienceMode[] = ['weather', 'needs', 'pushPull']
const SEEDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
const PER_SEED = 40

function draw(mode: KScienceMode, seed: string, n = PER_SEED): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(`ksci:${mode}:${seed}`))
  const p = makeKScienceProvider({ mode })
  const out = Array.from({ length: n }, () => p.next())
  vi.restoreAllMocks()
  return out
}
const all = (mode: KScienceMode) => SEEDS.flatMap((s) => draw(mode, s))

/** Unicode 9 or older, one symbol (a text-default symbol may carry U+FE0F). */
function oldEmoji(e: string): boolean {
  const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
  if (cps.length !== 1) return false
  const cp = cps[0]
  return (
    cp < 0x1f6d3 ||
    (cp >= 0x1f6e0 && cp <= 0x1f6f6) ||
    (cp >= 0x1f910 && cp <= 0x1f91e) ||
    (cp >= 0x1f920 && cp <= 0x1f927) ||
    (cp >= 0x1f930 && cp <= 0x1f93e) ||
    (cp >= 0x1f940 && cp <= 0x1f94b) ||
    (cp >= 0x1f950 && cp <= 0x1f95e) ||
    (cp >= 0x1f980 && cp <= 0x1f991) ||
    cp === 0x1f9c0
  )
}

function pictureOk(pic: Picture): string | null {
  if (pic.kind === 'art') return DRAWINGS[pic.name] ? null : `no drawing "${pic.name}"`
  if (pic.kind === 'emoji') return oldEmoji(pic.emoji) ? null : `emoji ${pic.emoji} is too new (or more than one)`
  return `a science card is never a ${pic.kind}`
}

const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

const weatherOf = (q: ListenProblem) => (q.picture?.kind === 'art' ? q.picture.name : '')

/** Work the answer out from what the question shows and says (independently of the provider's own choice). */
function solve(q: ListenProblem): unknown {
  const values = q.options.map(String)
  const only = (ok: (v: string) => boolean) => {
    const hits = values.filter(ok)
    expect(hits, `${q.prompt} ${values}`).toHaveLength(1)
    return hits[0]
  }
  switch (q.subtopic) {
    case 'whichWeather':
      return only((v) => q.prompt === `Tap the ${v} day.`)
    case 'wear':
      return only((v) => K_GEAR[v as KGear] === weatherOf(q))
    case 'plant':
      return only((v) => v === 'sun' || v === 'water')
    case 'food': {
      const animal = /^The (\w+) is hungry/.exec(q.prompt)![1] as keyof typeof K_FOOD
      expect(q.picture).toEqual({ kind: 'emoji', emoji: K_FOOD[animal].animal })
      return only((v) => v === K_FOOD[animal].name)
    }
    case 'drink': {
      const animal = /^The (\w+) is thirsty/.exec(q.prompt)![1] as keyof typeof K_THIRSTY_EMOJI
      expect(q.picture).toEqual({ kind: 'emoji', emoji: K_THIRSTY_EMOJI[animal] })
      return only((v) => v === 'water')
    }
    case 'home': {
      const animal = /^The (\w+) needs a home/.exec(q.prompt)![1] as keyof typeof K_HOME_OF
      expect(q.picture).toEqual({ kind: 'emoji', emoji: K_HOME_OF[animal].animal })
      return only((v) => v === K_HOME_OF[animal].home)
    }
    case 'pushOrPull': {
      const act = q.picture?.kind === 'art' ? (q.picture.name as KAction) : ('' as KAction)
      return only((v) => v === K_ACTIONS[act])
    }
    case 'tapAction':
      return only((v) => K_ACTIONS[v as KAction] === (q.prompt === 'Tap the push!' ? 'push' : 'pull'))
    case 'strength':
      return only((v) => v === (q.prompt.includes('far') ? 'bigPush' : 'littlePush'))
  }
  throw new Error(`unknown science question ${q.subtopic}`)
}

describe.each(MODES)('Nature Summit content: %s', (mode) => {
  it('every question is answerable from its pictures, with one right card among 2–3 different ones', () => {
    for (const q of all(mode)) {
      const where = `${q.prompt} ${JSON.stringify(q.options)} → ${q.answer}`
      expect(q.options.length, where).toBeGreaterThanOrEqual(2)
      expect(q.options.length, where).toBeLessThanOrEqual(3)
      expect(new Set(q.options).size, where).toBe(q.options.length)
      expect(solve(q), where).toBe(q.answer)
      expect(q.pictureOptions!.map((o) => o.value), where).toEqual(q.options)
      expect(new Set(q.pictureOptions!.map((o) => JSON.stringify(o.picture))).size, where).toBe(q.options.length)
      for (const o of q.pictureOptions!) expect(pictureOk(o.picture), where).toBeNull()
      if (q.picture) expect(pictureOk(q.picture), where).toBeNull()
      expect(SKILLS[q.skill!.id], q.skill?.id).toMatchObject({ zoneId: 'science-summit', lessonId: 'kScience' })
      expect(q.activity, where).toBeUndefined()
    }
  })

  it('the wrong cards can never be argued right', () => {
    for (const q of all(mode)) {
      const wrong = q.options.filter((o) => o !== q.answer).map(String)
      const where = `${q.prompt} ${JSON.stringify(q.options)}`
      switch (q.subtopic) {
        case 'whichWeather':
          for (const w of wrong) expect(K_WEATHERS as readonly string[], where).toContain(w)
          break
        case 'wear': {
          const w = weatherOf(q) as (typeof K_WEATHERS)[number]
          for (const g of wrong) {
            expect(K_GEAR[g as KGear], where).not.toBe(w)
            expect(K_GEAR_ARGUABLE[w], where).not.toContain(g)
          }
          break
        }
        case 'plant':
        case 'food':
        case 'drink':
          // nothing any living thing needs: no food, no water, no sun
          for (const v of wrong) expect(Object.keys(K_NOT_NEEDED), where).toContain(v)
          break
        case 'home': {
          const animal = /^The (\w+) needs/.exec(q.prompt)![1] as keyof typeof K_HOME_OF
          for (const h of wrong) {
            expect(Object.keys(K_HOMES), where).toContain(h)
            expect(K_HOME_OF[animal].arguable, where).not.toContain(h)
          }
          break
        }
        case 'pushOrPull':
          expect(q.options, where).toEqual(['push', 'pull'])
          break
        case 'tapAction':
          expect(K_ACTIONS[wrong[0] as KAction], where).not.toBe(K_ACTIONS[q.answer as KAction])
          break
      }
    }
  })

  it('everything is said: the question is its line, every card is named as it lights up, every note helps', () => {
    for (const q of all(mode)) {
      expect(said(q.speech), q.prompt).toBe(q.prompt)
      expect(q.nameCards, q.prompt).toBe(true)
      for (const o of q.pictureOptions!) said(o.speech)
      for (const p of q.praise ?? []) said(p)
      expect(q.notes, q.prompt).toHaveLength(q.options.length)
      q.notes!.forEach((n, i) => {
        if (q.options[i] === q.answer) expect(n).toBeNull()
        else expect(said(n), q.prompt).toMatch(/[.!]$/)
      })
      // the guide: phrases of the line, then each card named and lit, then the hand sweeps them all
      for (const c of q.cues ?? []) {
        if (typeof c.cue === 'string') expect(phraseIndex(q.prompt, c.cue), `"${c.cue}" in "${q.prompt}"`).toBeGreaterThanOrEqual(0)
        if (c.target === 'picture') expect(hasPicturePanel(q)).toBe(true)
      }
      const open = q.options.map((_, i) => i)
      const steps = questionSteps(q, open)
      expect(steps[0].voice).toEqual(q.speech)
      const named = steps.filter((s) => s.voice && s.voice !== q.speech)
      expect(named.map((s) => s.voice)).toEqual(cardsFor(q).map((c) => c.speech))
      expect(steps.at(-1)).toMatchObject({ voice: null, hand: 'sweep' })
      expect(q.walkthrough).toBe('none')
    }
  })

  it('never the same question twice in a row; the answer moves around and never sits in one place three times running', () => {
    for (const seed of SEEDS) {
      const qs = draw(mode, seed, 60)
      const at = qs.map((q) => q.options.indexOf(q.answer))
      for (let i = 1; i < qs.length; i++) {
        const sig = (q: ListenProblem) => `${q.prompt}|${JSON.stringify(q.picture ?? null)}|${JSON.stringify(q.options)}`
        expect(sig(qs[i]), `${seed} item ${i}`).not.toBe(sig(qs[i - 1]))
      }
      for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `${seed}: ${at.slice(i - 2, i + 1)}`).toBe(false)
      for (let k = 0; k < 2; k++) expect(at.filter((x) => x === k).length, `${seed}: answer at card ${k}`).toBeGreaterThan(at.length * 0.15)
    }
  })
})

describe('Nature Summit stages ramp gently', () => {
  const first = (mode: KScienceMode, n: number) => draw(mode, 'ramp', n).map((q) => q.subtopic)

  it('weather: the weather names first, then what to wear', () => {
    expect(first('weather', 5)).toEqual(['whichWeather', 'whichWeather', 'wear', 'wear', 'wear'])
  })
  it('needs: plants first, then a hungry, a thirsty and a homeless animal', () => {
    expect(first('needs', 5)).toEqual(['plant', 'plant', 'food', 'drink', 'home'])
    // the two plant questions ask for both things a plant needs
    expect(draw('needs', 'ramp', 2).map((q) => q.answer).sort()).toEqual(['sun', 'water'])
  })
  it('push and pull: push or pull three times, then pick the push (or pull), then the big push', () => {
    expect(first('pushPull', 6)).toEqual(['pushOrPull', 'pushOrPull', 'pushOrPull', 'tapAction', 'tapAction', 'strength'])
  })
  it('a new round (reset) starts the ramp again', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('ksci-reset'))
    const p = makeKScienceProvider({ mode: 'weather' })
    const a = Array.from({ length: 5 }, () => p.next().subtopic)
    p.reset!()
    const b = Array.from({ length: 5 }, () => p.next().subtopic)
    expect(b).toEqual(a)
  })
  it('the stages play these modes, and the provider is reachable from their config', () => {
    const set = zoneStages(getZone('science-summit')!, 0)
    expect(set.map((s) => (s.providerConfig as { mode: string }).mode)).toEqual(MODES)
    for (const s of set) expect((createProvider(s.providerConfig).next() as ListenProblem).speech).toBeDefined()
    expect(curriculum.zones.filter((z) => zoneStages(z, 0).some((s) => s.providerConfig.kind === 'kScience')).map((z) => z.id)).toEqual(['science-summit'])
  })
})

describe('Nature Summit banks', () => {
  it('every emoji is Unicode 9 or older, one symbol; every drawing exists', () => {
    const emoji = [
      ...Object.values(K_NOT_NEEDED),
      ...Object.values(K_FOOD).flatMap((f) => [f.animal, f.food]),
      ...Object.values(K_THIRSTY_EMOJI),
      ...Object.values(K_HOMES),
      ...Object.values(K_HOME_OF).map((h) => h.animal),
      K_PLANT_EMOJI,
      K_SUN_EMOJI,
      K_WATER_EMOJI,
    ]
    for (const e of emoji) expect(oldEmoji(e), `${e} U+${e.codePointAt(0)!.toString(16)}`).toBe(true)
    for (const name of [...K_WEATHERS, ...Object.keys(K_GEAR), ...Object.keys(K_ACTIONS), 'pushIcon', 'pullIcon', 'bigPush', 'littlePush']) expect(DRAWINGS[name], name).toBeDefined()
  })

  it('the animal lists and their pictures are in step with the voice pack', () => {
    expect(Object.keys(K_FOOD).sort()).toEqual([...K_HUNGRY_ANIMALS].sort())
    expect(Object.keys(K_THIRSTY_EMOJI).sort()).toEqual([...K_THIRSTY_ANIMALS].sort())
    expect(Object.keys(K_HOME_OF).sort()).toEqual([...K_HOME_ANIMALS].sort())
    // every weather has gear, and enough wrong cards that can't be argued
    for (const w of K_WEATHERS) {
      expect(Object.values(K_GEAR), w).toContain(w)
      const pool = (Object.keys(K_GEAR) as KGear[]).filter((g) => K_GEAR[g] !== w && !K_GEAR_ARGUABLE[w].includes(g))
      expect(pool.length, w).toBeGreaterThanOrEqual(2)
    }
    // half the actions are pushes, half pulls
    expect(Object.values(K_ACTIONS).filter((k) => k === 'push')).toHaveLength(4)
    expect(Object.values(K_ACTIONS).filter((k) => k === 'pull')).toHaveLength(4)
    // every home animal has at least two homes that are surely not its own
    for (const h of Object.values(K_HOME_OF)) expect(Object.keys(K_HOMES).filter((x) => x !== h.home && !h.arguable.includes(x as never)).length).toBeGreaterThanOrEqual(2)
  })
})
