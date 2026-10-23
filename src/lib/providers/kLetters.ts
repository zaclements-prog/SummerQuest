import type { PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { K_FIRST_LETTERS, K_PICTURE_WORDS, LOWER_LETTERS, UPPER_LETTERS } from '../../voice/packs/k-letters'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makeDeck, makePositionGuard } from './kShared'

/**
 * Kindergarten letters (RF.K.1d, RF.K.2–3), voice-first, for the Listen &
 * Play shell (Letter Reef). Cards are single letters or pictures; nothing
 * else is printed.
 *
 * - `findUpper`: "Tap the letter B." — three big letters;
 * - `matchCase`: "Find the little b." — a big B shown, three little letters;
 * - `firstSound`: "Which one starts with B?" — the letter shown, three
 *   pictures, each named as it lights up ("Ball! Cat! Sun!"); a wrong pick
 *   hears why ("Cat starts with C.").
 *
 * Letters that look alike (b d p q, M N W, …) never share a question at
 * first; `confusablesAfter` lets later items put one look-alike beside the
 * answer (big and little letters: from the fourth item).
 */

export type KLettersMode = 'findUpper' | 'matchCase' | 'firstSound'
export type KWord = (typeof K_PICTURE_WORDS)[number]

export interface KLettersConfig {
  mode?: KLettersMode
  /** Cards per question: 2 or 3 (default 3). */
  choices?: 2 | 3
  /**
   * From this item on (counting from 0), a look-alike letter may sit beside
   * the answer (half the time). Default: never.
   */
  confusablesAfter?: number
}

/** The picture for each word in the k-letters voice pack: emoji every Android tablet draws (Unicode 9 or older). */
export const K_WORD_EMOJI: Record<KWord, string> = {
  ball: '⚽',
  bee: '🐝',
  bus: '🚌',
  cat: '🐱',
  car: '🚗',
  cake: '🎂',
  dog: '🐶',
  duck: '🦆',
  door: '🚪',
  fish: '🐟',
  frog: '🐸',
  fox: '🦊',
  goat: '🐐',
  grapes: '🍇',
  guitar: '🎸',
  horse: '🐴',
  house: '🏠',
  hat: '🎩',
  lion: '🦁',
  lemon: '🍋',
  leaf: '🍁',
  moon: '🌙',
  monkey: '🐵',
  mouse: '🐭',
  pig: '🐷',
  pizza: '🍕',
  penguin: '🐧',
  rainbow: '🌈',
  robot: '🤖',
  rocket: '🚀',
  sun: '☀️',
  snake: '🐍',
  star: '⭐',
  tiger: '🐯',
  tree: '🌳',
  train: '🚂',
  apple: '🍎',
  ant: '🐜',
  octopus: '🐙',
  orange: '🍊',
}

/** Letters that look alike: never two from one set in an item, until look-alikes are allowed. */
export const UPPER_LOOKALIKES = ['BDPR', 'CGOQ', 'EF', 'IJLT', 'MNW', 'HN', 'UV', 'KX', 'AV']
export const LOWER_LOOKALIKES = ['bdpq', 'hnu', 'mnw', 'ijlt', 'aceo', 'gqy', 'ft', 'vwy', 'rn']

/** Pictures a child could take for one another (two cats, two bugs, two yellow sky things…): never in one item. */
export const LOOKALIKE_WORDS: readonly (readonly KWord[])[] = [
  ['cat', 'tiger', 'lion'],
  ['bee', 'ant'],
  ['lemon', 'orange'],
  ['sun', 'star'],
  ['dog', 'fox'],
  ['house', 'door'],
]

export function looksAlike(a: string, b: string): boolean {
  const sets = a === a.toUpperCase() && b === b.toUpperCase() ? UPPER_LOOKALIKES : LOWER_LOOKALIKES
  return sets.some((s) => s.includes(a) && s.includes(b))
}

function picturesAlike(a: KWord, b: KWord): boolean {
  return LOOKALIKE_WORDS.some((g) => g.includes(a) && g.includes(b))
}

const letterLabel = (ch: string): VoiceRef => ({ template: 'k-letters/letter', slots: { letter: ch.toUpperCase() } })
const PRAISE: VoiceRef[] = [{ line: 'k-letters/youKnowLetters' }, { line: 'k-letters/greatListening' }]

