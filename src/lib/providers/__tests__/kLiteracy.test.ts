import { afterEach, describe, expect, it, vi } from 'vitest'
import { curriculum, zoneStages } from '../../../curriculum'
import { createProvider, type ProviderConfig } from '..'
import {
  K_DRUM_EMOJI,
  K_MORE_WORD_EMOJI,
  LITERACY_CARD_WORDS,
  LITERACY_LOOKALIKES,
  RIME,
  cardPicture,
  firstSound,
  literacyEmoji,
  makeKLiteracyProvider,
  picturesAlike,
  rhymeAnswers,
  rhymes,
  wordLikeness,
  type KLiteracyConfig,
} from '../kLiteracy'
import { K_WORD_EMOJI } from '../kLetters'
import { seededRng } from '../../random'
import type { Picture } from '../../problem'
import { VOICE_PACKS, voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { K_PICTURE_WORDS } from '../../../voice/packs/k-letters'
import { K_MORE_PICTURE_WORDS, K_NUMBER_WORDS, K_RHYME_TARGETS, K_VERSES } from '../../../voice/packs/k-rhymes'
import { K_BLEND_SOUNDS, K_BLEND_WORDS, K_DRUM_PARTS, K_DRUM_WORDS, STRETCHY_ONSETS, partsText } from '../../../voice/packs/k-sounds'
import { K_SIGHT_WORDS } from '../../../voice/packs/k-words'
import { cardsFor, hasPicturePanel, questionSteps } from '../../../games/listenPlay/script'
import { partOffsets, type DrumSpec } from '../../../games/listenPlay/activities/drumSpec'
import { activityAskSteps } from '../../../games/listenPlay/script'
import { activityDef } from '../../../games/listenPlay/activities'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { SKILLS } from '../../../tutoring/skills'

/**
 * Letter Reef's literacy stages (K–5 plan, phase-1b contract): rhymes, the
 * drum, nursery rhymes, blending and sight words, fuzzed over many seeds.
 * Every question is fair (one right answer among its cards, wrong cards that
 * can't be heard as right), every picture is one every Android tablet draws,
 * and everything said resolves to a recorded line.
 */

afterEach(() => vi.restoreAllMocks())

const SEEDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const PER_SEED = 60

function draw(cfg: KLiteracyConfig | ProviderConfig, seed: string, n = PER_SEED): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = 'kind' in cfg ? createProvider(cfg as ProviderConfig) : makeKLiteracyProvider(cfg)
  return Array.from({ length: n }, () => p.next() as ListenProblem)
}

/** Every seed's run, `n` items each (a fresh provider per seed: the stage's ramp starts over). */
const runs = (cfg: KLiteracyConfig, n = PER_SEED) => SEEDS.map((s) => draw(cfg, `klit:${cfg.mode}:${s}`, n))
const all = (cfg: KLiteracyConfig, n = PER_SEED) => runs(cfg, n).flat()

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
/** Every emoji any of these stages can show. */
const KNOWN_EMOJI = new Set([...Object.values(K_WORD_EMOJI), ...Object.values(K_MORE_WORD_EMOJI), ...Object.values(K_DRUM_EMOJI)])

function pictureOk(pic: Picture): boolean {
  if (pic.kind === 'emoji') return KNOWN_EMOJI.has(pic.emoji) && oldEmoji(pic.emoji)
  if (pic.kind === 'numeral') return Object.values(K_NUMBER_WORDS).includes(pic.n as 2)
  if (pic.kind === 'word') return (K_SIGHT_WORDS as readonly string[]).includes(pic.text)
  return false
}

const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

