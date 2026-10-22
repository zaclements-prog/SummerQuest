import type { Picture, PictureOption } from '../problem'
import type { VoiceRef } from '../../voice/types'
import { G1_NEW_PICTURE_WORDS, type G1Word } from '../../voice/packs/g1-phonics'
import { K_NUMBER_WORDS } from '../../voice/packs/k-rhymes'
import { cardName as kCardName, literacyEmoji, picturesAlike as kPicturesAlike } from './kLiteracy'

/**
 * What the 1st-grade literacy stages share (Word Reef, Writing Workshop): the
 * pictures of their words and what each is called. A word kindergarten already
 * has keeps kindergarten's picture and name line; the new ones (van, net,
 * chick…) are here, emoji every Android tablet draws (Unicode 9 or older), one
 * symbol each, never one another word already uses.
 */
export const G1_NEW_WORD_EMOJI: Record<string, string> = {
  van: '🚐',
  rat: '🐀',
  bag: '👜',
  net: '🥅',
  web: '🕸️',
  egg: '🥚',
  pin: '📌',
  gift: '🎁',
  chick: '🐤',
  bug: '🐛',
  nut: '🥜',
  cup: '☕',
  drum: '🥁',
  shark: '🦈',
  shirt: '👕',
  cheese: '🧀',
  cherry: '🍒',
  church: '⛪',
  thumb: '👍',
}

const isNumberWord = (w: string): w is keyof typeof K_NUMBER_WORDS => w in K_NUMBER_WORDS
const NEW = new Set<string>(G1_NEW_PICTURE_WORDS)

/** The emoji of any 1st-grade picture word (undefined: a number word, drawn as a numeral). */
export function g1Emoji(w: string): string | undefined {
  return G1_NEW_WORD_EMOJI[w] ?? literacyEmoji(w)
}

/** A word's picture: its emoji, or a numeral for "three". */
export function g1Picture(w: G1Word | string): Picture {
  if (isNumberWord(w)) return { kind: 'numeral', n: K_NUMBER_WORDS[w] }
  const emoji = g1Emoji(w)
  if (!emoji) throw new Error(`g1: no picture for "${w}"`)
  return { kind: 'emoji', emoji }
}

/** What a picture card is called, said as it lights up and when it is tapped ("van!"). */
export function g1Name(w: G1Word | string): VoiceRef {
  return NEW.has(w) ? { template: 'g1-phonics/word', slots: { word: w } } : kCardName(w)
}

/** Picture cards for these words, named. */
export function g1Cards(words: readonly string[]): PictureOption[] {
  return words.map((w) => ({ value: w, picture: g1Picture(w), speech: g1Name(w) }))
}

/**
 * Pictures a child could take for one another, or words that sound alike in
 * some voices (pin and pen): never in one question. Kindergarten's pairs
 * (a boat and a ship, two cats…) count too.
 */
export const G1_LOOKALIKES: readonly (readonly string[])[] = [
  ['rat', 'mouse'],
  ['bug', 'ant', 'bee'],
  ['van', 'bus', 'truck', 'car'],
  ['cup', 'milk'],
  ['hen', 'chick', 'duck'],
  ['shark', 'fish', 'whale'],
  ['pin', 'pen'],
  ['cherry', 'apple'],
  ['bag', 'gift'],
]

export function g1Alike(a: string, b: string): boolean {
  return kPicturesAlike(a, b) || G1_LOOKALIKES.some((g) => g.includes(a) && g.includes(b))
}

export const cap = (w: string) => w[0].toUpperCase() + w.slice(1)
