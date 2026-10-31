import { defineVoicePack } from '../types'

/**
 * The snacks kindergarten and 1st grade count onto the tray at the Snack
 * Shack (src/games/SnackShack.tsx). Their pictures live with the order
 * generator (src/lib/providers/snackShack.ts); a test keeps the lists in step.
 */
export const SHACK_K_FOODS = ['apples', 'bananas', 'cookies', 'strawberries', 'donuts', 'lemons'] as const
export type ShackKFood = (typeof SHACK_K_FOODS)[number]

/**
 * Snack Shack (src/games/SnackShack.tsx): the fixed lines of the beach stand.
 * Kindergarten and 1st grade hear everything: the orders ("3 apples and 2
 * bananas, please!"), the clock times ("I'll be back at 3 o'clock"), the help.
 * Grades 2–5 hear the fixed lines here; the orders with their prices and
 * times are read by device speech, like the "Show me how" steps.
 */
export default defineVoicePack({
  id: 'snack-shack',
  lines: {
    introListen: "Welcome to the Snack Shack! Hungry critters are coming. Let's fill their orders!",
    introListenClock: 'Welcome to the Snack Shack! Fill each order, then set the pick-up clock.',
    intro: 'Welcome to the Snack Shack! Fill each order, add up the price, and give the right change.',
    tapFood: 'Tap the food to put it on the tray.',
    ringBell: 'Then ring the bell!',
    howManyInAll: 'How many snacks in all?',
    countTogether: "Let's count them together.",
    tooMany: 'Too many! Tap one to put it back.',
    needMore: 'We need more. Tap the food!',
    tryAgain: 'Try again. You can do it!',
    thanks1: 'Yum! Thank you!',
    thanks2: 'Ka-ching! Happy customer!',
    thanks3: 'Wow, that looks delicious!',
    tipStars: 'They gave you stars!',
    pickDecor: 'Pick something new for the shack!',
    shackFancier: 'The Snack Shack is getting fancier!',
    shiftDone: 'What a great day at the Snack Shack!',
    setClock: 'Move the long hand to set the clock.',
    longHand12: 'The long hand points straight up to the 12.',
    longHand6: 'The long hand points down to the 6.',
    whatTotal: 'What is the total?',
    addPrices: 'Add up the prices on the tags.',
    giveChange: 'Count out the change. Drag the coins and bills to the tray.',
    countUp: "Let's count up from the price to what they paid, like a shopkeeper.",
    clockTower: 'Clock Tower order! Move the clock hands to the right time.',
    jumpAlong: "Let's jump along the timeline.",
    overNoon: "We went past 12 noon, so it's p.m. now!",
    finishCountUp: 'Put those in the tray. Then count up the rest of the way. Your turn!',
    setClockShort: 'Turn the short hand to the hour. Then check the long hand!',
  },
  templates: {
    /** "3 apples, please!" (42 clips) */
    orderOne: { text: '{n} {food}, please!', slots: { n: { numbers: [2, 8] }, food: { words: SHACK_K_FOODS } }, render: 'whole' },
    /** "3 apples and 2 bananas, please!" (stitched from the shared number and word clips) */
    orderTwo: {
      text: '{a} {foodA} and {b} {foodB}, please!',
      slots: { a: { numbers: [2, 6] }, foodA: { words: SHACK_K_FOODS }, b: { numbers: [2, 6] }, foodB: { words: SHACK_K_FOODS } },
      render: 'stitch',
    },
    /** Counting along the tray, one number at a time. */
    count: { text: '{n}!', slots: { n: { numbers: [1, 12] } }, render: 'whole' },
    /** After a miss: "We need 3 apples." (42 clips) */
    weNeed: { text: 'We need {n} {food}.', slots: { n: { numbers: [2, 8] }, food: { words: SHACK_K_FOODS } }, render: 'whole' },
    /** "5 snacks in all!" */
    inAll: { text: '{n} snacks in all!', slots: { n: { numbers: [2, 12] } }, render: 'whole' },
    /** 1st grade's pick-up times, to the hour and half hour. */
    backAt: { text: "I'll be back at {h} o'clock. Set the clock!", slots: { h: { numbers: [1, 12] } }, render: 'whole' },
    backAtHalf: { text: "I'll be back at half past {h}. Set the clock!", slots: { h: { numbers: [1, 12] } }, render: 'whole' },
    shortHandAt: { text: 'The short hand points to the {h}.', slots: { h: { numbers: [1, 12] } }, render: 'whole' },
    shortHandPast: { text: 'The short hand is just past the {h}.', slots: { h: { numbers: [1, 12] } }, render: 'whole' },
  },
})
