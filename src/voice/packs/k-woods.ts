import { defineVoicePack, type TemplateDef } from '../types'

/**
 * Story Woods (K.OA.2): spoken story problems within 10. Each story is three
 * short lines: how it starts (`{n}`: the first number), what happens (`{n}`:
 * the second), and the question. The child acts the change out on screen
 * (taps the newcomers in, the leavers away, the second kind into the basket,
 * one treat to each friend), then taps the answer.
 *
 * - `join` (add to): "Bear picked 3 apples." "Then Fox brought her 2 more."
 * - `leave` (take from): "Owl saw 6 birds in the tree." "Then 2 flew away."
 * - `together` (put together, two kinds in one basket): "Bear put 3 apples in
 *   her basket." "Then she put in 2 pears."
 * - `compare` (how many more): "5 bunnies came for lunch." "There were only 3
 *   carrots." "How many more carrots do we need?"
 *
 * `a` and `b` are the numbers each line is recorded for (whole sentences:
 * plural nouns start at 2, past tense keeps "1" grammatical); a stage picks
 * within them, its totals within 10. The pictures, places and characters live
 * with the provider (src/lib/providers/kStoryMath.ts); a test keeps the two in
 * step. Kind stories only: sharing, finding, building, playing.
 */
export type KWoodsPlot = 'join' | 'leave' | 'together' | 'compare'

export interface KWoodsStory {
  id: string
  plot: KWoodsPlot
  lines: readonly [start: string, change: string, ask: string]
  a: readonly [number, number]
  b: readonly [number, number]
}

const JOIN = { a: [2, 6], b: [1, 4] } as const
const LEAVE = { a: [3, 8], b: [1, 4] } as const
const TOGETHER = { a: [2, 5], b: [2, 5] } as const
const COMPARE = { a: [3, 6], b: [2, 5] } as const

