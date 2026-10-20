import { afterEach, describe, expect, it, vi } from 'vitest'
import { K_WORD_EMOJI, LOOKALIKE_WORDS, looksAlike, makeKLettersProvider, type KLettersConfig, type KWord } from '../kLetters'
import { seededRng } from '../../random'
import { voiceText } from '../../../voice/registry'
import { K_FIRST_LETTERS, K_PICTURE_WORDS, UPPER_LETTERS } from '../../../voice/packs/k-letters'
import { questionSteps } from '../../../games/listenPlay/script'
import type { ListenProblem } from '../../../games/listenPlay/types'

afterEach(() => vi.restoreAllMocks())

function draw(cfg: KLettersConfig, seed: string, n = 300): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = makeKLettersProvider(cfg)
  return Array.from({ length: n }, () => p.next())
}

const letters = (q: ListenProblem) => q.pictureOptions!.map((o) => (o.picture.kind === 'letter' ? o.picture.ch : '?'))
const anyLookalikes = (cs: string[]) => cs.some((a, i) => cs.some((b, j) => i < j && looksAlike(a, b)))

describe('kindergarten letters: find the letter (RF.K.1d)', () => {
  it('"Tap the letter B.": three big letters, none that look alike, each said by name when tapped', () => {
    for (const q of draw({ mode: 'findUpper' }, 'klet-upper')) {
      const L = /^Tap the letter ([A-Z])\.$/.exec(q.prompt)![1]
      expect(q.answer).toBe(L)
      expect(voiceText(q.speech!)).toBe(q.prompt)
      expect(letters(q)).toEqual(q.options)
      for (const c of letters(q)) expect(c).toMatch(/^[A-Z]$/)
      expect(anyLookalikes(letters(q)), letters(q).join()).toBe(false)
      expect(q.pictureOptions!.map((o) => voiceText(o.speech!))).toEqual(letters(q).map((c) => `${c}!`))
      expect(q.picture).toBeUndefined() // the letters take the stage
    }
  })

  it('goes through the whole alphabet before any letter comes back, never the same twice running', () => {
    const qs = draw({ mode: 'findUpper' }, 'klet-deck', 78)
    for (let k = 0; k < 3; k++) expect(new Set(qs.slice(k * 26, k * 26 + 26).map((q) => q.answer)).size).toBe(26)
    for (let i = 1; i < qs.length; i++) expect(qs[i].answer).not.toBe(qs[i - 1].answer)
  })
})

describe('kindergarten letters: big and little (RF.K.1d)', () => {
  it('"Find the little b.": the big B shown, three little letters; one colour for every letter', () => {
    for (const q of draw({ mode: 'matchCase' }, 'klet-case')) {
      const l = /^Find the little ([a-z])\.$/.exec(q.prompt)![1]
      expect(q.answer).toBe(l)
      expect(q.picture).toEqual({ kind: 'letter', ch: l.toUpperCase() })
      expect(voiceText(q.speech!)).toBe(q.prompt)
      for (const c of letters(q)) expect(c).toMatch(/^[a-z]$/)
      expect(q.pictureOptions!.map((o) => voiceText(o.speech!))).toEqual(letters(q).map((c) => `${c.toUpperCase()}!`))
      expect(anyLookalikes(letters(q))).toBe(false)
    }
  })

  it('look-alikes (b and d) come only in later items, one at a time beside the answer', () => {
    const qs = draw({ mode: 'matchCase', confusablesAfter: 3 }, 'klet-lookalike', 200)
    for (const q of qs.slice(0, 3)) expect(anyLookalikes(letters(q))).toBe(false)
    const later = qs.slice(3).filter((q) => anyLookalikes(letters(q)))
    expect(later.length).toBeGreaterThan(40)
    for (const q of later) {
      const others = letters(q).filter((c) => c !== q.answer)
      // the look-alike is the answer's (b beside d), not two distractors that look like each other
      expect(others.some((c) => looksAlike(c, String(q.answer)))).toBe(true)
      expect(looksAlike(others[0], others[1])).toBe(false)
    }
    expect(later.some((q) => ['b', 'd', 'p', 'q'].includes(String(q.answer)))).toBe(true)
  })
})

