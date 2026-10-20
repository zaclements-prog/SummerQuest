import { defineVoicePack } from '../types'

/**
 * "Word hunt" (RF.K.3c): fifteen Dolch pre-primer sight words. These are the
 * only printed words a kindergartner sees in the app: the word cards, drawn in
 * Andika (the beginning-reader font). `a` and `I` are said as the words, not
 * the letter names (listening pass: "Find the word a." should say "uh" or
 * "ay" the way the owner's class says it).
 */
export const K_SIGHT_WORDS = ['a', 'I', 'the', 'see', 'can', 'we', 'like', 'my', 'go', 'to', 'and', 'is', 'it', 'up', 'look'] as const

export type KSightWord = (typeof K_SIGHT_WORDS)[number]

export default defineVoicePack({
  id: 'k-words',
  lines: {
    // praise (taking turns with the kit's own)
    youCanRead: 'You can read that word!',
    greatReading: 'Great reading!',
  },
  templates: {
    /** One clip per word: the three word cards light up, the hand gliding along them. */
    findWord: { text: 'Find the word {word}.', slots: { word: { words: K_SIGHT_WORDS } }, render: 'whole' },
    /** About a card tapped by mistake: "That word is can." */
    thatWordIs: { text: 'That word is {word}.', slots: { word: { words: K_SIGHT_WORDS } }, render: 'whole' },
  },
})
