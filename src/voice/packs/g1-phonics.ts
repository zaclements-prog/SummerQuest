import { defineVoicePack } from '../types'
import { K_PICTURE_WORDS } from './k-letters'
import { K_MORE_PICTURE_WORDS, K_NUMBER_WORDS } from './k-rhymes'

/*
 * ⚠ PHONICS LINES: OWNER'S LISTENING PASS (K–5 plan §3, "Phonics is the hard case").
 *
 * Like kindergarten's `k-sounds`, every line here that says a SOUND is a
 * RECORDING SCRIPT, spelled the way a teacher-voice TTS should read it, not the
 * way the word is written ("Kuh… aa… tuh. Cat!" for c-a-t). Before these clips
 * ship, listen to each one and re-spell or re-record any that come out wrong:
 *
 * - `sounds-*` (a word sounded out, one sound per letter or letter team): the
 *   stretchy sounds (m, s, f, l, n, r, v, z, sh, th) are written long and should
 *   sound held; the stop sounds (b, c/k, d, g, j, p, t) carry a short "uh" that
 *   should be as short as the voice allows; the short vowels are written
 *   aa (cat), eh (bed), ih (pig), ah (dog), uh (sun);
 * - `vowelQ-*`, `startsQ-*`, `endsQ-ck`, `starts-*`, `ends-*`: a letter team's
 *   sound (shh, ch, th, wh, k) said on its own;
 * - the short vowels in `vowelQ-*` are named the way a classroom does ("the
 *   short a sound, like apple"): the anchor word carries the sound.
 */

/** How each sound is written in the recording script (letters and letter teams). */
export const SOUND_SCRIPT: Record<string, string> = {
  b: 'buh', c: 'kuh', d: 'duh', f: 'ffff', g: 'guh', h: 'hhhh', j: 'juh', k: 'kuh', l: 'llll', m: 'mmmm', n: 'nnnn',
  p: 'puh', r: 'rrrr', s: 'ssss', t: 'tuh', v: 'vvvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzzz',
  a: 'aa', e: 'eh', i: 'ih', o: 'ah', u: 'uh',
  sh: 'shhhh', ch: 'chuh', th: 'thhhh', wh: 'wuh', ck: 'kuh', ll: 'llll',
}

export type ShortVowel = 'a' | 'e' | 'i' | 'o' | 'u'
export const SHORT_VOWELS: readonly ShortVowel[] = ['a', 'e', 'i', 'o', 'u']

/** The word each short vowel is named with ("the short a sound, like apple"): never a card picture. */
export const VOWEL_ANCHOR: Record<ShortVowel, string> = { a: 'apple', e: 'elephant', i: 'igloo', o: 'octopus', u: 'umbrella' }

/**
 * The 1st-grade picture words (RF.1.2–3): short-vowel words, most of them
 * consonant-vowel-consonant, and words with a letter team (sh, ch, th, wh,
 * ck). Each is split into the letters (or letter teams) that make its sounds:
 * what lights up as it is sounded out, and the tiles it is spelled with. The
 * picture for each lives with the providers (src/lib/providers/g1Shared.ts);
 * a test keeps the two in step.
 */
