import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import type { TilesSpec } from '../../games/listenPlay/activities/tilesSpec'
import { wordOffsets } from '../../games/listenPlay/activities/readAlongSpec'
import { CVC_WORDS, G1_WORDS, SHORT_VOWELS, VOWEL_OF, soundsOffsets, type CvcWord, type ShortVowel } from '../../voice/packs/g1-phonics'
import { G1_BUILD_IDS, G1_BUILD_SENTENCES, type G1BuildId } from '../../voice/packs/g1-writing'
import { sentenceWords } from '../../voice/packs/g1-words'
import type { VoiceRef } from '../../voice/types'
import { shuffle } from '../random'
import { LOWER_FAMILIES } from '../trace/glyphs'
import type { TraceSpec } from '../trace/spec'
import { cap, g1Emoji, g1Name } from './g1Shared'
import { K_WORD_EMOJI } from './kLetters'
import { makeDeck, pickOne } from './kShared'
import { pictureWord, traceQuestion } from './kTrace'

/**
 * Writing Workshop for 1st grade (L.1.1a, L.1.2), voice-first, for the Listen
 * & Play shell:
 *
 * - `lower` ("Little letters", `g1-trace-1`): trace lowercase letters a–z
 *   with a finger on four writing lines (the `trace` activity), in
 *   ball-and-stick school order. A round deals a line letter, two from the c
 *   family, two humps or bowls and a slant letter; the decks carry on across
 *   rounds, so a few plays meet every letter.
 * - `spell` ("Spell it", `g1-spell-1`): a picture is shown and its word said;
 *   tap its letters in order into the slots (the `tiles` activity). One extra
 *   letter at first, then two, then three, and later ones that are easy to
 *   mix up (b and d, another short vowel). A miss sounds the word out, each
 *   slot lighting with its letter.
 * - `sentence` ("Build a sentence", `g1-sentence-1`): the voice says a
 *   sentence of three to five words; build it from word tiles, ending with the
 *   period tile. From the third, the first word comes in small letters too,
 *   and only the capital one starts a sentence. A miss says the rule (a
 *   capital at the start, a period at the end) and reads it, each slot lighting.
 */

export type G1WritingMode = 'lower' | 'spell' | 'sentence'

export interface G1WritingConfig {
  mode?: G1WritingMode
}

/** Letters a 1st grader mixes up, in print or in sound: later spelling questions put one on the tray. */
const MIXED_UP: Record<string, readonly string[]> = {
  b: ['d', 'p'], d: ['b'], p: ['b', 'q'], m: ['n'], n: ['m', 'h'], t: ['f'], g: ['j'], c: ['k'], h: ['n'],
  r: ['n'], s: ['z'], v: ['f'], w: ['v'], j: ['g'], x: ['z'], f: ['t'],
}
const VOWEL_MIXUP: Record<ShortVowel, ShortVowel> = { a: 'e', e: 'i', i: 'e', o: 'u', u: 'o' }
const CONSONANTS = 'bcdfghjklmnprstvwz'.split('')

const SKILL: Record<G1WritingMode, { id: string; label: string }> = {
  lower: { id: 'g1-trace-lower', label: 'writing lowercase letters' },
  spell: { id: 'g1-spelling', label: 'spelling short words' },
  sentence: { id: 'g1-sentences', label: 'writing a sentence: capital and period' },
}

const PRAISE: Record<G1WritingMode, VoiceRef[]> = {
  lower: [{ line: 'g1-writing/niceLetters' }, { line: 'k-trace/greatTracing' }],
  spell: [{ line: 'g1-writing/greatSpelling' }, { line: 'g1-phonics/greatSounding' }],
  sentence: [{ line: 'g1-writing/capitalPeriod' }, { line: 'g1-writing/greatSpelling' }],
}

/** How many lowercase letters a round deals (the stage's question count). */
export const LOWER_ROUND = 6
const LOWER_DEAL: { ids: readonly string[]; take: number }[] = [
  { ids: LOWER_FAMILIES.lines, take: 1 },
  { ids: LOWER_FAMILIES.curves, take: 2 },
  { ids: LOWER_FAMILIES.humps, take: 2 },
  { ids: LOWER_FAMILIES.slants, take: 1 },
]

/** A lowercase letter to trace: said by its name ("Let's trace little B!"), then "B!" and its picture word when done. */
export function lowerQuestion(id: string, serial: number): ListenProblem {
  const q = traceQuestion('lower', id, {
    id: `g1write-lower-${serial}`,
    topic: 'g1Writing',
    subtopic: 'lower',
    speech: { template: 'g1-writing/lower', slots: { letter: id.toUpperCase() } },
    skill: SKILL.lower,
    praise: PRAISE.lower,
  })
  const spec = q.activity as TraceSpec
  spec.name = { template: 'k-letters/letter', slots: { letter: id.toUpperCase() } }
  const w = pictureWord(id)
  if (w) spec.picture = { emoji: K_WORD_EMOJI[w], speech: { template: 'k-letters/word', slots: { word: w } } }
  return q
}