describe('kindergarten letters: first sounds (RF.K.2–3)', () => {
  const qs = () => draw({ mode: 'firstSound' }, 'klet-sound')

  it('"Which one starts with B?": exactly one picture starts with the letter; the letter (big and little) is shown', () => {
    const asked = new Set<string>()
    for (const q of qs()) {
      const L = /^Which one starts with ([A-Z])\?$/.exec(q.prompt)![1]
      asked.add(L)
      expect(voiceText(q.speech!)).toBe(q.prompt)
      expect(q.picture).toEqual({ kind: 'letter', ch: `${L}${L.toLowerCase()}` })
      const words = q.options as KWord[]
      expect(words.filter((w) => w[0].toUpperCase() === L)).toEqual([q.answer])
      // the other pictures start with different letters, and none could be taken for another
      expect(new Set(words.map((w) => w[0])).size).toBe(words.length)
      for (const g of LOOKALIKE_WORDS) expect(words.filter((w) => g.includes(w)).length).toBeLessThanOrEqual(1)
      expect(q.pictureOptions!.map((o) => (o.picture.kind === 'emoji' ? o.picture.emoji : ''))).toEqual(words.map((w) => K_WORD_EMOJI[w]))
      // each picture is named as it lights up, and said when tapped
      expect(q.nameCards).toBe(true)
      expect(q.pictureOptions!.map((o) => voiceText(o.speech!))).toEqual(words.map((w) => `${w}!`))
      // a wrong pick hears why: "Cat starts with C."
      q.notes!.forEach((n, i) => {
        if (words[i] === q.answer) expect(n).toBeNull()
        else expect(voiceText(n!)).toBe(`${words[i][0].toUpperCase()}${words[i].slice(1)} starts with ${words[i][0].toUpperCase()}.`)
      })
    }
    expect([...asked].sort()).toEqual(K_FIRST_LETTERS)
  })

  it('the guide names each picture after the question, then sweeps them all', () => {
    const q = qs()[0]
    const steps = questionSteps(q, [0, 1, 2])
    expect(steps[0]).toMatchObject({ voice: q.speech, target: 'lp-picture' })
    expect(steps.slice(1, 4).map((s) => [s.voice, s.target])).toEqual(q.pictureOptions!.map((o, i) => [o.speech, `lp-card-${i}`]))
    expect(steps[4]).toMatchObject({ voice: null, target: ['lp-card-0', 'lp-card-1', 'lp-card-2'], hand: 'sweep' })
  })

  it('every picture word has a picture every Android tablet draws (Unicode 9 or older, one symbol)', () => {
    expect(Object.keys(K_WORD_EMOJI).sort()).toEqual([...K_PICTURE_WORDS].sort())
    // whole blocks from Unicode 9 or older, and the Unicode 8–9 parts of the newer ones
    const old = (cp: number) =>
      cp < 0x1f6d3 ||
      (cp >= 0x1f6e0 && cp <= 0x1f6f6) ||
      (cp >= 0x1f910 && cp <= 0x1f91e) ||
      (cp >= 0x1f920 && cp <= 0x1f927) ||
      (cp >= 0x1f940 && cp <= 0x1f94b) ||
      (cp >= 0x1f950 && cp <= 0x1f95e) ||
      (cp >= 0x1f980 && cp <= 0x1f991)
    for (const [w, e] of Object.entries(K_WORD_EMOJI)) {
      const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
      expect(cps, w).toHaveLength(1)
      expect(old(cps[0]), `${w} ${e} U+${cps[0].toString(16)}`).toBe(true)
    }
    // a word for (nearly) every letter it asks about, and every letter has 2 or more
    for (const L of K_FIRST_LETTERS) expect(K_PICTURE_WORDS.filter((w) => w[0].toUpperCase() === L).length).toBeGreaterThanOrEqual(2)
    expect(K_FIRST_LETTERS.every((L) => UPPER_LETTERS.includes(L))).toBe(true)
  })
})
