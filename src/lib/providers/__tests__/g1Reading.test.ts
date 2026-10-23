import { afterEach, describe, expect, it, vi } from 'vitest'
import { curriculum, getZone, zoneStages } from '../../../curriculum'
import { createProvider } from '..'
import { makeG1ReadingProvider, type G1ReadingConfig } from '../g1Reading'
import { G1_LOOKALIKES, G1_NEW_WORD_EMOJI, g1Alike, g1Emoji, g1Name, g1Picture } from '../g1Shared'
import { literacyEmoji, wordLikeness } from '../kLiteracy'
import { seededRng } from '../../random'
import type { Picture } from '../../problem'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import {
  CK_ENDS,
  CK_OTHERS,
  CVC_WORDS,
  DECODE_WORDS,
  DIGRAPH_STARTS,
  DIGRAPH_WORD_SETS,
  G1_NEW_PICTURE_WORDS,
  G1_WORDS,
  SOUNDED_WORDS,
  VOWEL_OF,
  firstGrapheme,
  lastGrapheme,
  soundsOffsets,
  soundsText,
  type G1Word,
  type ShortVowel,
} from '../../../voice/packs/g1-phonics'
import { G1_SENTENCES, G1_SENTENCE_IDS, G1_SIGHT_WORDS, sentenceWords } from '../../../voice/packs/g1-words'
import { activityDef } from '../../../games/listenPlay/activities'
import { RA_GAP, RA_PICTURE, RA_TEXT, type ReadAlongSpec } from '../../../games/listenPlay/activities/readAlongSpec'
import { activityAskSteps, hasPicturePanel, questionSteps } from '../../../games/listenPlay/script'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { SKILLS } from '../../../tutoring/skills'

/**
 * Word Reef (1st grade, phase-2b contract), fuzzed over many seeds: short
 * vowels, letter teams, reading a word, read-along sentences and sight words.
 * Every question has one right answer among its cards and wrong cards that
 * can't be taken for right; every picture is one every Android tablet draws;
 * everything said resolves to a voice line; the word to read is never said
 * before it is read.
 */

afterEach(() => vi.restoreAllMocks())

const SEEDS = 'abcdefghijkl'.split('')
const PER_SEED = 36

function run(cfg: G1ReadingConfig, seed: string, n = PER_SEED): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(`g1read:${cfg.mode}:${seed}`))
  const p = makeG1ReadingProvider(cfg)
  return Array.from({ length: n }, () => p.next())
}
/** Every seed's round of a stage (items from 0: the stage's ramp), and a long run per seed. */
const rounds = (cfg: G1ReadingConfig, n = 6) => SEEDS.map((s) => run(cfg, s, n))
const all = (cfg: G1ReadingConfig) => SEEDS.flatMap((s) => run(cfg, s))

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

const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

function pictureOk(pic: Picture): boolean {
  if (pic.kind === 'emoji') return oldEmoji(pic.emoji)
  if (pic.kind === 'numeral') return pic.n === 3
  if (pic.kind === 'letter') return /^([a-z]|sh|ch|th|wh|ck)$/.test(pic.ch)
  if (pic.kind === 'word') return /^[a-z]+$/.test(pic.text)
  return false
}

const where = (q: ListenProblem) => `${q.prompt} ${JSON.stringify(q.options)} → ${q.answer}`

