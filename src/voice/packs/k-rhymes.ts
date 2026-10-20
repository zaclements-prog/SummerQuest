import { defineVoicePack } from '../types'
import { K_PICTURE_WORDS } from './k-letters'

/**
 * Picture words the kindergarten literacy stages show on cards beyond the
 * pilot's first-sound words (k-letters `K_PICTURE_WORDS`): the other half of
 * each rhyming pair (hat → bat, moon → spoon), the words that finish the
 * nursery rhymes, and a few more for "Sound it out". Each is a picture every
 * Android tablet draws; the emoji live with the provider
 * (src/lib/providers/kLiteracy.ts), and a test keeps the two lists in step.
 */
export const K_MORE_PICTURE_WORDS = [
  'bat', 'key', 'spoon', 'balloon', 'boat', 'box', 'king', 'ring',
  'snail', 'whale', 'bed', 'bread', 'clock', 'lock', 'plane', 'bell',
  'shell', 'bear', 'pear', 'nose', 'rose', 'hen', 'pen', 'honey',
  'money', 'crown', 'clown', 'shoe', 'truck', 'sheep', 'corn', 'tub',
  'map', 'milk', 'fire', 'ship',
] as const

/** Number words that rhyme (bee, three): drawn as a numeral card and said by the kit's `listen/number`. */
export const K_NUMBER_WORDS = { two: 2, three: 3, four: 4, ten: 10 } as const

/**
 * "Finish the rhyme" (RF.K.2a): traditional nursery rhymes, long out of
 * copyright, quoted as tradition has them, each stopping just before its
 * rhyming word. `partner` is the word said earlier in the verse that the
 * missing word rhymes with (dock → clock): a wrong pick hears the two side by
 * side ("dock, car. Those don't rhyme."). The verse IS the voice line
 * (`verse-<id>`), recorded whole; the narrator stops on the trailing "…".
 */
export const K_VERSES = {
  // Hickory Dickory Dock
  hickory: { text: 'Hickory, dickory, dock. The mouse ran up the…', answer: 'clock', partner: 'dock' },
  // Jack and Jill
  jackJill: { text: 'Jack and Jill went up the hill, to fetch a pail of water. Jack fell down, and broke his…', answer: 'crown', partner: 'down' },
  // One, Two, Buckle My Shoe
  buckle: { text: 'One, two, buckle my…', answer: 'shoe', partner: 'two' },
  knock: { text: 'Three, four, knock at the…', answer: 'door', partner: 'four' },
  fatHen: { text: 'Nine, ten, a big fat…', answer: 'hen', partner: 'ten' },
  // Little Bo-Peep
  boPeep: { text: 'Little Bo-Peep has lost her…', answer: 'sheep', partner: 'peep' },
  // Little Boy Blue
  boyBlue: { text: "Little Boy Blue, come blow your horn. The sheep's in the meadow, the cow's in the…", answer: 'corn', partner: 'horn' },
  // Hey Diddle Diddle
  diddle: {
    text: 'Hey, diddle, diddle, the cat and the fiddle, the cow jumped over the moon. The little dog laughed to see such sport, and the dish ran away with the…',
    answer: 'spoon',
    partner: 'moon',
  },
  // Rub-a-dub-dub
  rubADub: { text: 'Rub-a-dub-dub, three men in a…', answer: 'tub', partner: 'dub' },
  // Sing a Song of Sixpence
  sixpence: { text: 'The king was in his counting house, counting out his money. The queen was in the parlor, eating bread and…', answer: 'honey', partner: 'money' },
  blackbird: { text: 'The maid was in the garden, hanging out the clothes, when down came a blackbird and pecked off her…', answer: 'nose', partner: 'clothes' },
  // There Was a Crooked Man
  crooked: { text: 'He bought a crooked cat, which caught a crooked mouse, and they all lived together in a little crooked…', answer: 'house', partner: 'mouse' },
} as const

export type KVerseId = keyof typeof K_VERSES

/**
 * The words "Which one rhymes with…?" asks about: each has a rhyming partner
 * among the pictures (cat → hat, bat; bee → tree, key, three). The provider
 * owns which words rhyme (kLiteracy `RIME`); a test keeps the two in step.
 */
export const K_RHYME_TARGETS = [
  'cat', 'hat', 'bat', 'house', 'mouse', 'cake', 'snake', 'car', 'star',
  'bee', 'tree', 'key', 'three', 'frog', 'dog', 'moon', 'spoon', 'balloon',
  'goat', 'boat', 'fox', 'box', 'king', 'ring', 'snail', 'whale', 'bed',
  'bread', 'clock', 'lock', 'train', 'plane', 'bell', 'shell', 'bear',
  'pear', 'nose', 'rose', 'hen', 'pen', 'ten', 'honey', 'money', 'crown',
  'clown', 'door', 'four', 'shoe', 'two', 'duck', 'truck',
] as const

/** Every word a card can show in these stages (and so be the second half of "cat, dog. Those don't rhyme."). */
const CARD_WORDS = [...new Set<string>([...K_PICTURE_WORDS, ...K_MORE_PICTURE_WORDS, ...Object.keys(K_NUMBER_WORDS)])]
/** What a wrong pick is compared with: the question's word, or the verse word the answer rhymes with. */
const RHYME_WORDS = [...new Set<string>([...K_RHYME_TARGETS, ...Object.values(K_VERSES).map((v) => v.partner)])]

/**
 * Kindergarten rhyming (RF.K.2a): Letter Reef's "Rhyme time" and "Finish the
 * rhyme". Pictures are named as they light up, so a child never has to guess
 * what a picture is called.
 */
export default defineVoicePack({
  id: 'k-rhymes',
  lines: {
    // praise for these questions (taking turns with the kit's own)
    youHearRhyme: 'You can hear the rhyme!',
    thatRhymes: 'Yes! That rhymes!',
    // the nursery rhymes, each stopping before its rhyming word (one clip each)
    ...Object.fromEntries(Object.entries(K_VERSES).map(([id, v]) => [`verse-${id}`, v.text])),
  },
  templates: {
    /** One clip per word: the word's picture lights up, then each card is named. */
    rhymesWith: { text: 'Which one rhymes with {word}?', slots: { word: { words: K_RHYME_TARGETS } }, render: 'whole' },
    /** One clip per new picture word: said as its card lights up, and when it is tapped ("spoon!"). The pilot's words use k-letters/word. */
    word: { text: '{word}!', slots: { word: { words: K_MORE_PICTURE_WORDS } }, render: 'whole' },
    /**
     * After a wrong pick: the two words side by side ("cat, dog. Those don't
     * rhyme."). Far too many pairs to record whole: the words are recorded once
     * each (shared slot clips) and stitched to the recorded tail.
     */
    noRhyme: { text: "{a}, {b}. Those don't rhyme.", slots: { a: { words: RHYME_WORDS }, b: { words: CARD_WORDS } }, render: 'stitch' },
  },
})