/** Where each word of a sentence (and its period) is said in the sentence's own line. */
function sentenceAt(text: string): number[] {
  return [...wordOffsets(text), text.length - 1]
}

export function makeG1WritingProvider(cfg: G1WritingConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'lower'
  let serial = 0
  // lowercase letters: a round from the family decks, kept in the family's order
  const lowerDecks = LOWER_DEAL.map((f) => makeDeck(f.ids))
  let round: string[] = []
  let at = 0
  const words = makeDeck<CvcWord>(CVC_WORDS)
  const byLength = [3, 4, 5].map((n) => makeDeck(G1_BUILD_IDS.filter((id) => sentenceWords(G1_BUILD_SENTENCES[id]).length === n)))

  function deal() {
    round = LOWER_DEAL.flatMap((f, k) => {
      const picked: string[] = []
      for (let i = 0; i < f.take; i++) picked.push(lowerDecks[k].next((x) => !picked.includes(x)))
      return picked.sort((a, b) => f.ids.indexOf(a) - f.ids.indexOf(b))
    })
    at = 0
  }

  function lower(): ListenProblem {
    if (at >= round.length) deal()
    return lowerQuestion(round[at++], serial)
  }

  function spell(): ListenProblem {
    const w = words.next()
    const letters: string[] = [...G1_WORDS[w]]
    const extras = serial < 2 ? 1 : serial < 4 ? 2 : 3
    const v = VOWEL_OF[w] as ShortVowel
    const more: string[] = []
    const add = (ch: string | undefined) => {
      if (ch && !letters.includes(ch) && !more.includes(ch) && more.length < extras) more.push(ch)
    }
    if (serial >= 2) {
      // one that is easy to mix up: a look-alike or sound-alike consonant, or the vowel that sounds closest
      const mix = letters.flatMap((l) => MIXED_UP[l] ?? []).filter((x) => !letters.includes(x))
      add(serial >= 4 && mix.length ? pickOne(mix) : VOWEL_MIXUP[v])
    }
    // another short vowel, then consonants not in the word
    add(pickOne(SHORT_VOWELS.filter((x) => x !== v && !more.includes(x))))
    for (const c of shuffle(CONSONANTS)) add(c)
    const tiles = shuffle([...letters, ...more])
    const { sounds } = soundsOffsets(w)
    const activity: TilesSpec = {
      kind: 'tiles',
      mode: 'letters',
      units: letters,
      tiles,
      tileSpeech: tiles.map((ch) => ({ template: 'k-letters/letter', slots: { letter: ch.toUpperCase() } })),
      emoji: g1Emoji(w),
      help: { line: { line: `g1-phonics/sounds-${w}` }, at: sounds },
      helpIntro: { line: 'g1-writing/spellTogether' },
      done: { line: g1Name(w), at: letters.map(() => 0) },
    }
    return {
      id: `g1write-spell-${serial}`,
      topic: 'g1Writing',
      subtopic: 'spell',
      skill: SKILL.spell,
      praise: PRAISE.spell,
      prompt: `Spell ${cap(w)}. Tap the letters.`,
      options: [],
      answer: w,
      difficulty: tiles.length,
      speech: { template: 'g1-writing/spell', slots: { word: cap(w) } },
      activity,
    }
  }

  function sentence(): ListenProblem {
    const size = [0, 0, 1, 1, 2][Math.min(serial, 4)] ?? 1
    const id: G1BuildId = byLength[size].next()
    const text = G1_BUILD_SENTENCES[id]
    const words = sentenceWords(text).map((w) => w.replace(/[.!?]$/, ''))
    const units = [...words, '.']
    const extra: string[] = []
    // from the third: the first word in small letters too (never "I", and never a word the sentence uses again)
    const first = words[0]
    const small = first.toLowerCase()
    if (serial >= 2 && first !== 'I' && !words.slice(1).includes(small)) extra.push(small)
    const tiles = shuffle([...units, ...extra])
    const read: VoiceRef = { line: `g1-writing/read-${id}` }
    const activity: TilesSpec = {
      kind: 'tiles',
      mode: 'words',
      units,
      tiles,
      tileSpeech: tiles.map(() => null),
      help: { line: read, at: sentenceAt(text) },
      helpIntro: { line: 'g1-writing/rule' },
      done: { line: read, at: sentenceAt(text) },
    }
    return {
      id: `g1write-sentence-${serial}`,
      topic: 'g1Writing',
      subtopic: 'sentence',
      skill: SKILL.sentence,
      praise: PRAISE.sentence,
      prompt: `Make this sentence. ${text}`,
      options: [],
      answer: text,
      difficulty: units.length,
      speech: { line: `g1-writing/build-${id}` },
      activity,
    }
  }

  return {
    topic: 'g1Writing',
    reset() {
      // a new round from where the decks are (a replay meets other letters and words)
      at = round.length
      serial = 0
    },
    next(): ListenProblem {
      const p = mode === 'lower' ? lower() : mode === 'spell' ? spell() : sentence()
      serial++
      return p
    },
  }
}