/** What every Word Reef question has: a clean prompt that is what's said, a skill, praise, and 3 options with the answer once. */
function common(q: ListenProblem) {
  const w = where(q)
  expect(q.prompt, w).not.toMatch(/undefined|NaN|\{|\s{2}|\s[,.!;:]/)
  expect(SKILLS[q.skill!.id], w).toMatchObject({ zoneId: 'reading-reef', lessonId: 'g1Reading' })
  for (const p of q.praise ?? []) said(p)
  expect(q.options, w).toHaveLength(3)
  expect(new Set(q.options).size, w).toBe(3)
  expect(q.options.filter((o) => o === q.answer), w).toHaveLength(1)
  expect(q.walkthrough).toBe('none')
}

/** A card question (the shell's own cards): pictures that match the options, the guide's cues, a word about each wrong card. */
function cardQuestion(q: ListenProblem, { named }: { named: boolean }) {
  const w = where(q)
  common(q)
  expect(q.activity, w).toBeUndefined()
  expect(said(q.speech), w).toBe(q.prompt.startsWith('Which one') ? said(q.speech) : q.prompt)
  expect(q.pictureOptions!.map((o) => o.value), w).toEqual(q.options)
  for (const o of q.pictureOptions!) expect(pictureOk(o.picture), `${w}: ${JSON.stringify(o.picture)}`).toBe(true)
  expect(new Set(q.pictureOptions!.map((o) => JSON.stringify(o.picture))).size, w).toBe(3)
  if (q.picture) expect(pictureOk(q.picture), w).toBe(true)
  expect(q.nameCards ?? false, w).toBe(named)
  if (named) for (const o of q.pictureOptions!) said(o.speech)
  expect(q.notes, w).toHaveLength(3)
  q.notes!.forEach((n, i) => (q.options[i] === q.answer ? expect(n, w).toBeNull() : said(n)))
  for (const c of q.cues ?? []) {
    if (typeof c.cue === 'string') expect(phraseIndex(said(q.speech), c.cue), `"${c.cue}" in ${q.prompt}`).toBeGreaterThanOrEqual(0)
    if (c.target === 'picture') expect(hasPicturePanel(q)).toBe(true)
  }
  expect(questionSteps(q, [0, 1, 2])[0].voice).toEqual(q.speech)
}

/** A `readAlong` question: the activity's cards are the options, its offsets fall inside its lines, and the shell can ask it. */
function readAlongQuestion(q: ListenProblem): ReadAlongSpec {
  const w = where(q)
  common(q)
  const a = q.activity as ReadAlongSpec
  expect(a.kind, w).toBe('readAlong')
  expect(activityDef(a), w).not.toBeNull()
  expect(a.cards.map((c) => c.value), w).toEqual(q.options)
  for (const c of a.cards) {
    expect(pictureOk(c.picture), `${w}: ${JSON.stringify(c.picture)}`).toBe(true)
    said(c.speech)
  }
  expect(new Set(a.cards.map((c) => JSON.stringify(c.picture))).size, w).toBe(3)
  const text = said(a.read.line)
  expect(a.read.at, w).toHaveLength(a.units.length)
  let last = -1
  for (const at of a.read.at) {
    expect(at, w).toBeGreaterThan(last)
    expect(at, w).toBeLessThan(text.length)
    last = at
  }
  if (a.read.whole !== undefined) expect(a.read.whole, w).toBeGreaterThan(last)
  if (a.helpIntro) said(a.helpIntro)
  const steps = activityAskSteps(q, activityDef(a))
  expect(steps[0].voice, w).toBeTruthy()
  for (const s of steps) if (typeof s.cue === 'string') expect(phraseIndex(voiceText(steps[0].voice!), s.cue), `"${s.cue}" in ${q.prompt}`).toBeGreaterThanOrEqual(0)
  return a
}

/** Never the same question twice running; the answer moves (never three times in one place) and uses every place. */
function movesAround(qs: ListenProblem[]) {
  const at = qs.map((q) => q.options.indexOf(q.answer))
  for (let i = 1; i < qs.length; i++) expect(qs[i].prompt === qs[i - 1].prompt && qs[i].answer === qs[i - 1].answer, `item ${i}: ${qs[i].prompt}`).toBe(false)
  for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `positions ${at.slice(i - 2, i + 1)}`).toBe(false)
  for (let k = 0; k < 3; k++) expect(at.filter((x) => x === k).length, `answer at card ${k}`).toBeGreaterThan(qs.length * 0.15)
}

const CONFUSED: [ShortVowel, ShortVowel][] = [
  ['e', 'i'],
  ['o', 'u'],
]
const confused = (x: string, y: string) => CONFUSED.some(([a, b]) => (a === x && b === y) || (a === y && b === x))

