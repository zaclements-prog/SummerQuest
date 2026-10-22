import { defineVoicePack } from '../types'

/** Things put in order by length (drawn by the K Measure Marsh art: src/games/listenPlay/activities/measureArt.tsx). */
export const G1_ORDER_THINGS = ['pencils', 'ribbons', 'snakes', 'trains', 'worms'] as const
/** Things compared through a string (one lies on the ground, one hangs down). */
export const G1_THIRD_THINGS = ['ribbon', 'snake'] as const
/** Things measured with paper clips or cubes. */
export const G1_UNIT_THINGS = ['pencil', 'ribbon', 'snake', 'train', 'worm'] as const
/** What they are measured with, as it is said. */
export const G1_UNIT_WORDS = ['paper clips', 'cubes'] as const

/**
 * 1st-grade Measure Marsh (1.MD.1–3): put three things in order by length and
 * compare two through a third (a string); measure with paper clips and cubes
 * laid end to end, no gaps and no overlaps; tell time to the hour and half
 * hour. "O'clock" and "half past" are said, never read. Every template is a
 * small space, recorded whole.
 */
export default defineVoicePack({
  id: 'g1-measure',
  lines: {
    // ── in order (the `lengthOrder` activity) ──
    /** Said after a miss, when the order is under way. */
    whichNext: 'Which one comes next? Tap it!',
    /** The help after a miss: the one that should come next lit. */
    longestLeft: 'This one is the longest one left!',
    shortestLeft: 'This one is the shortest one left!',
    // ── through a string (indirect comparison) ──
    soLonger: 'So which one is longer? Tap it!',
    soShorter: 'So which one is shorter? Tap it!',

    // ── units (the `units` activity) ──
    /** The hand points at the box of clips (or cubes) as "Tap the box" is said. */
    layClips: 'Lay paper clips end to end. Tap the box to add one!',
    layCubes: 'Lay cubes end to end. Tap the box to add one!',
    reachesEnd: 'It reaches the end!',
    /** "Which one is measured the right way?": three pictures. */
    rightWay: 'Which one is measured the right way? Tap it!',
    hasGaps: 'That one has gaps. Line them up end to end, with no gaps!',
    hasOverlap: 'Those ones overlap. They must not overlap!',
    lateStart: 'That one does not begin at the start line!',
    endToEnd: 'End to end, no gaps, no overlaps. Great measuring!',
    /** A "measured the right way?" card's name as it is tapped. */
    thisOne: 'This one!',

    // ── telling time (the `clockMatch` activity) ──
    whatTime: 'What time is it? Tap it!',

    // praise (taking turns with the kit's own)
    greatMeasuring: 'Great measuring!',
    timeTeller: 'You can tell time!',
    inOrder: 'You put them in order!',
  },
  templates: {
    /** 5 clips. The three things light up as it is said. */
    orderLong: { text: 'Put the {things} in order. Tap the longest one first!', slots: { things: { words: G1_ORDER_THINGS } }, render: 'whole' },
    /** 5 clips. */
    orderShort: { text: 'Put the {things} in order. Tap the shortest one first!', slots: { things: { words: G1_ORDER_THINGS } }, render: 'whole' },
    /** 2 clips: the two things are far apart (one lies down, one hangs down). */
    thirdLonger: { text: "Which {thing} is longer? They are far apart. Let's use a string!", slots: { thing: { words: G1_THIRD_THINGS } }, render: 'whole' },
    /** 2 clips. */
    thirdShorter: { text: "Which {thing} is shorter? They are far apart. Let's use a string!", slots: { thing: { words: G1_THIRD_THINGS } }, render: 'whole' },
    /** 2 clips: the string lies along (or hangs beside) one of them. */
    stringLonger: { text: 'The string is longer than this {thing}.', slots: { thing: { words: G1_THIRD_THINGS } }, render: 'whole' },
    /** 2 clips. */
    stringShorter: { text: 'The string is shorter than this {thing}.', slots: { thing: { words: G1_THIRD_THINGS } }, render: 'whole' },
    /** 2 clips: the help after a miss, the answer lit. */
    thirdHelpLonger: { text: 'This {thing} is longer than the string. The other one is shorter than the string. So this one is longer!', slots: { thing: { words: G1_THIRD_THINGS } }, render: 'whole' },
    /** 2 clips. */
    thirdHelpShorter: { text: 'This {thing} is shorter than the string. The other one is longer than the string. So this one is shorter!', slots: { thing: { words: G1_THIRD_THINGS } }, render: 'whole' },
    /** 10 clips. */
    howManyLong: { text: 'How many {units} long is the {thing}?', slots: { units: { words: G1_UNIT_WORDS }, thing: { words: G1_UNIT_THINGS } }, render: 'whole' },
    /** 12 clips: a clock card's name as it is tapped. */
    oclock: { text: "{hour} o'clock!", slots: { hour: { numbers: [1, 12] } }, render: 'whole' },
    /** 12 clips. */
    halfPast: { text: 'Half past {hour}!', slots: { hour: { numbers: [1, 12] } }, render: 'whole' },
    /** 12 clips. */
    tapOclock: { text: "Tap the clock that shows {hour} o'clock.", slots: { hour: { numbers: [1, 12] } }, render: 'whole' },
    /** 12 clips. */
    tapHalf: { text: 'Tap the clock that shows half past {hour}.', slots: { hour: { numbers: [1, 12] } }, render: 'whole' },
    /** 12 clips: a word about the card that was tapped, which isn't the time asked. */
    saysOclock: { text: "That one says {hour} o'clock.", slots: { hour: { numbers: [1, 12] } }, render: 'whole' },
    /** 12 clips. */
    saysHalf: { text: 'That one says half past {hour}.', slots: { hour: { numbers: [1, 12] } }, render: 'whole' },
    /** 12 clips: the method, the long hand and then the short hand lit on their words. */
    howOclock: { text: "The long hand points up to 12. The short hand points to {hour}. It is {hour} o'clock!", slots: { hour: { numbers: [1, 12] } }, render: 'whole' },
    /** 12 clips. At half past, the short hand sits halfway between two numbers. */
    howHalf: { text: 'The long hand points down to 6. The short hand is just past {hour}, halfway to the next number. It is half past {hour}!', slots: { hour: { numbers: [1, 12] } }, render: 'whole' },
  },
})
