import { defineVoicePack, type TemplateDef } from '../types'

/**
 * Story Woods at 1st grade (1.OA.1–2): spoken story problems within 20, every
 * kind of story with the unknown in every place, and three groups. Each story
 * is two or three short lines and a question; the child acts it out on screen
 * (the `mathStory` activity), taps the answer, and the number sentence is
 * written and read ("8 + 5 = 13").
 *
 * - `join` / `leave` / `together`: as kindergarten's, with bigger numbers;
 * - `compare` (how many more) and `fewer` (how many fewer): two groups lined
 *   up one to one;
 * - `joinChange`: "Bear had 8 apples." "Then Fox gave her some more." "Now
 *   Bear has 13 apples." "How many apples did Fox give her?";
 * - `leaveChange`: "15 birds sat in a tree." "Then some flew away." "Now
 *   there are 9 birds in the tree." "How many birds flew away?";
 * - `joinStart`: "Bear had some apples." "Then Fox gave her 5 more." "Now
 *   Bear has 13 apples." "How many apples did Bear have at the start?";
 * - `apart` (take apart): "Bunny picked 12 flowers." "5 are tulips. The rest
 *   are sunflowers." "How many sunflowers did Bunny pick?" (the child takes
 *   the tulips out);
 * - `three` (three addends): "Bear put 4 apples in the basket." "Fox put in 3
 *   pears." "Then Owl put in 5 peaches." "How many fruits are in the basket?"
 *
 * `{n}` slots are recorded whole, one clip per number in the story's range
 * (`nums`: the first, second and third line's). The pictures, places and
 * characters live with the provider (src/lib/providers/g1StoryMath.ts); a test
 * keeps the two in step. Kind stories only: sharing, finding, building, playing.
 */
export type G1WoodsPlot = 'join' | 'leave' | 'together' | 'compare' | 'fewer' | 'joinChange' | 'leaveChange' | 'joinStart' | 'apart' | 'three'

export interface G1WoodsStory {
  id: string
  plot: G1WoodsPlot
  /** The story's lines (a line without `{n}` is fixed), then the question. */
  lines: readonly string[]
  ask: string
  /** Taking apart: what the child is asked to do ("Tap each tulip to take it out!"). */
  act?: string
  /** Each line's numbers, as recorded (null: a line with no number). */
  nums: readonly (readonly [number, number] | null)[]
}

// the numbers each kind of story is recorded for (a stage picks within them, ramping)
const JOIN = [[5, 12], [2, 6]] as const
const LEAVE = [[10, 16], [2, 7]] as const
const TOGETHER = [[4, 10], [3, 8]] as const
const COMPARE = [[6, 10], [3, 8]] as const
const JOIN_CHANGE = [[4, 10], null, [6, 16]] as const
const LEAVE_CHANGE = [[9, 16], null, [3, 14]] as const
const JOIN_START = [null, [2, 6], [5, 15]] as const
const APART = [[7, 16], [2, 8]] as const
const THREE = [[2, 7], [2, 5], [2, 5]] as const