export const K_WOODS_STORIES = [
  // ── add to ──
  { id: 'bearApples', plot: 'join', ...JOIN, lines: ['Bear picked {n} apples.', 'Then Fox brought her {n} more.', 'How many apples does Bear have now?'] },
  { id: 'squirrelNuts', plot: 'join', ...JOIN, lines: ['Squirrel found {n} nuts under a tree.', 'Then she found {n} more.', 'How many nuts does Squirrel have now?'] },
  { id: 'henChicks', plot: 'join', ...JOIN, lines: ['Hen had {n} chicks in the yard.', 'Then {n} more hatched!', 'How many chicks does Hen have now?'] },
  { id: 'puppyBalloons', plot: 'join', ...JOIN, lines: ['Puppy had {n} balloons for his party.', 'Then Kitty brought {n} more.', 'How many balloons does Puppy have now?'] },
  { id: 'crabShells', plot: 'join', ...JOIN, lines: ['Crab found {n} shells on the beach.', 'Then a wave brought {n} more.', 'How many shells does Crab have now?'] },
  { id: 'bunnyTulips', plot: 'join', ...JOIN, lines: ['Bunny planted {n} tulips.', 'Then she planted {n} more.', 'How many tulips are in the garden now?'] },
  { id: 'penguinSnowmen', plot: 'join', ...JOIN, lines: ['Penguin built {n} snowmen.', 'Then his friends built {n} more.', 'How many snowmen are there now?'] },
  { id: 'birdEggs', plot: 'join', ...JOIN, lines: ['Bird had {n} eggs in her nest.', 'Then she laid {n} more.', 'How many eggs are in the nest now?'] },
  { id: 'mouseCheese', plot: 'join', ...JOIN, lines: ['Mouse had {n} pieces of cheese.', 'Then Hamster gave him {n} more.', 'How many pieces does Mouse have now?'] },
  { id: 'monkeyBananas', plot: 'join', ...JOIN, lines: ['Monkey picked {n} bananas.', 'Then Elephant gave her {n} more.', 'How many bananas does Monkey have now?'] },
  { id: 'owlStars', plot: 'join', ...JOIN, lines: ['Owl saw {n} stars in the sky.', 'Then {n} more came out.', 'How many stars can Owl see now?'] },
  // ── take from ──
  { id: 'owlBirds', plot: 'leave', ...LEAVE, lines: ['Owl saw {n} birds in the tree.', 'Then {n} flew away.', 'How many birds are still in the tree?'] },
  { id: 'bearCookies', plot: 'leave', ...LEAVE, lines: ['Bear baked {n} cookies.', 'She gave {n} to Bunny.', 'How many cookies does Bear have now?'] },
  { id: 'puppyFloat', plot: 'leave', ...LEAVE, lines: ['Puppy held {n} balloons.', 'Whoosh! {n} floated away.', 'How many balloons does Puppy have now?'] },
  { id: 'bearFish', plot: 'leave', ...LEAVE, lines: ['Bear saw {n} fish in the river.', 'Then {n} swam away.', 'How many fish are still there?'] },
  { id: 'bunnyButterflies', plot: 'leave', ...LEAVE, lines: ['Bunny saw {n} butterflies in the garden.', 'Then {n} flew away.', 'How many butterflies are still there?'] },
  { id: 'penguinSnowflakes', plot: 'leave', ...LEAVE, lines: ['Penguin caught {n} snowflakes.', 'Then {n} melted.', 'How many snowflakes are left?'] },
  { id: 'chicksYard', plot: 'leave', ...LEAVE, lines: ['{n} chicks played in the yard.', 'Then {n} ran back to Hen.', 'How many chicks are still playing?'] },
  { id: 'bunnyCarrots', plot: 'leave', ...LEAVE, lines: ['Bunny pulled up {n} carrots.', 'She gave {n} to Pig.', 'How many carrots does Bunny have now?'] },
  { id: 'frogBoats', plot: 'leave', ...LEAVE, lines: ['Frog saw {n} boats on the lake.', 'Then {n} sailed home.', 'How many boats are still on the lake?'] },
  { id: 'owlPencils', plot: 'leave', ...LEAVE, lines: ['Owl had {n} pencils.', 'She gave {n} to Mouse.', 'How many pencils does Owl have now?'] },
  { id: 'foxLeaves', plot: 'leave', ...LEAVE, lines: ['Fox raked {n} leaves into a pile.', 'Then the wind blew {n} away.', 'How many leaves are still in the pile?'] },
  // ── put together: two kinds in one basket ──
  { id: 'bearFruit', plot: 'together', ...TOGETHER, lines: ['Bear put {n} apples in her basket.', 'Then she put in {n} pears.', 'How many fruits are in her basket?'] },
  { id: 'foxFruit', plot: 'together', ...TOGETHER, lines: ['Fox picked {n} strawberries.', 'Then he picked {n} peaches.', 'How many fruits did Fox pick?'] },
  { id: 'monkeyFruit', plot: 'together', ...TOGETHER, lines: ['Monkey found {n} bananas.', 'Then she found {n} oranges.', 'How many fruits did Monkey find?'] },
  { id: 'bunnyFlowers', plot: 'together', ...TOGETHER, lines: ['Bunny picked {n} tulips.', 'Then she picked {n} sunflowers.', 'How many flowers did Bunny pick?'] },
  { id: 'puppyToys', plot: 'together', ...TOGETHER, lines: ['Puppy put {n} balls in his toy box.', 'Then he put in {n} cars.', 'How many toys are in the box?'] },
  { id: 'pigPicnic', plot: 'together', ...TOGETHER, lines: ['Pig packed {n} lemons for a picnic.', 'Then he packed {n} green apples.', 'How many fruits did Pig pack?'] },
  { id: 'logFriends', plot: 'together', ...TOGETHER, lines: ['{n} frogs sat on a log.', 'Then {n} turtles climbed on.', 'How many animals are on the log?'] },
  // ── how many more: one each for a row of friends ──
  { id: 'bunnyLunch', plot: 'compare', ...COMPARE, lines: ['{n} bunnies came for lunch.', 'There were only {n} carrots.', 'How many more carrots do we need?'] },
  { id: 'kittenBalls', plot: 'compare', ...COMPARE, lines: ['{n} kittens wanted to play ball.', 'There were only {n} balls.', 'How many more balls do we need?'] },
  { id: 'monkeyShare', plot: 'compare', ...COMPARE, lines: ['{n} monkeys wanted a banana.', 'There were only {n} bananas.', 'How many more bananas do we need?'] },
  { id: 'bearHoney', plot: 'compare', ...COMPARE, lines: ['{n} bears came to the picnic.', 'There were only {n} honey pots.', 'How many more honey pots do we need?'] },
  { id: 'puppyHats', plot: 'compare', ...COMPARE, lines: ['{n} puppies came to the party.', 'There were only {n} party hats.', 'How many more hats do we need?'] },
  { id: 'mouseSnack', plot: 'compare', ...COMPARE, lines: ['{n} mice came for a snack.', 'There were only {n} pieces of cheese.', 'How many more pieces do we need?'] },
] as const satisfies readonly KWoodsStory[]

export type KWoodsStoryId = (typeof K_WOODS_STORIES)[number]['id']

const template = (text: string, [lo, hi]: readonly [number, number]): TemplateDef => ({ text, slots: { n: { numbers: [lo, hi] } }, render: 'whole' })

export default defineVoicePack({
  id: 'k-woods',
  // each story's question: `<story>-q`
  lines: Object.fromEntries(K_WOODS_STORIES.map((s) => [`${s.id}-q`, s.lines[2]])),
  // each story's start (`<story>-a`) and change (`<story>-b`), one clip per number
  templates: Object.fromEntries(K_WOODS_STORIES.flatMap((s) => [[`${s.id}-a`, template(s.lines[0], s.a)], [`${s.id}-b`, template(s.lines[1], s.b)]])),
})