describe('the picture words (banks)', { timeout: 30_000 }, () => {
  it('every word has one picture every Android tablet draws, no two words share one, and each is named', () => {
    for (const [w, e] of Object.entries(G1_NEW_WORD_EMOJI)) expect(oldEmoji(e), `${w} ${e}`).toBe(true)
    // the new pictures are exactly the words kindergarten has none for (three is a numeral)
    expect(Object.keys(G1_NEW_WORD_EMOJI).sort()).toEqual(G1_NEW_PICTURE_WORDS.filter((w) => w !== 'three').sort())
    const owner = new Map<string, string>()
    for (const w of Object.keys(G1_WORDS)) {
      const pic = g1Picture(w)
      expect(pictureOk(pic), w).toBe(true)
      expect(voiceText(g1Name(w)).replace(/!$/, '').toLowerCase(), w).toBe(w === 'three' ? '3' : w)
      if (pic.kind !== 'emoji') continue
      if (owner.has(pic.emoji)) expect(owner.get(pic.emoji), `${w} and ${owner.get(pic.emoji)} share ${pic.emoji}`).toBe(w)
      owner.set(pic.emoji, w)
    }
    // …and never kindergarten's picture of another word
    for (const [w, e] of Object.entries(G1_NEW_WORD_EMOJI)) for (const k of ['ship', 'boat', 'plane', 'mouse', 'hen', 'duck', 'fish', 'whale']) if (k !== w) expect(literacyEmoji(k), `${w} vs ${k}`).not.toBe(e)
    expect(g1Emoji('three')).toBeUndefined()
    // look-alike groups are real words with pictures
    for (const g of G1_LOOKALIKES) for (const w of g) expect(g1Emoji(w) ?? literacyEmoji(w), w).toBeDefined()
  })

  it('every word is split into its sounds; sounding out lights each letter as its sound is said', () => {
    for (const w of SOUNDED_WORDS) {
      expect(G1_WORDS[w].join(''), w).toBe(w)
      const text = soundsText(w)
      expect(voiceText({ line: `g1-phonics/sounds-${w}` })).toBe(text)
      const { sounds, word } = soundsOffsets(w)
      expect(sounds, w).toHaveLength(G1_WORDS[w].length)
      expect(sounds.every((s, i) => s >= 0 && (i === 0 || s > sounds[i - 1])), `${w}: ${text} ${sounds}`).toBe(true)
      expect(text.slice(word).toLowerCase(), w).toBe(`${w}!`)
    }
    // the three-letter words have one letter per sound and a short vowel in the middle
    for (const w of CVC_WORDS) {
      expect(G1_WORDS[w], w).toHaveLength(3)
      expect(G1_WORDS[w][1]).toBe(VOWEL_OF[w])
      expect(new Set(w).size, w).toBe(3)
    }
  })

  it('the letter-team banks: each picture starts (or ends) with its team; the word sets differ only by it', () => {
    for (const [d, ws] of Object.entries(DIGRAPH_STARTS)) for (const w of ws) expect(firstGrapheme(w as G1Word), w).toBe(d)
    for (const w of CK_ENDS) expect(lastGrapheme(w), w).toBe('ck')
    // no wrong card for "ends with kuh" ends with a k sound (x says ks)
    for (const w of CK_OTHERS) expect(/(k|ck|x|ke)$/.test(w), w).toBe(false)
    for (const set of DIGRAPH_WORD_SETS) {
      expect(new Set(set).size).toBe(3)
      expect(/^(sh|ch|th|wh)|(sh|ch|th|ck)$/.test(set[0]), set[0]).toBe(true)
      for (const w of set) expect(w, set.join()).toMatch(/^[a-z]{3,4}$/)
    }
  })

  it('the read-along sentences: decodable, the answer said in the sentence, the other pictures not', () => {
    for (const id of G1_SENTENCE_IDS) {
      const s = G1_SENTENCES[id]
      const words = sentenceWords(s.text).map((x) => x.toLowerCase().replace(/[^a-z]/g, ''))
      expect(words.length, id).toBeGreaterThanOrEqual(4)
      expect(words.length, id).toBeLessThanOrEqual(6)
      expect(words, id).toContain(s.answer)
      for (const o of s.others) expect(words, `${id}: ${o}`).not.toContain(o)
      expect(new Set([s.answer, ...s.others]).size).toBe(3)
      for (const o of s.others) expect(g1Alike(o, s.answer), `${id}: ${o}`).toBe(false)
      expect(s.ask, id).toMatch(/^(Who|What|Where) .+\?$/)
    }
  })
})