export const G1_WOODS_STORIES = [
  // ── add to (the result unknown) ──
  { id: 'duckPond', plot: 'join', nums: JOIN, lines: ['{n} ducks swam in the pond.', 'Then {n} more swam over.'], ask: 'How many ducks are in the pond now?' },
  { id: 'sheepField', plot: 'join', nums: JOIN, lines: ['{n} sheep ate grass in the field.', 'Then {n} more sheep came to eat.'], ask: 'How many sheep are in the field now?' },
  { id: 'penguinFish', plot: 'join', nums: JOIN, lines: ['Penguin caught {n} fish.', 'Then she caught {n} more.'], ask: 'How many fish did Penguin catch?' },
  { id: 'gardenBees', plot: 'join', nums: JOIN, lines: ['{n} bees buzzed in the garden.', 'Then {n} more bees flew in.'], ask: 'How many bees are in the garden now?' },
  // ── take from (the result unknown) ──
  { id: 'logFrogs', plot: 'leave', nums: LEAVE, lines: ['{n} frogs sat on a log.', 'Then {n} jumped into the pond.'], ask: 'How many frogs are still on the log?' },
  { id: 'squirrelSnack', plot: 'leave', nums: LEAVE, lines: ['Squirrel had {n} nuts.', 'She ate {n} of them.'], ask: 'How many nuts does Squirrel have now?' },
  { id: 'mouseCookies', plot: 'leave', nums: LEAVE, lines: ['Mouse baked {n} cookies.', 'His friends ate {n}.'], ask: 'How many cookies are left?' },
  { id: 'pigBalloons', plot: 'leave', nums: LEAVE, lines: ['Pig had {n} balloons.', 'Whoosh! {n} floated away.'], ask: 'How many balloons does Pig have now?' },
  // ── put together ──
  { id: 'foxBerries', plot: 'together', nums: TOGETHER, lines: ['Fox picked {n} strawberries.', 'Then she picked {n} cherries.'], ask: 'How many berries did Fox pick?' },
  { id: 'pondPals', plot: 'together', nums: TOGETHER, lines: ['{n} ducks swam in the pond.', '{n} turtles swam with them.'], ask: 'How many animals are in the pond?' },
  { id: 'toyBox', plot: 'together', nums: TOGETHER, lines: ['Puppy put {n} balls in his toy box.', 'Then he put in {n} cars.'], ask: 'How many toys are in the box?' },
  { id: 'farmYard', plot: 'together', nums: TOGETHER, lines: ['{n} hens pecked in the yard.', '{n} chicks pecked with them.'], ask: 'How many birds are in the yard?' },
  // ── how many more: one each for a row of friends ──
  { id: 'penguinHats', plot: 'compare', nums: COMPARE, lines: ['{n} penguins wanted a hat.', 'There were only {n} hats.'], ask: 'How many more hats do we need?' },
  { id: 'beeFlowers', plot: 'compare', nums: COMPARE, lines: ['{n} bees wanted a flower.', 'There were only {n} flowers.'], ask: 'How many more flowers do we need?' },
  { id: 'puppyBalls', plot: 'compare', nums: COMPARE, lines: ['{n} puppies wanted a ball.', 'There were only {n} balls.'], ask: 'How many more balls do we need?' },
  // ── how many fewer: two groups lined up ──
  { id: 'applePicking', plot: 'fewer', nums: COMPARE, lines: ['Bear picked {n} apples.', 'Fox picked {n} apples.'], ask: 'How many fewer apples did Fox pick?' },
  { id: 'shellHunt', plot: 'fewer', nums: COMPARE, lines: ['Crab found {n} shells.', 'Turtle found {n} shells.'], ask: 'How many fewer shells did Turtle find?' },
  { id: 'starGazing', plot: 'fewer', nums: COMPARE, lines: ['Owl saw {n} stars.', 'Bat saw {n} stars.'], ask: 'How many fewer stars did Bat see?' },
  { id: 'carrotPulling', plot: 'fewer', nums: COMPARE, lines: ['Bunny pulled {n} carrots.', 'Pig pulled {n} carrots.'], ask: 'How many fewer carrots did Pig pull?' },
  // ── add to, the change unknown ──
  { id: 'appleGift', plot: 'joinChange', nums: JOIN_CHANGE, lines: ['Bear had {n} apples.', 'Then Fox gave her some more.', 'Now Bear has {n} apples.'], ask: 'How many apples did Fox give her?' },
  { id: 'branchBirds', plot: 'joinChange', nums: JOIN_CHANGE, lines: ['{n} birds sat on a branch.', 'Then some more birds flew in.', 'Now there are {n} birds on the branch.'], ask: 'How many birds flew in?' },
  { id: 'henNest', plot: 'joinChange', nums: JOIN_CHANGE, lines: ['Hen had {n} eggs in her nest.', 'Then she laid some more.', 'Now she has {n} eggs.'], ask: 'How many eggs did Hen lay?' },
  { id: 'crabBox', plot: 'joinChange', nums: JOIN_CHANGE, lines: ['Crab had {n} shells in her box.', 'Then she found some more.', 'Now she has {n} shells.'], ask: 'How many shells did Crab find?' },
  // ── take from, the change unknown ──
  { id: 'treeBirds', plot: 'leaveChange', nums: LEAVE_CHANGE, lines: ['{n} birds sat in a tree.', 'Then some flew away.', 'Now there are {n} birds in the tree.'], ask: 'How many birds flew away?' },
  { id: 'rockFish', plot: 'leaveChange', nums: LEAVE_CHANGE, lines: ['{n} fish swam by the rock.', 'Then some swam away.', 'Now there are {n} fish by the rock.'], ask: 'How many fish swam away?' },
  { id: 'bearShare', plot: 'leaveChange', nums: LEAVE_CHANGE, lines: ['Bear baked {n} cookies.', 'Then she gave some to her friends.', 'Now she has {n} cookies.'], ask: 'How many cookies did Bear give away?' },
  { id: 'windyLeaves', plot: 'leaveChange', nums: LEAVE_CHANGE, lines: ['Fox raked {n} leaves into a pile.', 'Then the wind blew some away.', 'Now there are {n} leaves in the pile.'], ask: 'How many leaves blew away?' },
  // ── add to, the start unknown ──
  { id: 'appleStart', plot: 'joinStart', nums: JOIN_START, lines: ['Bear had some apples.', 'Then Fox gave her {n} more.', 'Now Bear has {n} apples.'], ask: 'How many apples did Bear have at the start?' },
  { id: 'frogStart', plot: 'joinStart', nums: JOIN_START, lines: ['Some frogs sat on a log.', 'Then {n} more frogs hopped on.', 'Now there are {n} frogs on the log.'], ask: 'How many frogs were on the log at the start?' },
  { id: 'starStart', plot: 'joinStart', nums: JOIN_START, lines: ['Owl saw some stars.', 'Then {n} more stars came out.', 'Now Owl can see {n} stars.'], ask: 'How many stars did Owl see at the start?' },
  { id: 'balloonStart', plot: 'joinStart', nums: JOIN_START, lines: ['Puppy had some balloons.', 'Then Kitty gave him {n} more.', 'Now Puppy has {n} balloons.'], ask: 'How many balloons did Puppy have at the start?' },
  // ── take apart ──
  { id: 'flowerSort', plot: 'apart', nums: APART, lines: ['Bunny picked {n} flowers.', '{n} are tulips. The rest are sunflowers.'], ask: 'How many sunflowers did Bunny pick?', act: 'Tap each tulip to take it out!' },
  { id: 'fruitSort', plot: 'apart', nums: APART, lines: ['Monkey has {n} fruits.', '{n} are bananas. The rest are oranges.'], ask: 'How many oranges does Monkey have?', act: 'Tap each banana to take it out!' },
  { id: 'pondSort', plot: 'apart', nums: APART, lines: ['{n} animals swam in the pond.', '{n} are ducks. The rest are turtles.'], ask: 'How many turtles are in the pond?', act: 'Tap each duck to send it out!' },
  { id: 'toySort', plot: 'apart', nums: APART, lines: ['Puppy has {n} toys in his box.', '{n} are balls. The rest are cars.'], ask: 'How many cars does Puppy have?', act: 'Tap each ball to take it out!' },
  // ── three groups ──
  { id: 'fruitBasket', plot: 'three', nums: THREE, lines: ['Bear put {n} apples in the basket.', 'Fox put in {n} pears.', 'Then Owl put in {n} peaches.'], ask: 'How many fruits are in the basket?' },
  { id: 'pondParty', plot: 'three', nums: THREE, lines: ['{n} ducks swam in the pond.', 'Then {n} frogs hopped in.', 'Then {n} turtles swam in too.'], ask: 'How many animals are in the pond?' },
  { id: 'toyCleanup', plot: 'three', nums: THREE, lines: ['Puppy put {n} balls in his toy box.', 'Then he put in {n} cars.', 'Then he put in {n} drums.'], ask: 'How many toys are in the box?' },
  { id: 'flowerBunch', plot: 'three', nums: THREE, lines: ['Bunny picked {n} tulips.', 'Then she picked {n} sunflowers.', 'Then she picked {n} roses.'], ask: 'How many flowers did Bunny pick?' },
] as const satisfies readonly G1WoodsStory[]

