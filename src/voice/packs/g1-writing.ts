import { defineVoicePack } from '../types'
import { LOWER_PHRASES } from '../../lib/trace/glyphs'
import { UPPER_LETTERS } from './k-letters'
import { CVC_WORDS } from './g1-phonics'

/**
 * Sentences to build from word tiles (L.1.1j, L.1.2b): three to five words,
 * the first with a capital letter, then a period. Every word is one a 1st
 * grader can read (short-vowel words and sight words).
 */
export const G1_BUILD_SENTENCES = {
  dogRan: 'The dog ran.',
  weHop: 'We can hop.',
  bugRan: 'The bug ran.',
  henSat: 'The hen sat.',
  seeCat: 'I see a cat.',
  sunHot: 'The sun is hot.',
  pigDig: 'A pig can dig.',
  hatRed: 'My hat is red.',
  likeDog: 'I like my dog.',
  lookDuck: 'Look at the duck.',
  foxBig: 'The fox is big.',
  catNap: 'The cat can nap.',
  likeSun: 'We like the sun.',
  seeBus: 'We can see the bus.',
  seeFish: 'I can see a fish.',
  momCup: 'Mom has a red cup.',
} as const satisfies Record<string, string>

export type G1BuildId = keyof typeof G1_BUILD_SENTENCES
export const G1_BUILD_IDS = Object.keys(G1_BUILD_SENTENCES) as G1BuildId[]

const cap = (w: string) => w[0].toUpperCase() + w.slice(1)

/**
 * 1st-grade writing (L.1.1a, L.1.2): Writing Workshop's lowercase tracing,
 * spelling words from letter tiles, and building a sentence from word tiles.
 * Letters are named by their names ("little A"), never read as a sound.
 */
export default defineVoicePack({
  id: 'g1-writing',
  lines: {
    // ── lowercase tracing: each new stroke phrase (the rest are kindergarten's k-trace lines) ──
    ...Object.fromEntries(Object.entries(LOWER_PHRASES).map(([id, text]) => [`say-${id}`, text])),
    niceLetters: 'What neat little letters!',
    // ── spelling ──
    spellTogether: "Let's spell it together.",
    greatSpelling: 'Great spelling!',
    // ── building a sentence: the voice says it, the child builds it, then it is read back ──
    ...Object.fromEntries(G1_BUILD_IDS.map((id) => [`build-${id}`, `Make this sentence. ${G1_BUILD_SENTENCES[id]}`])),
    ...Object.fromEntries(G1_BUILD_IDS.map((id) => [`read-${id}`, G1_BUILD_SENTENCES[id]])),
    /** The rule, said in the help after a miss (and taught in the lesson). */
    rule: 'A sentence starts with a capital letter. It ends with a period.',
    capitalPeriod: 'A capital at the start, and a period at the end!',
    // the lesson's check ("Which word can start a sentence?"): each card's first letter, said as it is tapped
    cardCapitalT: 'The, with a capital T!',
    cardLittleT: 'The, with a little t.',
    cardLittleD: 'Dog, with a little d.',
  },
  templates: {
    /** 26 clips: a lowercase letter to trace (said by its name: "Let's trace little B!"). */
    lower: { text: "Let's trace little {letter}!", slots: { letter: { words: UPPER_LETTERS } }, render: 'whole' },
    /** One clip per word: its picture shown, the letter tiles light on "letters". */
    spell: { text: 'Spell {word}. Tap the letters.', slots: { word: { words: CVC_WORDS.map(cap) } }, render: 'whole' },
  },
})
