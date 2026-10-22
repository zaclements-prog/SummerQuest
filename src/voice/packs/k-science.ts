import { defineVoicePack } from '../types'

/** Animals that get hungry in "What does it need?" (their food's picture is the provider's). */
export const K_HUNGRY_ANIMALS = ['rabbit', 'monkey', 'mouse', 'bear', 'horse', 'squirrel'] as const
/** Animals that get thirsty. */
export const K_THIRSTY_ANIMALS = ['dog', 'cat', 'cow', 'elephant', 'lion', 'pig'] as const
/** Animals that need a home: each lives in exactly one of the home pictures shown. */
export const K_HOME_ANIMALS = ['fish', 'octopus', 'bird', 'monkey', 'camel', 'dog'] as const

/**
 * Nature Summit (Science Summit for K–1; K-ESS2, K-LS1, K-PS2): the weather
 * and what to wear, what plants and animals need, push and pull. Every card
 * is named as it lights up (`<card>` lines); a wrong pick gets a line about
 * the card that was picked (`is-…`, `for-…`, `eats-…`, `lives-…`, `why-…`).
 * The few templates are recorded whole (six clips each).
 */
export default defineVoicePack({
  id: 'k-science',
  lines: {
    // ── the weather (k-science-1) ──
    'tap-sunny': 'Tap the sunny day.',
    'tap-rainy': 'Tap the rainy day.',
    'tap-snowy': 'Tap the snowy day.',
    'tap-windy': 'Tap the windy day.',
    'wear-sunny': 'It is sunny and hot. What will you wear?',
    'wear-rainy': 'It is raining. What do you need?',
    'wear-snowy': 'It is snowing. What will you wear?',
    'wear-windy': 'It is windy. What can you fly?',
    sunny: 'Sunny!',
    rainy: 'Rainy!',
    snowy: 'Snowy!',
    windy: 'Windy!',
    'is-sunny': 'That is a sunny day.',
    'is-rainy': 'That is a rainy day.',
    'is-snowy': 'That is a snowy day.',
    'is-windy': 'That is a windy day.',
    sunglasses: 'Sunglasses!',
    sunHat: 'A sun hat!',
    umbrella: 'An umbrella!',
    mittens: 'Mittens!',
    warmHat: 'A warm hat!',
    scarf: 'A scarf!',
    kite: 'A kite!',
    'for-sunglasses': 'Sunglasses are for sunny days.',
    'for-sunHat': 'A sun hat is for hot, sunny days.',
    'for-umbrella': 'An umbrella keeps you dry in the rain.',
    'for-mittens': 'Mittens keep your hands warm in the snow.',
    'for-warmHat': 'A warm hat keeps you warm in the snow.',
    'for-scarf': 'A scarf keeps you warm in the snow.',
    'for-kite': 'A kite flies on a windy day.',

    // ── what plants and animals need (k-science-2) ──
    plantNeeds: 'What does a plant need to grow?',
    plantNote: 'A plant needs sun and water to grow.',
    sun: 'The sun!',
    water: 'Water!',
    // things living things don't need
    ball: 'A ball!',
    shoe: 'A shoe!',
    guitar: 'A guitar!',
    car: 'A car!',
    balloon: 'A balloon!',
    // food
    carrot: 'A carrot!',
    banana: 'A banana!',
    cheese: 'Cheese!',
    honey: 'Honey!',
    apple: 'An apple!',
    nut: 'A nut!',
    'eats-rabbit': 'Rabbits eat carrots!',
    'eats-monkey': 'Monkeys eat bananas!',
    'eats-mouse': 'Mice eat cheese!',
    'eats-bear': 'Bears eat honey!',
    'eats-horse': 'Horses eat apples!',
    'eats-squirrel': 'Squirrels eat nuts!',
    drinkNote: 'Animals drink water when they are thirsty.',
    // homes
    ocean: 'The ocean!',
    tree: 'A tree!',
    desert: 'The desert!',
    house: 'A house!',
    'lives-fish': 'Fish live in the ocean.',
    'lives-octopus': 'An octopus lives in the ocean.',
    'lives-bird': 'Birds live in trees.',
    'lives-monkey': 'Monkeys live in trees.',
    'lives-camel': 'Camels live in the desert.',
    'lives-dog': 'A dog can live in a house with us.',

    // ── push and pull (k-science-3) ──
    'pp-swing': 'Look at the swing. Push or pull?',
    'pp-door': 'Look at the door. Push or pull?',
    'pp-kick': 'Look at the ball. Push or pull?',
    'pp-cart': 'Look at the cart. Push or pull?',
    'pp-wagon': 'Look at the wagon. Push or pull?',
    'pp-drawer': 'Look at the drawer. Push or pull?',
    'pp-kiteString': 'Look at the kite. Push or pull?',
    'pp-carrot': 'Look at the carrot. Push or pull?',
    push: 'Push!',
    pull: 'Pull!',
    'why-swing': 'The swing goes away. That is a push!',
    'why-door': 'The door goes away. That is a push!',
    'why-kick': 'The ball goes away. That is a push!',
    'why-cart': 'The cart goes away. That is a push!',
    'why-wagon': 'The wagon comes closer. That is a pull!',
    'why-drawer': 'The drawer comes closer. That is a pull!',
    'why-kiteString': 'The kite comes closer. That is a pull!',
    'why-carrot': 'The carrot comes closer. That is a pull!',
    tapPush: 'Tap the push!',
    tapPull: 'Tap the pull!',
    'name-swing': 'The swing!',
    'name-door': 'The door!',
    'name-kick': 'The ball!',
    'name-cart': 'The cart!',
    'name-wagon': 'The wagon!',
    'name-drawer': 'The drawer!',
    'name-kiteString': 'The kite!',
    'name-carrot': 'The carrot!',
    far: 'Which push makes the ball go far?',
    near: 'Which push makes the ball go a little way?',
    bigPush: 'A big push!',
    littlePush: 'A little push!',
    bigNote: 'A big push makes it go far.',
    littleNote: 'A little push makes it go a little way.',

    // praise (taking turns with the kit's)
    greatThinking: 'Great thinking!',
    scientist: 'You are a super scientist!',
  },
  templates: {
    /** 6 clips. */
    hungry: { text: 'The {animal} is hungry. What does it need?', slots: { animal: { words: K_HUNGRY_ANIMALS } }, render: 'whole' },
    /** 6 clips. */
    thirsty: { text: 'The {animal} is thirsty. What does it need?', slots: { animal: { words: K_THIRSTY_ANIMALS } }, render: 'whole' },
    /** 6 clips. */
    home: { text: 'The {animal} needs a home. Where does it live?', slots: { animal: { words: K_HOME_ANIMALS } }, render: 'whole' },
  },
})