export type G1WoodsStoryId = (typeof G1_WOODS_STORIES)[number]['id']

const template = (text: string, [lo, hi]: readonly [number, number]): TemplateDef => ({ text, slots: { n: { numbers: [lo, hi] } }, render: 'whole' })
const LINE_KEYS = ['a', 'b', 'c'] as const

/** A story's line `i` as said: a template over its numbers, or a fixed line. */
export const g1WoodsLineId = (story: string, i: number) => `${story}-${LINE_KEYS[i]}`

const stories: readonly G1WoodsStory[] = G1_WOODS_STORIES

export default defineVoicePack({
  id: 'g1-woods',
  // each story's question (`<story>-q`), its lines with no number, and a take-apart story's act prompt (`<story>-act`)
  lines: Object.fromEntries(
    stories.flatMap((s) => [
      [`${s.id}-q`, s.ask] as [string, string],
      ...s.lines.flatMap((text, i): [string, string][] => (s.nums[i] ? [] : [[g1WoodsLineId(s.id, i), text]])),
      ...(s.act ? [[`${s.id}-act`, s.act] as [string, string]] : []),
    ]),
  ),
  // each line with a number (`<story>-a`, `-b`, `-c`), one clip per number
  templates: Object.fromEntries(stories.flatMap((s) => s.lines.flatMap((text, i): [string, TemplateDef][] => (s.nums[i] ? [[g1WoodsLineId(s.id, i), template(text, s.nums[i]!)]] : [])))),
})