describe('Short vowels (g1-vowels-1)', { timeout: 30_000 }, () => {
  const stage = zoneStages(getZone('reading-reef')!, 1).find((s) => s.id === 'g1-vowels-1')!
  const cfg = stage.providerConfig as G1ReadingConfig

  it('takes turns: a picture with the vowel, then the missing middle letter', () => {
    for (const r of rounds(cfg)) expect(r.map((q) => q.subtopic)).toEqual(['whichVowel', 'middle', 'whichVowel', 'middle', 'whichVowel', 'middle'])
  })

  it('"Which one has the short A sound?": the letter shown, one picture with that vowel, two with others; a wrong one hears its vowel', () => {
    for (const q of all(cfg).filter((x) => x.subtopic === 'whichVowel')) {
      cardQuestion(q, { named: true })
      const v = (q.picture as { ch: string }).ch
      expect(said(q.speech)).toBe(`Which one has the short ${v.toUpperCase()} sound, like ${{ a: 'apple', e: 'elephant', i: 'igloo', o: 'octopus', u: 'umbrella' }[v]}?`)
      expect(VOWEL_OF[q.answer as G1Word], where(q)).toBe(v)
      const others = q.options.filter((o) => o !== q.answer).map((o) => VOWEL_OF[o as G1Word]!)
      expect(others.every((o) => o && o !== v), where(q)).toBe(true)
      expect(others[0], where(q)).not.toBe(others[1])
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(g1Alike(String(q.options[i]), String(q.options[j])), where(q)).toBe(false)
    }
  })

  it('short e and i, short o and u (the hardest to hear apart) only share a question from the fourth item', () => {
    for (const r of rounds(cfg)) {
      for (const q of r.slice(0, 3)) {
        const vs = q.subtopic === 'middle' ? q.options.map(String) : q.options.map((o) => VOWEL_OF[o as G1Word]!)
        for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(confused(vs[i], vs[j]), `${where(q)}: ${vs}`).toBe(false)
      }
    }
  })

  it('"Cat! What sound is in the middle?": the picture, c _ t, three vowel tiles; a miss sounds it out', () => {
    for (const q of all(cfg).filter((x) => x.subtopic === 'middle')) {
      const a = readAlongQuestion(q)
      expect(a.layout).toBe('gap')
      const w = a.units.join('')
      expect(CVC_WORDS as readonly string[]).toContain(w)
      expect(a.gap).toBe(1)
      expect(a.units[1]).toBe(q.answer)
      expect(a.picture).toEqual(g1Picture(w))
      expect(said(q.speech)).toBe(`${w[0].toUpperCase()}${w.slice(1)}! What sound is in the middle? Tap the letter.`)
      expect(q.options.every((o) => 'aeiou'.includes(String(o)))).toBe(true)
      for (const c of a.cards) expect(c.picture.kind).toBe('letter')
      expect(said(a.read.line)).toBe(soundsText(w as G1Word))
      const steps = activityAskSteps(q, activityDef(a))
      expect(steps.map((s) => s.target)).toEqual([RA_PICTURE, RA_GAP, expect.any(Array)])
    }
  })

  it('every vowel, both kinds, and the answer in every place', () => {
    const qs = all(cfg)
    const vowels = new Set(qs.map((q) => (q.subtopic === 'middle' ? String(q.answer) : VOWEL_OF[q.answer as G1Word])))
    expect([...vowels].sort().join('')).toBe('aeiou')
    for (const s of SEEDS) movesAround(run(cfg, s, 60))
  })
})

