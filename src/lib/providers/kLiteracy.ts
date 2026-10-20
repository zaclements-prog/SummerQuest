import type { Picture, PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import type { DrumSpec } from '../../games/listenPlay/activities/drumSpec'
import { K_PICTURE_WORDS } from '../../voice/packs/k-letters'
import { K_MORE_PICTURE_WORDS, K_NUMBER_WORDS, K_RHYME_TARGETS, K_VERSES, type KVerseId } from '../../voice/packs/k-rhymes'
import { K_BLEND_SOUNDS, K_BLEND_WORDS, K_DRUM_PARTS, K_DRUM_WORDS, STRETCHY_ONSETS, type KBlendWord, type KDrumWord } from '../../voice/packs/k-sounds'
import { K_SIGHT_WORDS, type KSightWord } from '../../voice/packs/k-words'
import type { VoiceRef } from '../../voice/types'
import { shuffle } from '../random'
import { K_WORD_EMOJI, type KWord } from './kLetters'
import { makeDeck, makePositionGuard, pickOne } from './kShared'

/**
 * Kindergarten literacy (RF.K.2–3) for the Listen & Play shell: Letter Reef's
 * rhyming, word parts, blending and sight-word stages. Voice-first: every
 * question is said, every picture named; the only printed words are the
 * sight-word cards.
 *
 * - `rhyme` ("Rhyme time"): "Which one rhymes with cat?" — the cat shown,
 *   three pictures named as they light up; one rhymes. A wrong pick hears
 *   "cat, dog. Those don't rhyme."
 * - `finishRhyme` ("Finish the rhyme"): a traditional nursery rhyme stops
 *   before its rhyming word ("Hickory, dickory, dock. The mouse ran up the…");
 *   tap the picture that finishes it.
 * - `syllables` ("Clap the parts"): the `drum` activity — the word said with
 *   its picture, the drum tapped once per part (1–3), then ✓.
 * - `blend` ("Sound it out"): "Listen: mmmm… oon. What word?", three
 *   pictures. Stretchy first sounds (m, s, f, l, n, r, sh) first, stop
 *   sounds later (`stopsAfter`).
 * - `sight` ("Word hunt"): "Find the word see." — three word cards in Andika.
 *
 * `closeAfter` (counting items from 0) makes the wrong cards closer from that
 * item on: a picture that starts like the word (rhymes: listen to the END),
 * one that shares a sound with it (blending), words that look like it
 * (sight words: "see" beside "the" and "we").
 */

export type KLiteracyMode = 'rhyme' | 'finishRhyme' | 'syllables' | 'blend' | 'sight'

export interface KLiteracyConfig {
  mode?: KLiteracyMode
  /** From this item on (counting from 0), one wrong card is a close one (see above). Default: never. */
  closeAfter?: number
  /** `blend`: from this item on, the words start with a stop sound (c, d, p, b…). Default 3. */
  stopsAfter?: number
}

type KMoreWord = (typeof K_MORE_PICTURE_WORDS)[number]
type KNumberWord = keyof typeof K_NUMBER_WORDS

/**
 * Pictures for the words these stages add beyond the pilot's (k-letters
 * `K_PICTURE_WORDS` keep theirs, `K_WORD_EMOJI`): emoji every Android tablet
 * draws (Unicode 9 or older), one symbol each.
 */
export const K_MORE_WORD_EMOJI: Record<KMoreWord, string> = {
  bat: '🦇',
  key: '🔑',
  spoon: '🥄',
  balloon: '🎈',
  boat: '⛵',
  box: '📦',
  king: '🤴',
  ring: '💍',
  snail: '🐌',
  whale: '🐳',
  bed: '🛏️',
  bread: '🍞',
  clock: '⏰',
  lock: '🔒',
  plane: '✈️',
  bell: '🔔',
  shell: '🐚',
  bear: '🐻',
  pear: '🍐',
  nose: '👃',
  rose: '🌹',
  hen: '🐔',
  pen: '🖊️',
  honey: '🍯',
  money: '💰',
  crown: '👑',
  clown: '🤡',
  shoe: '👟',
  truck: '🚚',
  sheep: '🐑',
  corn: '🌽',
  tub: '🛁',
  map: '🗺️',
  milk: '🥛',
  fire: '🔥',
  ship: '🚢',
}

/** Pictures for the drum's words that are never on a card. */
export const K_DRUM_EMOJI: Partial<Record<KDrumWord, string>> = {
  rabbit: '🐰',
  turtle: '🐢',
  spider: '🕷️',
  carrot: '🥕',
  cookie: '🍪',
  donut: '🍩',
  pumpkin: '🎃',
  candy: '🍬',
  panda: '🐼',
  popcorn: '🍿',
  snowman: '⛄',
  banana: '🍌',
  elephant: '🐘',
  butterfly: '🦋',
  tomato: '🍅',
  pineapple: '🍍',
  potato: '🥔',
  strawberry: '🍓',
  gorilla: '🦍',
  umbrella: '☂️',
  ladybug: '🐞',
  bicycle: '🚲',
  lollipop: '🍭',
  volcano: '🌋',
  violin: '🎻',
}

/** The emoji for any picture word of these stages (undefined: not a picture word, or a number word). */
export function literacyEmoji(w: string): string | undefined {
  return (K_WORD_EMOJI as Record<string, string>)[w] ?? (K_MORE_WORD_EMOJI as Record<string, string>)[w] ?? (K_DRUM_EMOJI as Record<string, string>)[w]
}

const isNumberWord = (w: string): w is KNumberWord => w in K_NUMBER_WORDS
const PILOT = new Set<string>(K_PICTURE_WORDS)

/** A card word's picture: its emoji, or a numeral for "two", "three", "four", "ten". */
export function cardPicture(w: string): Picture {
  if (isNumberWord(w)) return { kind: 'numeral', n: K_NUMBER_WORDS[w] }
  const emoji = literacyEmoji(w)
  if (!emoji) throw new Error(`kLiteracy: no picture for "${w}"`)
  return { kind: 'emoji', emoji }
}

/** What a card is called, said as it lights up and when it is tapped ("spoon!", "three!"). */
export function cardName(w: string): VoiceRef {
  if (isNumberWord(w)) return { template: 'listen/number', slots: { n: K_NUMBER_WORDS[w] } }
  return PILOT.has(w) ? { template: 'k-letters/word', slots: { word: w as KWord } } : { template: 'k-rhymes/word', slots: { word: w } }
}

/**
 * What each word ends with, for rhyming: words with the same key rhyme
 * (hat, cat, bat). Covers every card word and the verses' rhyme partners.
 */
export const RIME: Record<string, string> = {
  // the pilot's pictures
  ball: 'all', bee: 'ee', bus: 'us', cat: 'at', car: 'ar', cake: 'ake', dog: 'og', duck: 'uck', door: 'oor',
  fish: 'ish', frog: 'og', fox: 'ox', goat: 'oat', grapes: 'apes', guitar: 'ar', horse: 'orse', house: 'ouse',
  hat: 'at', lion: 'ion', lemon: 'emon', leaf: 'eaf', moon: 'oon', monkey: 'onkey', mouse: 'ouse', pig: 'ig',
  pizza: 'izza', penguin: 'uin', rainbow: 'ow', robot: 'obot', rocket: 'ocket', sun: 'un', snake: 'ake',
  star: 'ar', tiger: 'iger', tree: 'ee', train: 'ain', apple: 'apple', ant: 'ant', octopus: 'opus', orange: 'orange',
  // this set's pictures
  bat: 'at', key: 'ee', spoon: 'oon', balloon: 'oon', boat: 'oat', box: 'ox', king: 'ing', ring: 'ing',
  snail: 'ail', whale: 'ail', bed: 'ed', bread: 'ed', clock: 'ock', lock: 'ock', plane: 'ain', bell: 'ell',
  shell: 'ell', bear: 'air', pear: 'air', nose: 'ose', rose: 'ose', hen: 'en', pen: 'en', honey: 'oney',
  money: 'oney', crown: 'own', clown: 'own', shoe: 'oo', truck: 'uck', sheep: 'eep', corn: 'orn', tub: 'ub',
  map: 'ap', milk: 'ilk', fire: 'ire', ship: 'ip',
  // number words (numeral cards)
  two: 'oo', three: 'ee', four: 'oor', ten: 'en',
  // the verses' rhyme partners
  dock: 'ock', down: 'own', peep: 'eep', horn: 'orn', dub: 'ub', clothes: 'ose',
}

/**
 * Near-rhymes a five-year-old may well hear (mon-KEY and bee, octo-PUS and
 * bus) or another name a picture goes by (🐭 "rat" and cat, 🚢 "boat" and
 * goat): never offered as the rhyme, and never beside a word they could rhyme
 * with as a wrong card.
 */
const SOUNDS_LIKE: Record<string, readonly string[]> = {
  monkey: ['ee'],
  honey: ['ee'],
  money: ['ee'],
  octopus: ['us'],
  lemon: ['un'],
  lion: ['un'],
  mouse: ['at'],
  ship: ['oat'],
  boat: ['ip'],
}

/** Rhymes, but too weakly to be "the one that rhymes" (gui-TAR and car). */
const NOT_THE_RHYME = new Set(['guitar'])

const rimes = (w: string) => [RIME[w], ...(SOUNDS_LIKE[w] ?? [])].filter(Boolean)

/** Could a child hear these two as rhyming? */
export function rhymes(a: string, b: string): boolean {
  const rb = rimes(b)
  return rimes(a).some((r) => rb.includes(r))
}

/** Pictures a child could take for one another (two cats, two birds, a boat and a ship…): never in one item. */
export const LITERACY_LOOKALIKES: readonly (readonly string[])[] = [
  ['cat', 'tiger', 'lion'],
  ['bee', 'ant'],
  ['lemon', 'orange'],
  ['sun', 'star', 'fire'],
  ['dog', 'fox'],
  ['house', 'door'],
  ['goat', 'sheep'],
  ['boat', 'ship'],
  ['crown', 'king'],
  ['shell', 'snail'],
  ['whale', 'fish'],
  ['hen', 'duck'],
  ['apple', 'tomato'],
  ['bread', 'cake'],
]

export function picturesAlike(a: string, b: string): boolean {
  return LITERACY_LOOKALIKES.some((g) => g.includes(a) && g.includes(b))
}

/** A word's first sound (c and k are one sound; sh is one sound). */
export function firstSound(w: string): string {
  const blend = (K_BLEND_SOUNDS as Record<string, { onset: string }>)[w]
  if (blend) return blend.onset
  const two = w.slice(0, 2)
  if (['sh', 'ch', 'th', 'wh'].includes(two)) return two
  return w[0] === 'c' ? 'k' : w[0]
}

/** Every word a picture card can show. */
export const LITERACY_CARD_WORDS: readonly string[] = [...new Set<string>([...K_PICTURE_WORDS, ...K_MORE_PICTURE_WORDS])]

/** The words that rhyme with `t` and can be the answer to "Which one rhymes with t?". */
export function rhymeAnswers(t: string): string[] {
  return [...LITERACY_CARD_WORDS, ...Object.keys(K_NUMBER_WORDS)].filter((w) => w !== t && RIME[w] === RIME[t] && !NOT_THE_RHYME.has(w) && !picturesAlike(w, t))
}

/**
 * Wrong cards for a picture question: `k` words from `pool` that rhyme with
 * none of `noRhyme`, look like none of `notAlike`, and don't rhyme with or
 * look like each other. With `close`, the first is one that `close` accepts
 * (when there is one).
 */
function wrongCards(pool: readonly string[], k: number, noRhyme: readonly string[], notAlike: readonly string[], close?: (w: string) => boolean): string[] {
  const out: string[] = []
  const ok = (w: string) =>
    !noRhyme.includes(w) &&
    !notAlike.includes(w) &&
    noRhyme.every((r) => !rhymes(w, r)) &&
    notAlike.every((a) => !picturesAlike(w, a)) &&
    out.every((o) => o !== w && !rhymes(o, w) && !picturesAlike(o, w))
  if (close) {
    const c = shuffle(pool).find((w) => ok(w) && close(w))
    if (c) out.push(c)
  }
  for (const w of shuffle(pool)) {
    if (out.length >= k) break
    if (ok(w)) out.push(w)
  }
  return out
}

/** Words of the verse (so a picture of something the verse just said never sits among the wrong cards). */
const verseWords = (text: string) => new Set(text.toLowerCase().match(/[a-z]+/g) ?? [])

/** How alike two sight words look: shared letters, the same length, the same first and last letter. */
export function wordLikeness(a: string, b: string): number {
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  const left = [...y]
  let shared = 0
  for (const ch of x) {
    const i = left.indexOf(ch)
    if (i >= 0) {
      shared++
      left.splice(i, 1)
    }
  }
  return shared * 2 + (x.length === y.length ? 1 : 0) + (x[0] === y[0] ? 2 : 0) + (x.at(-1) === y.at(-1) ? 1 : 0)
}

const cap = (w: string) => w[0].toUpperCase() + w.slice(1)

const PRAISE: Record<KLiteracyMode, VoiceRef[]> = {
  rhyme: [{ line: 'k-rhymes/youHearRhyme' }, { line: 'k-rhymes/thatRhymes' }],
  finishRhyme: [{ line: 'k-rhymes/thatRhymes' }, { line: 'k-rhymes/youHearRhyme' }],
  syllables: [{ line: 'k-sounds/youHeardParts' }, { line: 'k-letters/greatListening' }],
  blend: [{ line: 'k-sounds/soundsTogether' }, { line: 'k-letters/greatListening' }],
  sight: [{ line: 'k-words/youCanRead' }, { line: 'k-words/greatReading' }],
}

const SKILL: Record<KLiteracyMode, { id: string; label: string }> = {
  rhyme: { id: 'k-rhymes', label: 'rhyming words' },
  finishRhyme: { id: 'k-rhymes', label: 'rhyming words' },
  syllables: { id: 'k-syllables', label: 'word parts' },
  blend: { id: 'k-blending', label: 'putting sounds together' },
  sight: { id: 'k-sight-words', label: 'sight words' },
}

export function makeKLiteracyProvider(cfg: KLiteracyConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'rhyme'
  const closeFrom = cfg.closeAfter ?? Infinity
  const stopsFrom = cfg.stopsAfter ?? 3
  let serial = 0
  const places = makePositionGuard()
  const targets = makeDeck(K_RHYME_TARGETS.filter((t) => rhymeAnswers(t).length > 0))
  const verses = makeDeck(Object.keys(K_VERSES) as KVerseId[])
  const stretchy = makeDeck(K_BLEND_WORDS.filter((w) => STRETCHY_ONSETS.includes(K_BLEND_SOUNDS[w].onset)))
  const stops = makeDeck(K_BLEND_WORDS.filter((w) => !STRETCHY_ONSETS.includes(K_BLEND_SOUNDS[w].onset)))
  const sightWords = makeDeck(K_SIGHT_WORDS)
  const byParts = [1, 2, 3].map((n) => makeDeck(K_DRUM_WORDS.filter((w) => K_DRUM_PARTS[w].length === n)))
  const counts: number[] = []
  const lastAnswer: Partial<Record<string, string>> = {}

  const base = () => ({
    id: `klit-${mode}-${serial}`,
    topic: 'kLiteracy',
    subtopic: mode,
    skill: SKILL[mode],
    praise: PRAISE[mode],
    walkthrough: 'none' as const,
  })
  const pictureCards = (words: readonly string[]): PictureOption[] => words.map((w) => ({ value: w, picture: cardPicture(w), speech: cardName(w) }))
  const close = () => serial >= closeFrom

  function rhyme(): ListenProblem {
    const t = targets.next()
    const pool = rhymeAnswers(t)
    const answer = pickOne(pool, lastAnswer[t] ? [lastAnswer[t]!] : [])
    lastAnswer[t] = answer
    // later on, one wrong picture starts like the word (cat → car): it's the END that rhymes
    const others = wrongCards(LITERACY_CARD_WORDS, 2, [t, answer], [t, answer], close() ? (w) => firstSound(w) === firstSound(t) : undefined)
    const options = places.arrange([answer, ...others], answer)
    return {
      ...base(),
      prompt: `Which one rhymes with ${t}?`,
      options,
      answer,
      speech: { template: 'k-rhymes/rhymesWith', slots: { word: t } },
      picture: cardPicture(t),
      pictureOptions: pictureCards(options),
      cues: [{ target: 'picture' }],
      // "Hat! Dog! Sun!": no guessing what a picture is called
      nameCards: true,
      // "cat, dog. Those don't rhyme."
      notes: options.map((w) => (w === answer ? null : { template: 'k-rhymes/noRhyme', slots: { a: t, b: w } })),
    }
  }

  function finishRhyme(): ListenProblem {
    const id = verses.next()
    const v = K_VERSES[id]
    const said = verseWords(v.text)
    const pool = LITERACY_CARD_WORDS.filter((w) => !said.has(w))
    const others = wrongCards(pool, 2, [v.answer, v.partner], [v.answer])
    const options = places.arrange<string>([v.answer, ...others], v.answer)
    return {
      ...base(),
      prompt: v.text,
      options,
      answer: v.answer,
      speech: { line: `k-rhymes/verse-${id}` },
      pictureOptions: pictureCards(options),
      // the cards light as the verse ends, then each is named
      cues: [{ target: 'cards', cue: 0.9 }],
      nameCards: true,
      // "dock, car. Those don't rhyme."
      notes: options.map((w) => (w === v.answer ? null : { template: 'k-rhymes/noRhyme', slots: { a: v.partner, b: w } })),
    }
  }

  function syllables(): ListenProblem {
    // a two-part word first (the one the lesson claps), then one part, then three, then any (never three alike running)
    const two = counts.slice(-2)
    const n = serial < 3 ? [2, 1, 3][serial] : pickOne([1, 2, 3], two.length === 2 && two[0] === two[1] ? [two[0]] : [])
    counts.push(n)
    const w = byParts[n - 1].next()
    const parts = K_DRUM_PARTS[w].length
    const activity: DrumSpec = {
      kind: 'drum',
      word: w,
      emoji: literacyEmoji(w)!,
      parts,
      partsLine: { line: `k-sounds/parts-${w}` },
    }
    return {
      ...base(),
      prompt: `${cap(w)}! Tap the drum for each part, then tap the check.`,
      // (the drum is the answer; the options keep the count checkable like any question)
      options: [1, 2, 3],
      answer: parts,
      speech: { template: 'k-sounds/drumWord', slots: { word: cap(w) } },
      activity,
    }
  }

  function blend(): ListenProblem {
    const w: KBlendWord = serial < stopsFrom ? stretchy.next() : stops.next()
    const me = K_BLEND_SOUNDS[w]
    const onset = (x: KBlendWord) => K_BLEND_SOUNDS[x].onset
    const rest = (x: KBlendWord) => K_BLEND_SOUNDS[x].rest
    const shares = (x: KBlendWord, y: KBlendWord) => onset(x) === onset(y) || rest(x) === rest(y)
    // wrong pictures the child can hear apart: other first sounds and other endings (later, one shares one of them)
    const fits = (x: KBlendWord, chosen: KBlendWord[]) => x !== w && !picturesAlike(x, w) && chosen.every((c) => c !== x && !picturesAlike(c, x) && !shares(c, x))
    const others: KBlendWord[] = []
    if (close()) {
      const near = shuffle(K_BLEND_WORDS).find((x) => fits(x, others) && (onset(x) === me.onset || rest(x) === me.rest))
      if (near) others.push(near)
    }
    for (const x of shuffle(K_BLEND_WORDS)) {
      if (others.length >= 2) break
      if (fits(x, others) && !shares(x, w)) others.push(x)
    }
    const options = places.arrange<string>([w, ...others], w)
    return {
      ...base(),
      prompt: `Listen: ${me.say.toLowerCase()}… ${me.rest}. What word?`,
      options,
      answer: w,
      speech: { line: `k-sounds/blend-${w}` },
      pictureOptions: pictureCards(options),
      cues: [{ target: 'cards', cue: 'What word' }],
      nameCards: true,
      // "That's fish: ffff… ish."
      notes: options.map((x) => (x === w ? null : { line: `k-sounds/that-${x}` })),
    }
  }

  function sight(): ListenProblem {
    const t: KSightWord = sightWords.next()
    // first words that look nothing like it ("see" beside "up" and "go"), later ones that do ("the", "we")
    const ranked = shuffle(K_SIGHT_WORDS.filter((w) => w !== t)).sort((a, b) => wordLikeness(a, t) - wordLikeness(b, t))
    const near = close()
    const from = near ? ranked.slice(-3) : ranked.slice(0, 6)
    const others: KSightWord[] = []
    for (const w of shuffle(from)) {
      if (others.length >= 2) break
      // two wrong words that don't look like each other, either (early on)
      if (!near && others.some((o) => wordLikeness(o, w) >= 3)) continue
      others.push(w)
    }
    for (const w of ranked) if (others.length < 2 && !others.includes(w)) others.push(w)
    const options = places.arrange<string>([t, ...others], t)
    return {
      ...base(),
      prompt: `Find the word ${t}.`,
      options,
      answer: t,
      speech: { template: 'k-words/findWord', slots: { word: t } },
      // the printed words (no voice on a tap: the card IS what is being read)
      pictureOptions: options.map((w) => ({ value: w, picture: { kind: 'word', text: w } })),
      cues: [{ target: 'cards', cue: 'word' }],
      // "That word is can."
      notes: options.map((w) => (w === t ? null : { template: 'k-words/thatWordIs', slots: { word: w } })),
    }
  }

  const MAKE: Record<KLiteracyMode, () => ListenProblem> = { rhyme, finishRhyme, syllables, blend, sight }

  return {
    topic: 'kLiteracy',
    reset() {
      serial = 0
      places.reset()
      targets.reset()
      verses.reset()
      stretchy.reset()
      stops.reset()
      sightWords.reset()
      for (const d of byParts) d.reset()
      counts.length = 0
      for (const k of Object.keys(lastAnswer)) delete lastAnswer[k]
    },
    next(): ListenProblem {
      const p = MAKE[mode]()
      serial++
      if (!p.activity) places.note(p.options.indexOf(p.answer))
      return p
    },
  }
}
