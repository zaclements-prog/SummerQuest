import { defineVoicePack } from '../types'

/**
 * Things counted in Counting Towers (the K–1 tower defense). Their pictures
 * live with the provider (src/lib/providers/kTowers.ts, `K_TOWER_EMOJI`); a
 * test keeps the two lists in step.
 */
export const K_TOWER_THINGS = ['critters', 'towers', 'gems', 'rockets'] as const

/**
 * Counting Towers (Tower Battlefront for K–1): the game's own lines (what to
 * tap, a tower built or made stronger, a wave stopped, a wave that got by and
 * is tried again) and its counting questions. More / fewer / bigger reuse
 * Counting Mesa's `k-math` lines. Small spaces: every sentence recorded whole.
 */
export default defineVoicePack({
  id: 'k-towers',
  lines: {
    // ── the game: the guide's hand is on what each line names ──
    /** The start: the hand on the first build spot. */
    intro: 'Critters are coming! Tap a spot to build a tower.',
    /** After the first tower, before the first wave: the hand on the next spot. */
    buildMore: 'Build one more tower!',
    /** The hand on the big ▶ (it shows once enough towers are up). */
    ready: 'Ready? Tap the arrow to start!',
    built: 'Your tower is ready!',
    stronger: 'Your tower is stronger!',
    /** A tower at its top level was tapped. */
    maxed: 'This tower is super strong!',
    waveDone: 'You stopped them all!',
    /** A wave over, but a few critters got by (the house held). */
    phew: 'Phew! A few got by.',
    /** Between waves: the hand on a free spot, or on a tower to power up. */
    moreComing: 'More critters are coming! Add a tower, or tap one to make it stronger.',
    /** The base would have fallen: the wave ends, and is tried again. Never a "you lose". */
    setback: "Oh no, some got by! Let's add a tower and try again.",
    allDone: 'Hooray! You kept the critters away!',
    /** Praise for a tower question (taking turns with the kit's). */
    towerPower: 'Tower power!',
  },
  templates: {
    /** 4 clips. The group lights up on the thing, the number cards on "Tap". */
    howMany: { text: 'How many {thing}? Tap the number.', slots: { thing: { words: K_TOWER_THINGS } }, render: 'whole' },
    /** 76 clips (2–20 × 4 things). */
    findGroup: {
      text: 'Tap the group with {n} {thing}.',
      slots: { n: { numbers: [2, 20] }, thing: { words: K_TOWER_THINGS } },
      render: 'whole',
    },
  },
})