/** What every literacy question has: clean text, a registered skill, and everything it says resolves. */
function common(q: ListenProblem) {
  const where = `${q.prompt} ${JSON.stringify(q.options)} → ${q.answer}`
  expect(q.prompt, where).not.toMatch(/undefined|NaN|\{|\s{2}|\s[,.!;:]/)
  expect(SKILLS[q.skill!.id], where).toBeDefined()
  expect(said(q.speech), where).toBe(q.prompt)
  for (const p of q.praise ?? []) said(p)
  expect(q.options.filter((o) => o === q.answer), where).toHaveLength(1)
}

/** A card question: 3 unique cards (one per option), the answer once, each card a known picture, named and noted. */
function cardQuestion(q: ListenProblem, { named }: { named: boolean }) {
  const where = `${q.prompt} ${JSON.stringify(q.options)} → ${q.answer}`
  common(q)
  expect(q.options, where).toHaveLength(3)
  expect(new Set(q.options).size, where).toBe(3)
  expect(q.pictureOptions!.map((o) => o.value), where).toEqual(q.options)
  for (const o of q.pictureOptions!) expect(pictureOk(o.picture), `${where}: ${JSON.stringify(o.picture)}`).toBe(true)
  expect(new Set(q.pictureOptions!.map((o) => JSON.stringify(o.picture))).size, where).toBe(3)
  if (q.picture) expect(pictureOk(q.picture), where).toBe(true)
  expect(q.nameCards ?? false, where).toBe(named)
  if (named) for (const o of q.pictureOptions!) said(o.speech)
  // a wrong card always gets a word about it; the answer never does
  expect(q.notes, where).toHaveLength(3)
  q.notes!.forEach((n, i) => (q.options[i] === q.answer ? expect(n, where).toBeNull() : said(n)))
  // the guide can follow every cue
  for (const c of q.cues ?? []) {
    if (typeof c.cue === 'string') expect(phraseIndex(said(q.speech), c.cue), `"${c.cue}" in ${q.prompt}`).toBeGreaterThanOrEqual(0)
    if (c.target === 'picture') expect(hasPicturePanel(q)).toBe(true)
  }
  expect(questionSteps(q, [0, 1, 2])[0].voice).toEqual(q.speech)
  expect(q.walkthrough).toBe('none')
}

/** Never the same question twice running; the answer moves (never three times in one place) and uses every place. */
function movesAround(qs: ListenProblem[]) {
  const at = qs.map((q) => q.options.indexOf(q.answer))
  for (let i = 1; i < qs.length; i++) expect(qs[i].prompt === qs[i - 1].prompt && qs[i].answer === qs[i - 1].answer, `item ${i}`).toBe(false)
  for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `positions ${at.slice(i - 2, i + 1)}`).toBe(false)
  for (let k = 0; k < 3; k++) expect(at.filter((x) => x === k).length, `answer at card ${k}`).toBeGreaterThan(qs.length * 0.15)
}

const word = (o: unknown) => String(o)