describe('Letter teams (g1-digraphs-1)', { timeout: 30_000 }, () => {
  const cfg = zoneStages(getZone('reading-reef')!, 1).find((s) => s.id === 'g1-digraphs-1')!.providerConfig as G1ReadingConfig
  const close = (d: string, w: string) => ({ sh: ['s', 'ch'], ch: ['sh', 't'], th: ['t', 'f'], wh: ['w'] })[d]!.includes(firstGrapheme(w as G1Word))

  it('"S and H say shh. Which one starts with shh?": one picture starts with the team; early on no wrong one starts close to it', () => {
    for (const r of rounds(cfg, 12)) {
      r.forEach((q, i) => {
        if (q.subtopic !== 'startsWith') return
        cardQuestion(q, { named: true })
        const d = (q.picture as { ch: string }).ch
        expect(['sh', 'ch', 'th', 'wh']).toContain(d)
        expect(firstGrapheme(q.answer as G1Word), where(q)).toBe(d)
        const others = q.options.filter((o) => o !== q.answer).map(String)
        for (const o of others) expect(firstGrapheme(o as G1Word), where(q)).not.toBe(d)
        expect(firstGrapheme(others[0] as G1Word)).not.toBe(firstGrapheme(others[1] as G1Word))
        if (i < 3) for (const o of others) expect(close(d, o), `${where(q)}: ${o}`).toBe(false)
        expect(said(q.speech)).toMatch(/^[A-Z] and H say \w+\. Which one starts with \w+\?$/)
      })
    }
  })

  it('later, a wrong picture often starts with a sound close to the team (sun for sh)', () => {
    const late = SEEDS.flatMap((s) => run(cfg, s, 24).slice(3)).filter((q) => q.subtopic === 'startsWith')
    const withClose = late.filter((q) => q.options.some((o) => o !== q.answer && close((q.picture as { ch: string }).ch, String(o))))
    expect(withClose.length).toBeGreaterThan(late.length * 0.5)
  })

  it('"Which one ends with kuh?": one picture ends with ck, the others with other sounds', () => {
    for (const q of all(cfg).filter((x) => x.subtopic === 'endsCk')) {
      cardQuestion(q, { named: true })
      expect(CK_ENDS as readonly string[]).toContain(q.answer)
      for (const o of q.options) if (o !== q.answer) expect(CK_OTHERS as readonly string[]).toContain(o)
    }
  })

  it('"Tap the word ship.": three printed words that differ by the team; a wrong one hears "That word is chip."', () => {
    for (const q of all(cfg).filter((x) => x.subtopic === 'tapWord')) {
      cardQuestion(q, { named: false })
      expect(said(q.speech)).toBe(`Tap the word ${q.answer}.`)
      expect(DIGRAPH_WORD_SETS.find((s) => s[0] === q.answer)!.slice().sort()).toEqual(q.options.map(String).sort())
      for (const o of q.pictureOptions!) {
        expect(o.picture.kind).toBe('word')
        expect(o.speech).toBeUndefined()
      }
      q.notes!.forEach((n, i) => n && expect(said(n)).toBe(`That word is ${q.options[i]}.`))
    }
  })

  it('every team comes up, and the answer moves', () => {
    const qs = all(cfg)
    expect(new Set(qs.filter((q) => q.subtopic === 'startsWith').map((q) => (q.picture as { ch: string }).ch))).toEqual(new Set(['sh', 'ch', 'th', 'wh']))
    for (const s of SEEDS) movesAround(run(cfg, s, 60))
  })
})

describe('Read a word (g1-words-1)', { timeout: 30_000 }, () => {
  const cfg = zoneStages(getZone('reading-reef')!, 1).find((s) => s.id === 'g1-words-1')!.providerConfig as G1ReadingConfig

  it('the word is printed and NEVER said before it is read: not in the question, and the cards are not named', () => {
    for (const q of all(cfg)) {
      const a = readAlongQuestion(q)
      expect(a.layout).toBe('word')
      expect(a.units.join('')).toBe(q.answer)
      expect(said(q.speech)).toBe('Read the word. Then tap its picture.')
      expect(a.nameCards ?? false).toBe(false)
      for (const s of activityAskSteps(q, activityDef(a))) if (s.voice) expect(voiceText(s.voice).toLowerCase()).not.toMatch(new RegExp(`\\b${q.answer}\\b`))
      // the help sounds it out, then says it
      expect(said(a.read.line)).toBe(soundsText(q.answer as G1Word))
      expect(a.read.whole).toBeDefined()
      for (const c of a.cards) expect(c.picture.kind).toBe('emoji')
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(g1Alike(String(q.options[i]), String(q.options[j])), where(q)).toBe(false)
    }
  })

  it('ramps: three-letter words with pictures unlike it, then one that looks like it, then letter-team words', () => {
    for (const r of rounds(cfg)) {
      r.slice(0, 2).forEach((q) => {
        expect(CVC_WORDS as readonly string[]).toContain(q.answer)
        const others = q.options.filter((o) => o !== q.answer).map((o) => G1_WORDS[o as G1Word] as readonly string[])
        const g = G1_WORDS[q.answer as G1Word] as readonly string[]
        for (const h of others) expect(h[0] === g[0], where(q)).toBe(false)
      })
      r.slice(2, 4).forEach((q) => expect(CVC_WORDS as readonly string[]).toContain(q.answer))
      r.slice(4).forEach((q) => expect(DECODE_WORDS.filter((w) => !(CVC_WORDS as readonly string[]).includes(w)) as readonly string[]).toContain(q.answer))
    }
    for (const s of SEEDS) movesAround(run(cfg, s, 60))
  })
})

