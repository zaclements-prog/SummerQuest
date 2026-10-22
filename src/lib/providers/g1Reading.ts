import type { PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { wordOffsets, type ReadAlongSpec } from '../../games/listenPlay/activities/readAlongSpec'
import {
  CK_ENDS,
  CK_OTHERS,
  CVC_WORDS,
  DECODE_WORDS,
  DIGRAPH_STARTS,
  DIGRAPH_WORD_SETS,
  G1_WORDS,
  SHORT_VOWELS,
  VOWEL_OF,
  VOWEL_WORDS,
  firstGrapheme,
  soundsOffsets,
  type CvcWord,
  type DecodeWord,
  type G1Word,
  type ShortVowel,
  type StartDigraph,
} from '../../voice/packs/g1-phonics'
import { G1_SENTENCES, G1_SENTENCE_IDS, G1_SIGHT_WORDS, sentenceWords, type G1SentenceId, type G1SightWord } from '../../voice/packs/g1-words'
import type { VoiceRef } from '../../voice/types'
import { shuffle } from '../random'
import { cap, g1Alike, g1Cards, g1Picture } from './g1Shared'
import { wordLikeness } from './kLiteracy'
import { makeDeck, makePositionGuard, pickOne } from './kShared'

/**
 * Word Reef (Reading Reef for 1st grade, RF.1.2–4), voice-first, for the
 * Listen & Play shell. Every question is said; what is printed is what the
 * child is learning to read (letters, letter teams, words, a sentence).
 *
 * - `vowels` ("Short vowels"): "Which one has the short A sound, like
 *   apple?" (the letter shown, three named pictures, one with that vowel),
 *   taking turns with the middle-sound gap: "Cat! What sound is in the
 *   middle?" (the cat, "c _ t", three vowel tiles; the `readAlong` activity).
 *   Vowels that sound alike (e and i, a and e, o and u) only share a question
 *   from `closeAfter` on.
 * - `digraphs` ("Letter teams", RF.1.3a): "S and H say shh. Which one starts
 *   with shh?" (sh, ch, th, wh; "…ends with kuh?" for ck), and "Tap the word
 *   ship." (ship, chip, hip). Later, a wrong picture starts with a sound close
 *   to the team's (sun for sh, tub for th).
 * - `decode` ("Read a word", RF.1.3b): a printed word, three pictures; the
 *   word is never said until it is answered (a miss sounds it out, each
 *   letter lighting). Three-letter words first, then a wrong picture that
 *   looks like it in print (hat for cat), then words with a letter team.
 * - `sentences` ("Read along", RF.1.4): a sentence read aloud, each word
 *   lighting, then a question answered with a picture. Four words, then five,
 *   then six.
 * - `sight` ("Sight words", RF.1.3g): "Find the word could." — three word
 *   cards from the Dolch first-grade list, later ones that look alike.
 */

export type G1ReadingMode = 'vowels' | 'digraphs' | 'decode' | 'sentences' | 'sight'

export interface G1ReadingConfig {
  mode?: G1ReadingMode
  /** From this item on (counting from 0), one wrong card is a close one (see above). Default 3. */
  closeAfter?: number
}

/** Vowels a 1st grader easily hears as one another: one of them is the close wrong card later in the stage. */
const CONFUSED: Record<ShortVowel, readonly ShortVowel[]> = { a: ['e'], e: ['i', 'a'], i: ['e'], o: ['u'], u: ['o'] }
/** The pairs that never share a question early on (short e and i, short o and u: the hardest to hear apart). */
const APART: readonly (readonly [ShortVowel, ShortVowel])[] = [
  ['e', 'i'],
  ['o', 'u'],
]
const apart = (x: ShortVowel, y: ShortVowel) => APART.some(([a, b]) => (a === x && b === y) || (a === y && b === x))

/** Sounds close to a letter team's: the first sound of a wrong picture that makes a question harder. */
const CLOSE_START: Record<StartDigraph, readonly string[]> = { sh: ['s', 'ch'], ch: ['sh', 't'], th: ['t', 'f'], wh: ['w'] }

const SKILL: Record<G1ReadingMode, { id: string; label: string }> = {
  vowels: { id: 'g1-short-vowels', label: 'short vowel sounds' },
  digraphs: { id: 'g1-digraphs', label: 'letter teams: sh, ch, th' },
  decode: { id: 'g1-decoding', label: 'reading short words' },
  sentences: { id: 'g1-read-along', label: 'reading sentences' },
  sight: { id: 'g1-sight-words', label: '1st-grade sight words' },
}

const PRAISE: Record<G1ReadingMode, VoiceRef[]> = {
  vowels: [{ line: 'g1-phonics/sharpEars' }, { line: 'k-letters/greatListening' }],
  digraphs: [{ line: 'g1-phonics/sharpEars' }, { line: 'g1-phonics/greatSounding' }],
  decode: [{ line: 'g1-phonics/youReadIt' }, { line: 'g1-phonics/greatSounding' }],
  sentences: [{ line: 'g1-words/youReadIt' }, { line: 'g1-words/greatReader' }],
  sight: [{ line: 'k-words/youCanRead' }, { line: 'g1-words/greatReader' }],
}

/** Every picture word the vowel and letter-team questions can show. */
const PICTURE_WORDS = Object.keys(G1_WORDS) as G1Word[]

/** A letter (or letter team) tile, said by its name when tapped ("A!"). */
function letterCard(ch: string): PictureOption {
  return { value: ch, picture: { kind: 'letter', ch }, speech: { template: 'k-letters/letter', slots: { letter: ch.toUpperCase() } } }
}

/** The sounding-out line for a word, with where each of its letters is said. */
function soundsRead(w: G1Word): ReadAlongSpec['read'] {
  const { sounds, word } = soundsOffsets(w)
  return { line: { line: `g1-phonics/sounds-${w}` }, at: sounds, whole: word }
}

export function makeG1ReadingProvider(cfg: G1ReadingConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'vowels'
  const closeFrom = cfg.closeAfter ?? 3
  let serial = 0
  const places = makePositionGuard()
  const vowels = makeDeck(SHORT_VOWELS)
  const byVowel = Object.fromEntries(SHORT_VOWELS.map((v) => [v, makeDeck(VOWEL_WORDS.filter((w) => VOWEL_OF[w] === v))])) as Record<ShortVowel, ReturnType<typeof makeDeck<G1Word>>>
  const gapWords = makeDeck<CvcWord>(CVC_WORDS)
  const teams = makeDeck<StartDigraph>(['sh', 'ch', 'th', 'sh', 'ch', 'th', 'wh'])
  const byTeam = Object.fromEntries((Object.keys(DIGRAPH_STARTS) as StartDigraph[]).map((d) => [d, makeDeck<G1Word>(DIGRAPH_STARTS[d])])) as Record<StartDigraph, ReturnType<typeof makeDeck<G1Word>>>
  const ckWords = makeDeck<G1Word>(CK_ENDS)
  const wordSets = makeDeck(DIGRAPH_WORD_SETS.map((_, i) => i))
  const cvc = makeDeck<DecodeWord>(CVC_WORDS)
  const teamWords = makeDeck<DecodeWord>(DECODE_WORDS.filter((w) => !(CVC_WORDS as readonly string[]).includes(w)))
  const byLength = [4, 5, 6].map((n) => makeDeck(G1_SENTENCE_IDS.filter((id) => sentenceWords(G1_SENTENCES[id].text).length === n)))
  const sightWords = makeDeck<G1SightWord>(G1_SIGHT_WORDS)

  const close = () => serial >= closeFrom
  const base = (sub: string) => ({
    id: `g1read-${mode}-${serial}`,
    topic: 'g1Reading',
    subtopic: sub,
    skill: SKILL[mode],
    praise: PRAISE[mode],
    walkthrough: 'none' as const,
  })

  /** `k` wrong pictures from `pool`: none like the answer or each other, each passing `ok`; with `near`, the first one passes it. */
  function wrongPictures(pool: readonly G1Word[], answer: G1Word, k: number, ok: (w: G1Word, chosen: G1Word[]) => boolean, near?: (w: G1Word) => boolean): G1Word[] {
    const out: G1Word[] = []
    const fits = (w: G1Word) => w !== answer && !g1Alike(w, answer) && !out.includes(w) && out.every((o) => !g1Alike(o, w)) && ok(w, out)
    if (near) {
      const n = shuffle(pool).find((w) => fits(w) && near(w))
      if (n) out.push(n)
    }
    for (const w of shuffle(pool)) {
      if (out.length >= k) break
      if (fits(w)) out.push(w)
    }
    return out
  }

  /** Two vowels to go with `v`: none that sound like it (or each other) early on; later, one that does. */
  function otherVowels(v: ShortVowel): ShortVowel[] {
    const rest = SHORT_VOWELS.filter((x) => x !== v)
    if (close()) {
      const near = pickOne(CONFUSED[v])
      const far = pickOne(rest.filter((x) => x !== near && !apart(x, near) && !apart(x, v)))
      return [near, far]
    }
    const far = rest.filter((x) => !apart(x, v))
    const a = pickOne(far)
    const b = pickOne(far.filter((x) => x !== a && !apart(x, a)))
    return [a, b]
  }

  // ── Short vowels ──

  function whichVowel(): ListenProblem {
    const v = vowels.next()
    const answer = byVowel[v].next()
    // one picture for each of two other vowels (never two that look alike)
    const others: G1Word[] = []
    for (const u of otherVowels(v)) {
      const [pick] = wrongPictures(
        VOWEL_WORDS.filter((w) => VOWEL_OF[w] === u && others.every((o) => !g1Alike(o, w))),
        answer,
        1,
        () => true,
      )
      others.push(pick)
    }
    const options = places.arrange<string>([answer, ...others], answer)
    return {
      ...base('whichVowel'),
      prompt: `Which one has the short ${v.toUpperCase()} sound?`,
      options,
      answer,
      speech: { line: `g1-phonics/vowelQ-${v}` },
      picture: { kind: 'letter', ch: v },
      pictureOptions: g1Cards(options),
      cues: [{ target: 'picture' }],
      nameCards: true,
      // "Dog has the short O sound."
      notes: options.map((w) => (w === answer ? null : { line: `g1-phonics/vowelIn-${w}` })),
    }
  }

  function middle(): ListenProblem {
    const w = gapWords.next()
    const v = VOWEL_OF[w]!
    const options = places.arrange<string>([v, ...otherVowels(v)], v)
    const units = [...G1_WORDS[w]]
    const activity: ReadAlongSpec = {
      kind: 'readAlong',
      layout: 'gap',
      units,
      gap: 1,
      picture: g1Picture(w),
      cards: options.map(letterCard),
      read: soundsRead(w),
      helpIntro: { line: 'g1-phonics/soundItOut' },
    }
    const speech: VoiceRef = { template: 'g1-phonics/middle', slots: { word: cap(w) } }
    return {
      ...base('middle'),
      prompt: `${cap(w)}! What sound is in the middle? Tap the letter.`,
      options,
      answer: v,
      speech,
      activity,
    }
  }

  // ── Letter teams ──

  function startsWith(): ListenProblem {
    const d = teams.next()
    const answer = byTeam[d].next()
    const team = (w: G1Word) => firstGrapheme(w)
    // wrong pictures never start with the team (or a picture that could: "three" for th); later one starts close to it
    const pool = PICTURE_WORDS.filter((w) => team(w) !== d && !(d === 'th' && w === 'three'))
    const others = wrongPictures(
      pool,
      answer,
      2,
      (w, chosen) => (close() ? true : !CLOSE_START[d].includes(team(w))) && chosen.every((c) => team(c) !== team(w)),
      close() ? (w) => CLOSE_START[d].includes(team(w)) : undefined,
    )
    const options = places.arrange<string>([answer, ...others], answer)
    return {
      ...base('startsWith'),
      prompt: `Which one starts with ${d}?`,
      options,
      answer,
      speech: { line: `g1-phonics/startsQ-${d}` },
      picture: { kind: 'letter', ch: d },
      pictureOptions: g1Cards(options),
      cues: [{ target: 'picture' }],
      nameCards: true,
      // "Sun starts with ssss."
      notes: options.map((w) => (w === answer ? null : { line: `g1-phonics/starts-${w}` })),
    }
  }

  function endsCk(): ListenProblem {
    const answer = ckWords.next()
    const others = wrongPictures(CK_OTHERS, answer, 2, () => true)
    const options = places.arrange<string>([answer, ...others], answer)
    return {
      ...base('endsCk'),
      prompt: 'Which one ends with ck?',
      options,
      answer,
      speech: { line: 'g1-phonics/endsQ-ck' },
      picture: { kind: 'letter', ch: 'ck' },
      pictureOptions: g1Cards(options),
      cues: [{ target: 'picture' }],
      nameCards: true,
      // "Bus ends with ssss."
      notes: options.map((w) => (w === answer ? null : { line: `g1-phonics/ends-${w}` })),
    }
  }

  function tapWord(): ListenProblem {
    const set = DIGRAPH_WORD_SETS[wordSets.next()]
    const answer = set[0]
    const options = places.arrange<string>([...set], answer)
    return {
      ...base('tapWord'),
      prompt: `Tap the word ${answer}.`,
      options,
      answer,
      speech: { template: 'g1-phonics/tapWord', slots: { word: answer } },
      // the printed words (no voice on a tap: the card IS what is being read)
      pictureOptions: options.map((w) => ({ value: w, picture: { kind: 'word', text: w } })),
      cues: [{ target: 'cards', cue: 'word' }],
      // "That word is chip."
      notes: options.map((w) => (w === answer ? null : { template: 'g1-phonics/thatWordIs', slots: { word: w } })),
    }
  }

  // ── Read a word ──

  function decode(): ListenProblem {
    // three-letter words, then one wrong picture that looks like it in print, then letter-team words
    const w: DecodeWord = serial >= 4 ? teamWords.next() : cvc.next()
    const g = G1_WORDS[w] as readonly string[]
    const looksLike = (x: G1Word) => {
      const h = G1_WORDS[x] as readonly string[]
      return h[0] === g[0] || (h.length === g.length && h.slice(1).join('') === g.slice(1).join(''))
    }
    const pool = [...new Set<G1Word>([...DECODE_WORDS, ...VOWEL_WORDS, ...Object.values(DIGRAPH_STARTS).flat()])].filter((x) => x !== 'three')
    const near = serial >= 2
    const others = wrongPictures(pool, w, 2, (x, chosen) => (near ? true : !looksLike(x)) && chosen.every((c) => firstGrapheme(c) !== firstGrapheme(x)), near ? looksLike : undefined)
    const options = places.arrange<string>([w, ...others], w)
    const activity: ReadAlongSpec = {
      kind: 'readAlong',
      layout: 'word',
      units: [...g],
      cards: g1Cards(options),
      read: soundsRead(w),
      helpIntro: { line: 'g1-phonics/soundItOut' },
    }
    return {
      ...base('decode'),
      prompt: 'Read the word. Then tap its picture.',
      options,
      answer: w,
      speech: { line: 'g1-phonics/readWord' },
      activity,
    }
  }

  // ── Read along ──

  function sentence(): ListenProblem {
    const id: G1SentenceId = byLength[serial < 2 ? 0 : serial < 4 ? 1 : 2].next()
    const s = G1_SENTENCES[id]
    const units = sentenceWords(s.text)
    const options = places.arrange<string>([s.answer, ...s.others], s.answer)
    const key = units.findIndex((u) => u.toLowerCase().replace(/[^a-z]/g, '') === s.answer)
    const activity: ReadAlongSpec = {
      kind: 'readAlong',
      layout: 'sentence',
      units,
      cards: g1Cards(options),
      read: { line: { line: `g1-words/sent-${id}` }, at: wordOffsets(s.text) },
      ask: { line: `g1-words/ask-${id}` },
      nameCards: true,
      helpIntro: { line: 'g1-words/readAgain' },
      key,
    }
    return {
      ...base('sentence'),
      prompt: s.text,
      options,
      answer: s.answer,
      speech: { line: `g1-words/sent-${id}` },
      activity,
    }
  }

  // ── Sight words ──

  function sight(): ListenProblem {
    const t = sightWords.next()
    // first words that look nothing like it, later ones that do ("them" beside "then" and "when")
    const ranked = shuffle(G1_SIGHT_WORDS.filter((w) => w !== t)).sort((a, b) => wordLikeness(a, t) - wordLikeness(b, t))
    const near = close()
    const from = near ? ranked.slice(-3) : ranked.slice(0, 8)
    const others: G1SightWord[] = []
    for (const w of shuffle(from)) {
      if (others.length >= 2) break
      if (!near && others.some((o) => wordLikeness(o, w) >= 4)) continue
      others.push(w)
    }
    for (const w of ranked) if (others.length < 2 && !others.includes(w)) others.push(w)
    const options = places.arrange<string>([t, ...others], t)
    return {
      ...base('sight'),
      prompt: `Find the word ${t}.`,
      options,
      answer: t,
      speech: { template: 'g1-words/findWord', slots: { word: t } },
      pictureOptions: options.map((w) => ({ value: w, picture: { kind: 'word', text: w } })),
      cues: [{ target: 'cards', cue: 'word' }],
      notes: options.map((w) => (w === t ? null : { template: 'g1-words/thatWordIs', slots: { word: w } })),
    }
  }

  const DIGRAPH_ORDER = [startsWith, startsWith, tapWord, endsCk, startsWith, tapWord] as const
  function make(): ListenProblem {
    switch (mode) {
      case 'vowels':
        return serial % 2 === 0 ? whichVowel() : middle()
      case 'digraphs':
        return DIGRAPH_ORDER[serial % DIGRAPH_ORDER.length]()
      case 'decode':
        return decode()
      case 'sentences':
        return sentence()
      case 'sight':
        return sight()
    }
  }

  return {
    topic: 'g1Reading',
    reset() {
      serial = 0
      places.reset()
    },
    next(): ListenProblem {
      const p = make()
      serial++
      places.note(p.options.indexOf(p.answer))
      return p
    },
  }
}
