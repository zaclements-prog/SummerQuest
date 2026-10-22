import { defineVoicePack } from '../types'

/** The things Fair Share Falls cuts into shares (each its own drawing: src/games/listenPlay/sharesArt.tsx). */
export const G1_SHARE_THINGS = ['pizza', 'pie', 'sandwich', 'cake', 'garden'] as const

const things = { thing: { words: G1_SHARE_THINGS } }

/**
 * Fair Share Falls (1st grade, 1.G.3): circles and rectangles (pizzas, pies,
 * sandwiches, cakes, gardens) cut into two or four shares, equal or not;
 * halves and fourths (quarters); more equal shares make smaller shares. The
 * words "half" and "fourth" are said, and printed only on the two word cards
 * of "Is the blue share a half or a fourth?". Every template is recorded
 * whole (five things each).
 */
export default defineVoicePack({
  id: 'g1-shares',
  lines: {
    // ── how many shares? (numeral cards) ──
    howMany: 'How many equal shares?',
    // ── half or fourth? (two word cards, each lit on its word) ──
    nameShare: 'Is the blue share a half or a fourth?',
    half: 'Half!',
    fourth: 'Fourth!',
    // ── more shares, smaller shares (two of the same thing, one share of each coloured in) ──
    bigger: 'Which blue share is bigger?',
    smaller: 'Which blue share is smaller?',
    // ── tap a share (the `shareTap` activity): its name as it is tapped ──
    nameHalf: 'A half!',
    nameFourth: 'A fourth!',
    // the lesson's pizza cards, said as they are tapped
    cardHalves: 'Two equal shares!',
    cardUnequal2: 'Two shares, not equal!',
    cardFourths: 'Four equal shares!',

    // ── a word about the card that was tapped ──
    notEqual: 'Those shares are not the same size.',
    isFourths: 'That one has four equal shares. Those are fourths.',
    isHalves: 'That one has two equal shares. Those are halves.',
    fourthSmaller: 'That share is a fourth. More shares make smaller shares!',
    halfBigger: 'That share is a half. Fewer shares make bigger shares!',
    thereAre2: 'Count again. There are two equal shares.',
    thereAre4: 'Count again. There are four equal shares.',
    eachHalf: 'Two equal shares. Each one is a half.',
    eachFourth: 'Four equal shares. Each one is a fourth.',
    // the `shareTap` help: the two fourths light up together, then the half
    twoFourths: 'Two fourths make one half.',
    thisHalf: 'This share is one half.',
    thatHalf: 'That share is a half. It is one of two equal shares.',
    theseFourths: 'These are fourths. Cut a half in two, and you get two fourths.',

    // ── praise (taking turns with the kit's own) ──
    fairShares: 'Fair shares!',
    shareExpert: 'You know your shares!',
  },
  templates: {
    /** One card is cut into equal shares; the others are not. */
    equal: { text: 'Which {thing} is cut into equal shares?', slots: things, render: 'whole' },
    /** Halves, among unequal two and equal four. */
    halves: { text: 'Which {thing} is cut in half?', slots: things, render: 'whole' },
    /** Fourths, among unequal four and equal two. */
    fourths: { text: 'Which {thing} is cut into fourths?', slots: things, render: 'whole' },
    /** A half and two fourths (the `shareTap` activity). */
    tapHalf: { text: 'Tap the half of the {thing}.', slots: things, render: 'whole' },
    tapFourth: { text: 'Tap a fourth of the {thing}.', slots: things, render: 'whole' },
  },
})