describe('Read along (g1-sentences-1)', { timeout: 30_000 }, () => {
  const cfg = zoneStages(getZone('reading-reef')!, 1).find((s) => s.id === 'g1-sentences-1')!.providerConfig as G1ReadingConfig

  it('the sentence is read with each word lighting, then the question, then the cards named; the answer is in the sentence', () => {
    for (const q of all(cfg)) {
      const a = readAlongQuestion(q)
      expect(a.layout).toBe('sentence')
      expect(a.units.join(' ')).toBe(q.prompt)
      expect(said(q.speech)).toBe(q.prompt)
      expect(said(a.read.line)).toBe(q.prompt)
      said(a.ask)
      expect(a.nameCards).toBe(true)
      expect(a.units[a.key!].toLowerCase().replace(/[^a-z]/g, '')).toBe(q.answer)
      // asked: the child reads it first ("Read the sentence!"), never read aloud
      const steps = activityAskSteps(q, activityDef(a))
      expect(steps[0]).toMatchObject({ voice: { line: 'g1-words/readFirst' }, target: RA_TEXT })
      expect(steps[1].voice).toEqual(a.ask)
      expect(steps.map((s) => s.voice)).not.toContainEqual(a.read.line)
      // 🔊 (help): read aloud, each word lighting, then the question
      const replay = activityDef(a)!.replaySteps!(q, a)
      expect(replay[0]).toMatchObject({ voice: a.read.line, target: RA_TEXT })
      expect(replay[0].events).toHaveLength(a.units.length + 1)
      expect(replay[1].voice).toEqual(a.ask)
    }
  })

  it('four words first, then five, then six', () => {
    for (const r of rounds(cfg, 5)) expect(r.map((q) => q.prompt.split(' ').length)).toEqual([4, 4, 5, 5, 6])
    for (const s of SEEDS) movesAround(run(cfg, s, 60))
  })
})

describe('Sight words (g1-sight-1)', { timeout: 30_000 }, () => {
  const cfg = zoneStages(getZone('reading-reef')!, 1).find((s) => s.id === 'g1-sight-1')!.providerConfig as G1ReadingConfig

  it('"Find the word could.": three Dolch first-grade word cards, never named; a wrong one hears its word', () => {
    for (const q of all(cfg)) {
      cardQuestion(q, { named: false })
      expect(said(q.speech)).toBe(`Find the word ${q.answer}.`)
      for (const o of q.options) expect(G1_SIGHT_WORDS as readonly string[]).toContain(o)
    }
    const seen = new Set(all(cfg).map((q) => q.answer))
    expect(seen.size).toBe(G1_SIGHT_WORDS.length)
  })

  it('look-alike words come later in the stage', () => {
    const like = (q: ListenProblem) => Math.max(...q.options.filter((o) => o !== q.answer).map((o) => wordLikeness(String(o), String(q.answer))))
    const rs = rounds(cfg)
    const early = rs.flatMap((r) => r.slice(0, 3).map(like))
    const late = rs.flatMap((r) => r.slice(3).map(like))
    expect(late.reduce((a, b) => a + b, 0) / late.length).toBeGreaterThan(early.reduce((a, b) => a + b, 0) / early.length + 1)
    for (const s of SEEDS) movesAround(run(cfg, s, 60))
  })
})

describe('Word Reef in the curriculum', { timeout: 30_000 }, () => {
  it('every stage draws its questions from the createProvider registry', () => {
    const reef = curriculum.zones.find((z) => z.id === 'reading-reef')!
    for (const st of reef.stagesByBand!.g1!) {
      const p = createProvider(st.providerConfig)
      expect(p.topic).toBe('g1Reading')
      const q = p.next() as ListenProblem
      expect(q.speech).toBeDefined()
    }
  })
})
