import { defineVoicePack } from '../types'

export const UPPER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const LOWER_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')

/**
 * Picture words for "Which one starts with B?" (RF.K.2–3): words a
 * five-year-old knows, whose first letter is the sound they hear (no soft c
 * or g, no silent letters, no digraphs), three per consonant and two per
 * vowel. The emoji for each lives with the provider
 * (src/lib/providers/kLetters.ts); a test keeps the two lists in step.
 */
export const K_PICTURE_WORDS = [
  'ball', 'bee', 'bus',
  'cat', 'car', 'cake',
  'dog', 'duck', 'door',
  'fish', 'frog', 'fox',
  'goat', 'grapes', 'guitar',
  'horse', 'house', 'hat',
  'lion', 'lemon', 'leaf',
  'moon', 'monkey', 'mouse',
  'pig', 'pizza', 'penguin',
  'rainbow', 'robot', 'rocket',
  'sun', 'snake', 'star',
  'tiger', 'tree', 'train',
  'apple', 'ant',
  'octopus', 'orange',
] as const

/** The letters the picture words start with (uppercase), in alphabet order. */
export const K_FIRST_LETTERS = [...new Set(K_PICTURE_WORDS.map((w) => w[0].toUpperCase()))].sort()

const cap = (w: string) => w[0].toUpperCase() + w.slice(1)

/**
 * Kindergarten letters (RF.K.1d, RF.K.2–3): Letter Reef. Letter names, big
 * and little letters, first sounds. Letters are said by name ("B", "bee");
 * the letter sounds wait for the phonics decision (K–5 plan §3).
 */
export default defineVoicePack({
  id: 'k-letters',
  lines: {
    // praise for this pack's questions (taking turns with the kit's own)
    youKnowLetters: 'You know your letters!',
    greatListening: 'Great listening!',
    // after a picture was the wrong pick: "Cat starts with C." (one clip per word)
    ...Object.fromEntries(K_PICTURE_WORDS.map((w) => [`starts_${w}`, `${cap(w)} starts with ${w[0].toUpperCase()}.`])),
  },
  templates: {
    /** 26 clips: three big letters, find the one said. */
    tapLetter: { text: 'Tap the letter {letter}.', slots: { letter: { words: UPPER_LETTERS } }, render: 'whole' },
    /** 26 clips: a big letter shown, find its little letter. */
    findLittle: { text: 'Find the little {letter}.', slots: { letter: { words: LOWER_LETTERS } }, render: 'whole' },
    /** 26 clips: a letter card's label as it is tapped ("B!"), big or little. */
    letter: { text: '{letter}!', slots: { letter: { words: UPPER_LETTERS } }, render: 'whole' },
    /** One clip per first letter: the letter lights up, then each picture is named. */
    startsWith: { text: 'Which one starts with {letter}?', slots: { letter: { words: K_FIRST_LETTERS } }, render: 'whole' },
    /** One clip per picture word: said as its picture lights up, and when it is tapped ("ball!"). */
    word: { text: '{word}!', slots: { word: { words: K_PICTURE_WORDS } }, render: 'whole' },
    /** 26 clips, after a miss: the answer card lights up as it is named, then the child tries again. */
    thisIsLetter: { text: 'This is the letter {letter}.', slots: { letter: { words: UPPER_LETTERS } }, render: 'whole' },
    /** 26 clips, after a miss on "Find the little b.": the little letter lights up as it is named. */
    thisIsLittle: { text: 'This is little {letter}.', slots: { letter: { words: LOWER_LETTERS } }, render: 'whole' },
  },
})