export const G1_WORDS = {
  // short a
  cat: ['c', 'a', 't'],
  hat: ['h', 'a', 't'],
  bat: ['b', 'a', 't'],
  map: ['m', 'a', 'p'],
  van: ['v', 'a', 'n'],
  rat: ['r', 'a', 't'],
  bag: ['b', 'a', 'g'],
  // short e
  bed: ['b', 'e', 'd'],
  hen: ['h', 'e', 'n'],
  pen: ['p', 'e', 'n'],
  net: ['n', 'e', 't'],
  web: ['w', 'e', 'b'],
  egg: ['e', 'gg'],
  bell: ['b', 'e', 'll'],
  // short i
  pig: ['p', 'i', 'g'],
  pin: ['p', 'i', 'n'],
  milk: ['m', 'i', 'l', 'k'],
  gift: ['g', 'i', 'f', 't'],
  fish: ['f', 'i', 'sh'],
  ship: ['sh', 'i', 'p'],
  chick: ['ch', 'i', 'ck'],
  // short o
  dog: ['d', 'o', 'g'],
  fox: ['f', 'o', 'x'],
  box: ['b', 'o', 'x'],
  lock: ['l', 'o', 'ck'],
  clock: ['c', 'l', 'o', 'ck'],
  frog: ['f', 'r', 'o', 'g'],
  // short u
  sun: ['s', 'u', 'n'],
  bus: ['b', 'u', 's'],
  bug: ['b', 'u', 'g'],
  nut: ['n', 'u', 't'],
  tub: ['t', 'u', 'b'],
  cup: ['c', 'u', 'p'],
  duck: ['d', 'u', 'ck'],
  drum: ['d', 'r', 'u', 'm'],
  truck: ['t', 'r', 'u', 'ck'],
  // letter teams at the start (and the e in shell)
  shell: ['sh', 'e', 'll'],
  sheep: ['sh', 'ee', 'p'],
  shoe: ['sh', 'oe'],
  shark: ['sh', 'ar', 'k'],
  shirt: ['sh', 'ir', 't'],
  cheese: ['ch', 'ee', 'se'],
  cherry: ['ch', 'e', 'rr', 'y'],
  church: ['ch', 'ur', 'ch'],
  thumb: ['th', 'u', 'mb'],
  three: ['th', 'r', 'ee'],
  whale: ['wh', 'a', 'l', 'e'],
  // other pictures in the questions (as wrong cards)
  apple: ['a', 'pp', 'le'],
  tree: ['t', 'r', 'ee'],
} as const satisfies Record<string, readonly string[]>

export type G1Word = keyof typeof G1_WORDS

/** Each short-vowel picture word's vowel (the "Which one has the short a sound?" bank). */
export const VOWEL_OF: Partial<Record<G1Word, ShortVowel>> = {
  cat: 'a', hat: 'a', bat: 'a', map: 'a', van: 'a', rat: 'a', bag: 'a',
  bed: 'e', hen: 'e', pen: 'e', net: 'e', web: 'e', egg: 'e', bell: 'e',
  pig: 'i', pin: 'i', milk: 'i', gift: 'i', fish: 'i', ship: 'i', chick: 'i',
  dog: 'o', fox: 'o', box: 'o', lock: 'o', clock: 'o', frog: 'o',
  sun: 'u', bus: 'u', bug: 'u', nut: 'u', tub: 'u', cup: 'u', duck: 'u', drum: 'u', truck: 'u',
}
export const VOWEL_WORDS = Object.keys(VOWEL_OF) as G1Word[]

/** Three-letter words, one sound per letter, no letter twice: the "c _ t" gaps, and the words spelled from tiles. */
export const CVC_WORDS = ['cat', 'hat', 'bat', 'map', 'van', 'rat', 'bag', 'bed', 'hen', 'pen', 'net', 'web', 'pig', 'pin', 'dog', 'fox', 'box', 'sun', 'bus', 'bug', 'nut', 'tub', 'cup'] as const satisfies readonly G1Word[]
export type CvcWord = (typeof CVC_WORDS)[number]

/** Words read and then matched to their picture ("Read a word"): the CVC words and the letter-team words a 1st grader decodes. */
export const DECODE_WORDS = [...CVC_WORDS, 'fish', 'ship', 'shell', 'chick', 'duck', 'lock'] as const satisfies readonly G1Word[]
export type DecodeWord = (typeof DECODE_WORDS)[number]

/** The letter teams at the start of a word (RF.1.3a), and the pictures that start with each. */
export const DIGRAPH_STARTS = {
  sh: ['ship', 'shell', 'sheep', 'shoe', 'shark', 'shirt'],
  ch: ['chick', 'cheese', 'cherry', 'church'],
  th: ['thumb', 'three'],
  wh: ['whale'],
} as const satisfies Record<string, readonly G1Word[]>
export type StartDigraph = keyof typeof DIGRAPH_STARTS

