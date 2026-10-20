import { defineVoicePack } from '../types'

/**
 * Tiny three-step stories for Story order (Writing Workshop, K; RL.K.2–3,
 * W.K.3 "tell events in the order they happened"): one short sentence per
 * picture, first, next, last. The pictures for each live with the provider
 * (src/lib/providers/kStories.ts); a test keeps the two lists in step.
 */
export const K_STORIES = [
  { id: 'egg', lines: ['First, there is an egg.', 'Next, a chick hatches out!', 'Last, the chick grows into a hen.'] },
  { id: 'flower', lines: ['First, a tiny sprout pops up.', 'Next, it grows big green leaves.', 'Last, a sunflower blooms!'] },
  { id: 'butterfly', lines: ['First, there is a little caterpillar.', 'Next, it eats and eats the leaves.', 'Last, it turns into a butterfly!'] },
  { id: 'snowman', lines: ['First, the snow falls.', 'Next, we build a snowman.', 'Last, the sun melts it into water.'] },
  { id: 'bedtime', lines: ['First, take a warm bath.', 'Next, read a story.', 'Last, go to sleep.'] },
  { id: 'pizza', lines: ['First, spread the tomato sauce.', 'Next, sprinkle on the cheese.', 'Last, bake a yummy pizza!'] },
  { id: 'rainbow', lines: ['First, the clouds roll in.', 'Next, the rain comes down.', 'Last, a rainbow shines!'] },
  { id: 'apple', lines: ['First, the tree has pink flowers.', 'Next, a little green apple grows.', 'Last, the apple turns red!'] },
  { id: 'day', lines: ['First, the sun comes up.', 'Next, the sun shines all day.', 'Last, the moon comes out at night.'] },
  { id: 'growUp', lines: ['First, a tiny baby.', 'Next, a big kid.', 'Last, a grown-up!'] },
  { id: 'tree', lines: ['First, plant a little nut.', 'Next, a sprout pops up.', 'Last, it grows into a big tree!'] },
  { id: 'mail', lines: ['First, write a letter.', 'Next, put it in an envelope.', 'Last, drop it in the mailbox!'] },
  { id: 'popcorn', lines: ['First, get some corn.', 'Next, heat it up.', 'Last, pop, pop, popcorn!'] },
] as const

export type KStoryId = (typeof K_STORIES)[number]['id']

export default defineVoicePack({
  id: 'k-stories',
  lines: {
    /** The question: the story is told next, one sentence per picture. */
    listen: 'Listen to the story!',
    /** Once the pictures are mixed up: the slots light on "first", "next" and "last". */
    tapInOrder: 'Now tap the pictures in order: first, next, last!',
    // after a miss and the story told again: what to tap now
    whatFirst: 'What comes first? Tap it!',
    whatNext: 'What comes next? Tap it!',
    whatLast: 'What comes last? Tap it!',
    // a picture landing in its slot
    slotFirst: 'First!',
    slotNext: 'Next!',
    slotLast: 'Last!',
    // praise for this pack's questions (taking turns with the kit's own)
    youKnowStory: 'You know the story!',
    greatRemembering: 'Great remembering!',
    // the stories, one line per picture: `<story>-1`, `-2`, `-3`
    ...Object.fromEntries(K_STORIES.flatMap((s) => s.lines.map((text, i) => [`${s.id}-${i + 1}`, text]))),
  },
})