describe('the picture words (banks)', () => {
  it('every word has one picture every Android tablet draws (Unicode 9 or older), and the lists are in step', () => {
    expect(Object.keys(K_MORE_WORD_EMOJI).sort()).toEqual([...K_MORE_PICTURE_WORDS].sort())
    // no new word is a pilot word (those keep k-letters' pictures and voice lines)
    for (const w of K_MORE_PICTURE_WORDS) expect(K_PICTURE_WORDS as readonly string[], w).not.toContain(w)
    for (const [w, e] of [...Object.entries(K_MORE_WORD_EMOJI), ...Object.entries(K_DRUM_EMOJI)]) expect(oldEmoji(e), `${w} ${e}`).toBe(true)
    // one picture per word: no two words share an emoji
    const emojis = [...LITERACY_CARD_WORDS, ...K_DRUM_WORDS].map((w) => [w, literacyEmoji(w)] as const)
    const owner = new Map<string, string>()
    for (const [w, e] of emojis) {
      expect(e, `${w} has no picture`).toBeDefined()
      if (owner.has(e!)) expect(owner.get(e!), `${w} and ${owner.get(e!)} share ${e}`).toBe(w)
      owner.set(e!, w)
    }
    for (const w of [...K_BLEND_WORDS, ...Object.values(K_VERSES).map((v) => v.answer)]) expect(() => cardPicture(w), w).not.toThrow()
    for (const g of LITERACY_LOOKALIKES) for (const w of g) expect(literacyEmoji(w), w).toBeDefined()
  })

  it('every card word has its ending, and the rhyme families hold together', () => {
    for (const w of [...LITERACY_CARD_WORDS, ...Object.keys(K_NUMBER_WORDS)]) expect(RIME[w], w).toBeDefined()
    for (const t of K_RHYME_TARGETS) {
      expect(rhymeAnswers(t).length, `${t} has a rhyme`).toBeGreaterThan(0)
      for (const a of rhymeAnswers(t)) expect(rhymes(a, t), `${a} / ${t}`).toBe(true)
    }
    expect(rhymes('cat', 'hat')).toBe(true)
    expect(rhymes('bee', 'three')).toBe(true)
    expect(rhymes('cat', 'dog')).toBe(false)
    // near-rhymes count as rhymes when keeping wrong cards apart (mon-KEY and bee), but are never the answer
    expect(rhymes('monkey', 'bee')).toBe(true)
    expect(rhymeAnswers('bee')).not.toContain('monkey')
    expect(rhymeAnswers('car')).not.toContain('guitar')
  })

  it('the nursery rhymes: at least eight traditional verses, each stopping before a word that rhymes with one it said', () => {
    const verses = Object.values(K_VERSES)
    expect(verses.length).toBeGreaterThanOrEqual(8)
    for (const v of verses) {
      expect(v.text, v.answer).toMatch(/…$/)
      expect(v.text.toLowerCase(), v.answer).not.toContain(v.answer)
      expect(v.text.toLowerCase().match(/[a-z]+/g), v.text).toContain(v.partner)
      expect(RIME[v.answer], v.answer).toBe(RIME[v.partner])
      expect(cardPicture(v.answer).kind).toBe('emoji')
    }
    // nine of them (at least) are different rhymes, not one rhyme cut up
    expect(new Set(verses.map((v) => v.text.split(/[,.]/)[0])).size).toBeGreaterThanOrEqual(8)
  })

  it('the drum words: 1 to 3 parts each, written as the help line says them', () => {
    const counts = new Set<number>()
    for (const w of K_DRUM_WORDS) {
      const parts = K_DRUM_PARTS[w]
      counts.add(parts.length)
      expect(parts.length, w).toBeGreaterThanOrEqual(1)
      expect(parts.length, w).toBeLessThanOrEqual(3)
      const text = voiceText({ line: `k-sounds/parts-${w}` })
      expect(text).toBe(partsText(parts))
      expect(partOffsets(text), text).toHaveLength(parts.length)
      // one-part words are just the word
      if (parts.length === 1) expect(parts[0].toLowerCase()).toBe(w)
    }
    expect([...counts].sort()).toEqual([1, 2, 3])
    for (const n of [1, 2, 3]) expect(K_DRUM_WORDS.filter((w) => K_DRUM_PARTS[w].length === n).length, `${n}-part words`).toBeGreaterThanOrEqual(10)
  })

  it('the blending words: stretchy first sounds and stop sounds, each with its two lines', () => {
    for (const w of K_BLEND_WORDS) {
      const b = K_BLEND_SOUNDS[w]
      expect(firstSound(w), w).toBe(b.onset)
      expect(voiceText({ line: `k-sounds/blend-${w}` })).toBe(`Listen: ${b.say.toLowerCase()}… ${b.rest}. What word?`)
      expect(voiceText({ line: `k-sounds/that-${w}` })).toBe(`That's ${w}: ${b.say.toLowerCase()}… ${b.rest}.`)
    }
    const stretchy = K_BLEND_WORDS.filter((w) => STRETCHY_ONSETS.includes(K_BLEND_SOUNDS[w].onset))
    expect(new Set(stretchy.map((w) => K_BLEND_SOUNDS[w].onset))).toEqual(new Set(STRETCHY_ONSETS))
    expect(new Set(K_BLEND_WORDS.filter((w) => !stretchy.includes(w)).map((w) => K_BLEND_SOUNDS[w].onset))).toEqual(new Set(['k', 'd', 'p', 'b', 'g', 't', 'h']))
    // a stretchy sound is written long, a stop with its short "uh"
    for (const w of stretchy) expect(K_BLEND_SOUNDS[w].say, w).toMatch(/^(.)\1{3}$|^Sh+$/i)
    for (const w of K_BLEND_WORDS.filter((x) => ['k', 'd', 'p', 'b', 'g', 't'].includes(K_BLEND_SOUNDS[x].onset))) expect(K_BLEND_SOUNDS[w].say, w).toMatch(/^[A-Z]uh$/)
  })

  it('the sight words: the fifteen Dolch pre-primer words', () => {
    expect([...K_SIGHT_WORDS].sort()).toEqual(['I', 'a', 'and', 'can', 'go', 'is', 'it', 'like', 'look', 'my', 'see', 'the', 'to', 'up', 'we'])
    expect(wordLikeness('see', 'the')).toBeGreaterThan(wordLikeness('see', 'up'))
    expect(wordLikeness('it', 'is')).toBeGreaterThan(wordLikeness('it', 'go'))
  })

  it('the new voice packs: every line and template has words to say', () => {
    for (const id of ['k-rhymes', 'k-sounds', 'k-words']) {
      const pack = VOICE_PACKS[id]
      expect(pack, id).toBeDefined()
      for (const [k, t] of Object.entries(pack.lines)) expect(t.trim().length, `${id}/${k}`).toBeGreaterThan(0)
    }
    // few combinations: recorded whole; the "cat, dog" pairs: stitched
    expect(VOICE_PACKS['k-rhymes'].templates!.noRhyme.render).toBe('stitch')
    for (const [id, t] of Object.entries({ ...VOICE_PACKS['k-rhymes'].templates, ...VOICE_PACKS['k-sounds'].templates, ...VOICE_PACKS['k-words'].templates })) {
      if (id !== 'noRhyme') expect(t.render, id).toBe('whole')
    }
  })
})