/** Pictures that end with ck (the k sound at the end of a short word). */
export const CK_ENDS = ['duck', 'lock', 'clock', 'truck', 'chick'] as const satisfies readonly G1Word[]

/** Wrong cards for "Which one ends with kuh?": pictures whose last sound is clearly not k (no fox, no box: x ends in ks). */
export const CK_OTHERS = ['cat', 'hen', 'pig', 'dog', 'sun', 'bus', 'fish', 'bed', 'web', 'cup', 'drum', 'tub', 'shell', 'bell', 'van', 'map'] as const satisfies readonly G1Word[]

/** How a letter team's sound is said in the question about it (recording script). */
export const DIGRAPH_SAY: Record<StartDigraph | 'ck', { letters: string; sound: string }> = {
  sh: { letters: 'S and H', sound: 'shh' },
  ch: { letters: 'C and H', sound: 'ch' },
  th: { letters: 'T and H', sound: 'th' },
  wh: { letters: 'W and H', sound: 'wuh' },
  ck: { letters: 'C and K', sound: 'kuh' },
}

/**
 * "Tap the word that says ship" (RF.1.3a): the word, and two real words a
 * 1st grader can read that differ from it by its letter team (chip, hip).
 */
export const DIGRAPH_WORD_SETS = [
  ['ship', 'chip', 'hip'],
  ['shop', 'chop', 'hop'],
  ['chin', 'shin', 'thin'],
  ['chop', 'shop', 'top'],
  ['then', 'when', 'hen'],
  ['when', 'then', 'wet'],
  ['that', 'hat', 'chat'],
  ['thin', 'chin', 'tin'],
  ['with', 'wish', 'wig'],
  ['wish', 'with', 'win'],
  ['fish', 'fit', 'fin'],
  ['bath', 'bat', 'bash'],
  ['much', 'mud', 'mush'],
  ['back', 'bat', 'bath'],
  ['sick', 'sit', 'sip'],
  ['rock', 'rot', 'rod'],
  ['kick', 'kid', 'kit'],
] as const satisfies readonly (readonly [string, string, string])[]

export const DIGRAPH_TARGETS = DIGRAPH_WORD_SETS.map((s) => s[0])
export const DIGRAPH_ALL_WORDS = [...new Set(DIGRAPH_WORD_SETS.flat())]

const cap = (w: string) => w[0].toUpperCase() + w.slice(1)

/** "Kuh… aa… tuh. Cat!": a word sounded out, then said. */
export function soundsText(w: G1Word): string {
  const parts = G1_WORDS[w].map((g) => SOUND_SCRIPT[g] ?? g)
  return `${cap(parts.join('… '))}. ${cap(w)}!`
}

/** Where each sound starts in `soundsText(w)` (so the letter it belongs to lights up as it is said), then the whole word. */
export function soundsOffsets(w: G1Word): { sounds: number[]; word: number } {
  const text = soundsText(w)
  const sounds: number[] = []
  let at = 0
  for (const g of G1_WORDS[w]) {
    const s = SOUND_SCRIPT[g] ?? g
    const i = text.toLowerCase().indexOf(s.toLowerCase(), at)
    sounds.push(i)
    at = i + s.length
  }
  return { sounds, word: text.lastIndexOf(cap(w)) }
}

/** The first letter (or letter team) of a word, and the sound it makes. */
export const firstGrapheme = (w: G1Word) => G1_WORDS[w][0]
export const lastGrapheme = (w: G1Word) => G1_WORDS[w][G1_WORDS[w].length - 1]

/** Words sounded out after a miss (decoding, spelling, the middle-sound gap). */
export const SOUNDED_WORDS: readonly G1Word[] = [...new Set<G1Word>([...DECODE_WORDS, ...CVC_WORDS])]

/** Picture words kindergarten has no name line for (theirs are k-letters' and k-rhymes'). */
export const G1_NEW_PICTURE_WORDS = (Object.keys(G1_WORDS) as G1Word[]).filter(
  (w) => !(K_PICTURE_WORDS as readonly string[]).includes(w) && !(K_MORE_PICTURE_WORDS as readonly string[]).includes(w) && !(w in K_NUMBER_WORDS),
)