export function makeKLettersProvider(cfg: KLettersConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'findUpper'
  const choices = cfg.choices ?? 3
  const lookalikesFrom = cfg.confusablesAfter ?? Infinity
  let serial = 0
  const upper = makeDeck(UPPER_LETTERS)
  const lower = makeDeck(LOWER_LETTERS)
  const firsts = makeDeck(K_FIRST_LETTERS)
  const places = makePositionGuard()
  const lastWord: Partial<Record<string, KWord>> = {}

  /**
   * `k` other letters for `answer` from `alphabet`: never one that looks like
   * the answer or like each other — unless `lookalike`, when the first is one
   * that looks like the answer (b beside d), if it has any.
   */
  function otherLetters(answer: string, alphabet: readonly string[], k: number, lookalike: boolean): string[] {
    const out: string[] = []
    if (lookalike) {
      const twins = alphabet.filter((c) => c !== answer && looksAlike(c, answer))
      if (twins.length) out.push(twins[randInt(0, twins.length - 1)])
    }
    for (const c of shuffle(alphabet)) {
      if (out.length >= k) break
      if (c === answer || out.includes(c)) continue
      if (looksAlike(c, answer) || out.some((o) => looksAlike(o, c))) continue
      out.push(c)
    }
    return out
  }

  const base = () => ({ id: `kletter-${serial}`, topic: 'kLetters', subtopic: mode, praise: PRAISE, walkthrough: 'none' as const })

  function findUpper(): ListenProblem {
    const t = upper.next()
    const options = places.arrange([t, ...otherLetters(t, UPPER_LETTERS, choices - 1, false)], t)
    return {
      ...base(),
      prompt: `Tap the letter ${t}.`,
      options,
      answer: t,
      skill: { id: 'k-letters-names', label: 'letter names' },
      speech: { template: 'k-letters/tapLetter', slots: { letter: t } },
      pictureOptions: options.map<PictureOption>((c) => ({ value: c, picture: { kind: 'letter', ch: c }, speech: letterLabel(c) })),
      cues: [{ target: 'cards', cue: 'letter' }],
      // a miss: "This is the letter A." as the A lights up
      reteach: { template: 'k-letters/thisIsLetter', slots: { letter: t } },
    }
  }

  function matchCase(): ListenProblem {
    const t = lower.next()
    const lookalike = serial >= lookalikesFrom && randInt(0, 1) === 1
    const options = places.arrange([t, ...otherLetters(t, LOWER_LETTERS, choices - 1, lookalike)], t)
    return {
      ...base(),
      prompt: `Find the little ${t}.`,
      options,
      answer: t,
      skill: { id: 'k-letters-case', label: 'big and little letters' },
      speech: { template: 'k-letters/findLittle', slots: { letter: t } },
      // the big letter to match
      picture: { kind: 'letter', ch: t.toUpperCase() },
      pictureOptions: options.map<PictureOption>((c) => ({ value: c, picture: { kind: 'letter', ch: c }, speech: letterLabel(c) })),
      cues: [
        { target: 'picture' },
        { target: 'cards', cue: 'little' },
      ],
      // a miss: "This is little b." as the b lights up
      reteach: { template: 'k-letters/thisIsLittle', slots: { letter: t } },
    }
  }

  function firstSound(): ListenProblem {
    const L = firsts.next()
    const starts = (w: KWord) => w[0].toUpperCase() === L
    // a different word for this letter than last time
    const mine = K_PICTURE_WORDS.filter(starts)
    const fresh = mine.filter((w) => w !== lastWord[L])
    const answer = (fresh.length ? fresh : mine)[randInt(0, (fresh.length ? fresh : mine).length - 1)]
    lastWord[L] = answer
    // pictures that start with other letters, each its own letter, none mistakable for another
    const others: KWord[] = []
    for (const w of shuffle(K_PICTURE_WORDS)) {
      if (others.length >= choices - 1) break
      if (starts(w) || others.some((o) => o[0] === w[0] || picturesAlike(o, w)) || picturesAlike(w, answer)) continue
      others.push(w)
    }
    const options = places.arrange<KWord>([answer, ...others], answer)
    return {
      ...base(),
      prompt: `Which one starts with ${L}?`,
      options,
      answer,
      skill: { id: 'k-letters-sounds', label: 'first sounds' },
      speech: { template: 'k-letters/startsWith', slots: { letter: L } },
      picture: { kind: 'letter', ch: `${L}${L.toLowerCase()}` },
      pictureOptions: options.map<PictureOption>((w) => ({ value: w, picture: { kind: 'emoji', emoji: K_WORD_EMOJI[w] }, speech: { template: 'k-letters/word', slots: { word: w } } })),
      cues: [{ target: 'picture' }],
      // "Ball! Cat! Sun!" as each lights up: no guessing what a picture is called
      nameCards: true,
      // "Cat starts with C." about a picture tapped by mistake
      notes: options.map((w) => (w === answer ? null : { line: `k-letters/starts_${w}` })),
    }
  }

  return {
    topic: 'kLetters',
    reset() {
      serial = 0
      upper.reset()
      lower.reset()
      firsts.reset()
      places.reset()
      for (const k of Object.keys(lastWord)) delete lastWord[k]
    },
    next(): ListenProblem {
      const p = mode === 'findUpper' ? findUpper() : mode === 'matchCase' ? matchCase() : firstSound()
      serial++
      places.note(p.options.indexOf(p.answer))
      return p
    },
  }
}