describe('Rhyme time (k-rhyme-1): "Which one rhymes with cat?"', () => {
  const cfg: KLiteracyConfig = { mode: 'rhyme', closeAfter: 3 }

  it('one picture rhymes; the others rhyme with nothing on screen and look like nothing else', () => {
    const seen = new Set<string>()
    for (const q of all(cfg)) {
      cardQuestion(q, { named: true })
      const t = /^Which one rhymes with (\w+)\?$/.exec(q.prompt)![1]
      seen.add(t)
      expect(q.picture).toEqual(cardPicture(t))
      const ws = q.options.map(word)
      expect(ws.filter((w) => rhymes(w, t)), q.prompt).toEqual([q.answer])
      expect(rhymeAnswers(t)).toContain(q.answer)
      const wrong = ws.filter((w) => w !== q.answer)
      for (const w of wrong) {
        expect(rhymes(w, word(q.answer)), `${w} / ${q.answer}`).toBe(false)
        expect(picturesAlike(w, t) || picturesAlike(w, word(q.answer)), `${w} looks like ${t} or ${q.answer}`).toBe(false)
        // wrong cards are pictures, never numerals
        expect(cardPicture(w).kind).toBe('emoji')
      }
      expect(rhymes(wrong[0], wrong[1]) || picturesAlike(wrong[0], wrong[1]), wrong.join()).toBe(false)
      // "cat, dog. Those don't rhyme."
      q.notes!.forEach((n, i) => {
        if (ws[i] !== q.answer) expect(voiceText(n!)).toBe(`${t}, ${ws[i]}. Those don't rhyme.`)
      })
      expect(q.pictureOptions!.map((o) => voiceText(o.speech!))).toEqual(ws.map((w) => (w in K_NUMBER_WORDS ? `${K_NUMBER_WORDS[w as keyof typeof K_NUMBER_WORDS]}!` : `${w}!`)))
    }
    expect(seen.size).toBeGreaterThan(30)
  })

  it('from the fourth item, a wrong picture starts like the word (cat → car): listen to the END', () => {
    for (const run of runs(cfg, 20)) {
      for (const q of run.slice(3)) {
        const t = /with (\w+)\?$/.exec(q.prompt)![1]
        const starters = q.options.map(word).filter((w) => w !== q.answer && firstSound(w) === firstSound(t))
        // (when the picture bank has one)
        if (LITERACY_CARD_WORDS.some((w) => w !== t && firstSound(w) === firstSound(t) && !rhymes(w, t))) expect(starters.length, q.prompt).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('moves the answer around and never asks the same twice running', () => {
    for (const run of runs(cfg)) movesAround(run)
  })
})

describe('Finish the rhyme (k-rhyme-2): a nursery rhyme stops before its rhyming word', () => {
  const cfg: KLiteracyConfig = { mode: 'finishRhyme' }

  it('the picture that finishes it is there once; the others rhyme with neither word, and the verse never named them', () => {
    const used = new Set<string>()
    for (const q of all(cfg)) {
      cardQuestion(q, { named: true })
      const v = Object.values(K_VERSES).find((x) => x.text === q.prompt)!
      expect(v, q.prompt).toBeDefined()
      used.add(v.answer)
      expect(q.answer).toBe(v.answer)
      expect(q.picture).toBeUndefined()
      const words = new Set(q.prompt.toLowerCase().match(/[a-z]+/g))
      const wrong = q.options.map(word).filter((w) => w !== q.answer)
      for (const w of wrong) {
        expect(rhymes(w, v.answer) || rhymes(w, v.partner), `${w} in "${q.prompt}"`).toBe(false)
        expect(words.has(w), `${w} is in the verse`).toBe(false)
        expect(picturesAlike(w, v.answer)).toBe(false)
      }
      q.notes!.forEach((n, i) => {
        if (q.options[i] !== q.answer) expect(voiceText(n!)).toBe(`${v.partner}, ${q.options[i]}. Those don't rhyme.`)
      })
    }
    expect(used.size).toBe(Object.keys(K_VERSES).length)
  })

  it('moves the answer around', () => {
    for (const run of runs(cfg)) movesAround(run)
  })
})

describe('Clap the parts (k-syllables-1): the drum', () => {
  const cfg: KLiteracyConfig = { mode: 'syllables' }

  it('asks with the drum activity: the word and its picture, the parts to tap, the help line', () => {
    for (const q of all(cfg)) {
      common(q)
      const spec = q.activity as DrumSpec
      expect(spec.kind).toBe('drum')
      expect(q.pictureOptions).toBeUndefined()
      expect(K_DRUM_WORDS).toContain(spec.word)
      expect(spec.parts).toBe(K_DRUM_PARTS[spec.word as keyof typeof K_DRUM_PARTS].length)
      expect(q.answer).toBe(spec.parts)
      // the other options are the other counts: none shares the word's count of parts
      expect([...q.options].sort()).toEqual([1, 2, 3])
      expect(q.options.filter((o) => o !== q.answer).every((o) => o !== spec.parts)).toBe(true)
      expect(oldEmoji(spec.emoji) && KNOWN_EMOJI.has(spec.emoji), spec.emoji).toBe(true)
      expect(spec.emoji).toBe(literacyEmoji(spec.word))
      expect(partOffsets(said(spec.partsLine))).toHaveLength(spec.parts)
      expect(q.prompt).toBe(`${spec.word[0].toUpperCase()}${spec.word.slice(1)}! Tap the drum for each part, then tap the check.`)
      // the question lights the picture, then the drum on "drum" and the ✓ on "check"
      const steps = activityAskSteps(q, activityDef(q.activity))
      expect(steps.map((s) => [s.target, s.cue])).toEqual([
        ['lp-drum-word', undefined],
        ['lp-drum', 'drum'],
        ['lp-drum-check', 'check'],
      ])
      for (const s of steps) if (typeof s.cue === 'string') expect(phraseIndex(q.prompt, s.cue)).toBeGreaterThanOrEqual(0)
    }
  })

  it('starts two parts, one, three; then never the same count three times running, and every count comes up', () => {
    for (const run of runs(cfg, 30)) {
      const n = run.map((q) => q.answer as number)
      expect(n.slice(0, 3)).toEqual([2, 1, 3])
      for (let i = 2; i < n.length; i++) expect(n[i] === n[i - 1] && n[i] === n[i - 2], n.join()).toBe(false)
      for (const k of [1, 2, 3]) expect(n.filter((x) => x === k).length).toBeGreaterThan(3)
      for (let i = 1; i < run.length; i++) expect((run[i].activity as DrumSpec).word).not.toBe((run[i - 1].activity as DrumSpec).word)
    }
  })
})

describe('Sound it out (k-blend-1): "Listen: mmmm… oon. What word?"', () => {
  const cfg: KLiteracyConfig = { mode: 'blend', stopsAfter: 3, closeAfter: 4 }

  it('the word said in two sounds is there once; each wrong picture is told apart by its sounds', () => {
    for (const q of all(cfg)) {
      cardQuestion(q, { named: true })
      const w = word(q.answer)
      expect(K_BLEND_WORDS as readonly string[]).toContain(w)
      expect(q.picture).toBeUndefined()
      q.notes!.forEach((n, i) => {
        if (q.options[i] !== q.answer) expect(n).toEqual({ line: `k-sounds/that-${q.options[i]}` })
      })
      for (const x of q.options.map(word).filter((o) => o !== w)) expect(picturesAlike(x, w), `${x} / ${w}`).toBe(false)
    }
  })

  it('stretchy first sounds (m, s, f, l, n, r, sh) first; stop sounds after; later, one wrong picture shares a sound', () => {
    const sounds = (w: string) => K_BLEND_SOUNDS[w as keyof typeof K_BLEND_SOUNDS]
    for (const run of runs(cfg, 12)) {
      run.forEach((q, i) => {
        const me = sounds(word(q.answer))
        expect(STRETCHY_ONSETS.includes(me.onset), `${i}: ${q.prompt}`).toBe(i < 3)
        const wrong = q.options.map(word).filter((o) => o !== q.answer).map(sounds)
        const sharing = wrong.filter((x) => x.onset === me.onset || x.rest === me.rest)
        if (i < 4) expect(sharing, `${i}: ${q.prompt} ${q.options}`).toHaveLength(0)
        else expect(sharing.length, `${i}: ${q.prompt} ${q.options}`).toBeLessThanOrEqual(1)
        // the wrong pictures never share a sound with each other
        expect(wrong[0].onset === wrong[1].onset || wrong[0].rest === wrong[1].rest, `${q.options}`).toBe(false)
      })
      expect(run.slice(4).some((q) => q.options.some((o) => o !== q.answer && (sounds(word(o)).onset === sounds(word(q.answer)).onset || sounds(word(o)).rest === sounds(word(q.answer)).rest)))).toBe(true)
    }
  })

  it('moves the answer around', () => {
    for (const run of runs(cfg)) movesAround(run)
  })
})

describe('Word hunt (k-sight-1): "Find the word see."', () => {
  const cfg: KLiteracyConfig = { mode: 'sight', closeAfter: 3 }

  it('three printed sight words, the one said among them; a wrong pick hears what it says', () => {
    const asked = new Set<string>()
    for (const q of all(cfg)) {
      cardQuestion(q, { named: false })
      asked.add(word(q.answer))
      expect(q.pictureOptions!.map((o) => o.picture)).toEqual(q.options.map((o) => ({ kind: 'word', text: o })))
      // a tap says nothing (the card IS what is read), and the cards are never named
      for (const o of q.pictureOptions!) expect(o.speech).toBeUndefined()
      expect(cardsFor(q).every((c) => c.picture.kind === 'word')).toBe(true)
      q.notes!.forEach((n, i) => {
        if (q.options[i] !== q.answer) expect(voiceText(n!)).toBe(`That word is ${q.options[i]}.`)
      })
      expect(questionSteps(q, [0, 1, 2]).some((s) => s.voice && 'template' in s.voice && s.voice.template === 'k-letters/word')).toBe(false)
    }
    expect([...asked].sort()).toEqual([...K_SIGHT_WORDS].sort())
  })

  it('the wrong words look nothing like it at first, and more like it later', () => {
    const likeness = (q: ListenProblem) => q.options.filter((o) => o !== q.answer).map((o) => wordLikeness(word(o), word(q.answer)))
    let early = 0
    let late = 0
    let nEarly = 0
    let nLate = 0
    for (const run of runs(cfg, 15)) {
      run.forEach((q, i) => {
        const l = likeness(q)
        if (i < 3) {
          early += l[0] + l[1]
          nEarly += 2
          // two early wrong words never look like each other either
          const [a, b] = q.options.filter((o) => o !== q.answer).map(word)
          expect(wordLikeness(a, b), `${a} / ${b}`).toBeLessThan(3)
        } else {
          late += l[0] + l[1]
          nLate += 2
        }
      })
    }
    expect(late / nLate).toBeGreaterThan(early / nEarly + 1.5)
  })

  it('moves the answer around', () => {
    for (const run of runs(cfg)) movesAround(run)
  })
})

describe('the stages as the curriculum configures them', () => {
  it('every literacy stage config draws fair questions on any seed (via createProvider)', () => {
    const configs = curriculum.zones.flatMap((z) => zoneStages(z, 0)).filter((s) => s.providerConfig.kind === 'kLiteracy')
    expect(configs.map((s) => s.id)).toEqual(['k-rhyme-1', 'k-syllables-1', 'k-rhyme-2', 'k-blend-1', 'k-sight-1'])
    for (const s of configs) {
      for (const seed of SEEDS) {
        const qs = draw(s.providerConfig, `stage:${s.id}:${seed}`, Number(s.params?.questionCount))
        for (const q of qs) {
          common(q)
          if (!q.activity) cardQuestion(q, { named: s.id !== 'k-sight-1' })
        }
      }
    }
  })

  it('reset starts the ramp over', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('klit-reset'))
    const p = makeKLiteracyProvider({ mode: 'syllables' })
    const first = Array.from({ length: 3 }, () => p.next().answer)
    p.reset?.()
    expect(Array.from({ length: 3 }, () => p.next().answer)).toEqual(first)
  })
})