/** Words whose first or last sound a wrong card is told about ("Sun starts with ssss."). */
const STARTS_NOTED = Object.keys(G1_WORDS) as G1Word[]

/**
 * 1st-grade phonics (RF.1.2–3): Word Reef's "Short vowels", "Letter teams"
 * and "Read a word", and the sounding-out Writing Workshop's spelling uses.
 * See the listening note at the top of this file.
 */
export default defineVoicePack({
  id: 'g1-phonics',
  lines: {
    // ── short vowels: "Which one has the short a sound, like apple?" (the letter shown, three pictures named) ──
    ...Object.fromEntries(SHORT_VOWELS.map((v) => [`vowelQ-${v}`, `Which one has the short ${v.toUpperCase()} sound, like ${VOWEL_ANCHOR[v]}?`])),
    // a picture tapped by mistake: "Dog has the short O sound."
    ...Object.fromEntries(VOWEL_WORDS.map((w) => [`vowelIn-${w}`, `${cap(w)} has the short ${VOWEL_OF[w]!.toUpperCase()} sound.`])),
    // ── letter teams: "S and H say shh. Which one starts with shh?" (the team shown, three pictures named) ──
    ...Object.fromEntries((Object.keys(DIGRAPH_STARTS) as StartDigraph[]).map((d) => [`startsQ-${d}`, `${DIGRAPH_SAY[d].letters} say ${DIGRAPH_SAY[d].sound}. Which one starts with ${DIGRAPH_SAY[d].sound}?`])),
    'endsQ-ck': `${DIGRAPH_SAY.ck.letters} say ${DIGRAPH_SAY.ck.sound}, at the end. Which one ends with ${DIGRAPH_SAY.ck.sound}?`,
    // a picture tapped by mistake: "Sun starts with ssss." / "Bus ends with ssss."
    ...Object.fromEntries(STARTS_NOTED.map((w) => [`starts-${w}`, `${cap(w)} starts with ${SOUND_SCRIPT[firstGrapheme(w)] ?? firstGrapheme(w)}.`])),
    ...Object.fromEntries(CK_OTHERS.map((w) => [`ends-${w}`, `${cap(w)} ends with ${SOUND_SCRIPT[lastGrapheme(w)] ?? lastGrapheme(w)}.`])),
    // ── read a word: the word is shown, never said until it has been read ──
    readWord: 'Read the word. Then tap its picture.',
    // ── a word sounded out, each letter lighting up (the help after a miss; spelling's too) ──
    ...Object.fromEntries(SOUNDED_WORDS.map((w) => [`sounds-${w}`, soundsText(w)])),
    // help intros
    soundItOut: "Let's sound it out.",
    // praise (taking turns with the kit's own)
    youReadIt: 'You read it!',
    greatSounding: 'Great sounding out!',
    sharpEars: 'Sharp ears!',
  },
  templates: {
    /** One clip per CVC word: its picture shown, "c _ t" under it; the gap lights on "middle". */
    middle: { text: '{word}! What sound is in the middle? Tap the letter.', slots: { word: { words: CVC_WORDS.map(cap) } }, render: 'whole' },
    /** One clip per word: "Tap the word ship." (three word cards: ship, chip, hip). */
    tapWord: { text: 'Tap the word {word}.', slots: { word: { words: DIGRAPH_TARGETS } }, render: 'whole' },
    /** About a word card tapped by mistake: "That word is chip." */
    thatWordIs: { text: 'That word is {word}.', slots: { word: { words: DIGRAPH_ALL_WORDS } }, render: 'whole' },
    /** A picture word's name, said as its card lights up and when it is tapped ("van!"; kindergarten's words keep their lines). */
    word: { text: '{word}!', slots: { word: { words: G1_NEW_PICTURE_WORDS } }, render: 'whole' },
  },
})
