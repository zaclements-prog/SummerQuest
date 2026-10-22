import { defineVoicePack } from '../types'
import type { G1Word } from './g1-phonics'

/**
 * 1st-grade sight words (RF.1.3g): the Dolch first-grade list. Word Reef's
 * "Sight words" stage finds them among word cards printed in Andika, like
 * kindergarten's Word hunt. `live` is the verb ("I live here"); listening pass:
 * it should rhyme with "give".
 */
export const G1_SIGHT_WORDS = [
  'after', 'again', 'any', 'ask', 'by', 'could', 'every', 'fly', 'from', 'give', 'going', 'had', 'has',
  'her', 'him', 'his', 'how', 'just', 'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over',
  'put', 'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk', 'were', 'when',
] as const

export type G1SightWord = (typeof G1_SIGHT_WORDS)[number]

/** A read-along sentence (RF.1.4): what is printed and read, the question about it, and its picture answers. */
export interface G1Sentence {
  /** Printed and read aloud, each word lighting as it is said. Decodable words and sight words only. */
  text: string
  /** Asked once it has been read; answered with a picture. */
  ask: string
  /** The picture word that answers it (a word of the sentence). */
  answer: G1Word
  /** Two pictures the sentence does not say (the same kind of thing: animals for "who", places for "where"). */
  others: readonly [G1Word, G1Word]
}

/**
 * The read-along sentences, shortest first (four words, then five and six).
 * Each answer is said in its sentence and nowhere else on the cards, so the
 * question has one answer, found by reading.
 */
export const G1_SENTENCES = {
  pigDig: { text: 'A pig can dig.', ask: 'Who can dig?', answer: 'pig', others: ['fish', 'duck'] },
  sunHot: { text: 'The sun is hot.', ask: 'What is hot?', answer: 'sun', others: ['fish', 'egg'] },
  dadPen: { text: 'Dad has a pen.', ask: 'What does Dad have?', answer: 'pen', others: ['cup', 'hat'] },
  frogHop: { text: 'A frog can hop.', ask: 'What can hop?', answer: 'frog', others: ['bed', 'cup'] },
  fishSwim: { text: 'The fish can swim.', ask: 'What can swim?', answer: 'fish', others: ['bus', 'bed'] },
  likeHat: { text: 'I like my hat.', ask: 'What do I like?', answer: 'hat', others: ['frog', 'sheep'] },
  catNap: { text: 'The cat had a nap.', ask: 'Who had a nap?', answer: 'cat', others: ['dog', 'pig'] },
  redHen: { text: 'I see a red hen.', ask: 'What do I see?', answer: 'hen', others: ['bus', 'cup'] },
  getBus: { text: 'We get on the bus.', ask: 'What do we get on?', answer: 'bus', others: ['cup', 'nut'] },
  bigShip: { text: 'Look at the big ship!', ask: 'What is big?', answer: 'ship', others: ['bug', 'nut'] },
  samSun: { text: 'Sam can see the sun.', ask: 'What can Sam see?', answer: 'sun', others: ['bus', 'fox'] },
  catMat: { text: 'The cat is on the mat.', ask: 'Who is on the mat?', answer: 'cat', others: ['dog', 'pig'] },
  dogBox: { text: 'The dog is in the box.', ask: 'Where is the dog?', answer: 'box', others: ['bed', 'bus'] },
  foxLog: { text: 'The fox sat on a log.', ask: 'Who sat on the log?', answer: 'fox', others: ['pig', 'duck'] },
  bugCup: { text: 'The bug is on the cup.', ask: 'Where is the bug?', answer: 'cup', others: ['bed', 'box'] },
  duckTub: { text: 'A duck is in the tub.', ask: 'Who is in the tub?', answer: 'duck', others: ['fox', 'pig'] },
  henEgg: { text: 'The hen sat on an egg.', ask: 'What did the hen sit on?', answer: 'egg', others: ['bed', 'box'] },
  bagBed: { text: 'My bag is on the bed.', ask: 'What is on the bed?', answer: 'bag', others: ['cat', 'pen'] },
} as const satisfies Record<string, G1Sentence>

export type G1SentenceId = keyof typeof G1_SENTENCES
export const G1_SENTENCE_IDS = Object.keys(G1_SENTENCES) as G1SentenceId[]

/** The words of a sentence as printed (punctuation stays with its word: "mat."). */
export const sentenceWords = (text: string) => text.split(/\s+/).filter(Boolean)

/**
 * Word Reef's reading (RF.1.3–4): the read-along sentences and their
 * questions, and the 1st-grade sight words.
 */
export default defineVoicePack({
  id: 'g1-words',
  lines: {
    // ── read along: the sentence (each word lights as it is said), then its question ──
    ...Object.fromEntries(G1_SENTENCE_IDS.map((id) => [`sent-${id}`, G1_SENTENCES[id].text])),
    ...Object.fromEntries(G1_SENTENCE_IDS.map((id) => [`ask-${id}`, G1_SENTENCES[id].ask])),
    // the help after a miss: the sentence again, its words lighting
    readAgain: "Let's read it again.",
    // praise (taking turns with the kit's own)
    youReadIt: 'You read the whole sentence!',
    greatReader: 'What a great reader!',
  },
  templates: {
    /** One clip per word: the three word cards light up, the hand gliding along them. */
    findWord: { text: 'Find the word {word}.', slots: { word: { words: G1_SIGHT_WORDS } }, render: 'whole' },
    /** About a card tapped by mistake: "That word is them." */
    thatWordIs: { text: 'That word is {word}.', slots: { word: { words: G1_SIGHT_WORDS } }, render: 'whole' },
  },
})
