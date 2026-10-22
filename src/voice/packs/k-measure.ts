import { defineVoicePack } from '../types'

/**
 * Things the Measure Marsh questions draw side by side, LINED UP at one end
 * (K.MD.1–2). The drawings live with the activity
 * (src/games/listenPlay/activities/measureArt.tsx); a test keeps the lists in step.
 */
export const K_LENGTH_THINGS = ['pencil', 'ribbon', 'snake', 'train', 'worm'] as const
/** …and the ones that stand on the same ground. */
export const K_HEIGHT_THINGS = ['tower', 'tree', 'flower', 'candle', 'rocket'] as const

/**
 * Kindergarten measurement (Measure Marsh, K.MD.1–2): longer / shorter,
 * taller / shorter, heavier / lighter. The child taps the thing itself (the
 * `measure` activity). Every template is a small space, recorded whole.
 *
 * The method is part of what is said: "Line them up at the start", "Stand
 * them on the same ground", "The heavy side goes down".
 */
export default defineVoicePack({
  id: 'k-measure',
  lines: {
    // ── weight (a balance scale) ──
    /** The beam tips as this is said. */
    lookScale: 'Look at the scale!',
    whichHeavier: 'Which one is heavier? Tap it!',
    whichLighter: 'Which one is lighter? Tap it!',
    // ── lining up first (Measure mix: the things start out of line, then slide into line) ──
    lineUp: "Let's line them up at the start!",
    sameGround: "Let's stand them on the same ground!",
    // ── after a wrong tap: a word about the one tapped… ──
    isLonger: 'That one is longer.',
    isShorter: 'That one is shorter.',
    isTaller: 'That one is taller.',
    isHeavier: 'That one is heavier.',
    isLighter: 'That one is lighter.',
    // …then the method, with the start line, the ground or the scale lit on its words
    helpLength: 'Line them up at the start. Then look at the ends!',
    helpHeight: 'Stand them on the same ground. Then look at the tops!',
    helpWeight: 'The heavy side goes down. The light side goes up!',
    /** Big but light (a big balloon, a small rock): the big one lit, then the scale. */
    bigLight: 'Big things can be light! Look at the scale.',
    // praise for this pack's questions (taking turns with the kit's own)
    greatMeasuring: 'Great measuring!',
    youCompared: 'You compared them!',
    // the lesson's picture cards (kMeasure)
    snake: 'Snake!',
    caterpillar: 'Caterpillar!',
    watermelon: 'Watermelon!',
    strawberry: 'Strawberry!',
  },
  templates: {
    /** 5 clips. The two things light up, the hand glides over them on "Tap". */
    whichLonger: { text: 'Which {thing} is longer? Tap it!', slots: { thing: { words: K_LENGTH_THINGS } }, render: 'whole' },
    /** 5 clips. */
    whichTaller: { text: 'Which {thing} is taller? Tap it!', slots: { thing: { words: K_HEIGHT_THINGS } }, render: 'whole' },
    /** 10 clips: shorter is said the same way for a length and a height. */
    whichShorter: {
      text: 'Which {thing} is shorter? Tap it!',
      slots: { thing: { words: [...K_LENGTH_THINGS, ...K_HEIGHT_THINGS] } },
      render: 'whole',
    },
  },
})
