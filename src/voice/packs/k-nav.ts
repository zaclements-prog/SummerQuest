import { defineVoicePack } from '../types'

/**
 * Getting around without reading (K–1; K–5 plan §6): first-run avatar picking,
 * the World, the map, zone pages and the "Quit?" question. The voice NEVER
 * says the child's name (the privacy policy's promise), so no line has a slot
 * for it.
 *
 * Zone and stage lines are keyed by id (`name-<zoneId>`, `welcome-<zoneId>`,
 * `stage-<stageId>`) and looked up by src/lib/listenNav.ts; a test checks every
 * open K–1 zone and pilot stage has its lines.
 */
export default defineVoicePack({
  id: 'k-nav',
  lines: {
    // ── first run: pick an animal friend and a color (AvatarCreate) ──
    pickAnimal: 'Pick your animal friend!',
    pickColor: 'Now pick a color!',
    tapBegin: 'Tap the big green button to start!',
    // the animal tiles, said as they're tapped
    'animal-fox': 'Fox!',
    'animal-tiger': 'Tiger!',
    'animal-lion': 'Lion!',
    'animal-bear': 'Bear!',
    'animal-panda': 'Panda!',
    'animal-frog': 'Frog!',
    'animal-owl': 'Owl!',
    'animal-dragonet': 'Little dragon!',
    'animal-unicorn': 'Unicorn!',
    'animal-octopus': 'Octopus!',
    'animal-trex': 'Dinosaur!',
    'animal-dragon': 'Dragon!',
    // the color swatches
    'color-orange': 'Orange!',
    'color-pink': 'Pink!',
    'color-green': 'Green!',
    'color-blue': 'Blue!',
    'color-purple': 'Purple!',
    'color-red': 'Red!',

    // ── the World ──
    worldHello: 'This is your island!',
    tourMap: 'Tap the map to see the whole island.',
    tourPets: 'Your pets live here.',
    tourHome: 'And this is your home.',
    tourWalk: 'Tap the ground to walk. Find a bright place to play!',
    sleeping: 'This place is still sleeping. Come back soon!',
    tapAStar: 'Tap a star to play!',
    playThisFirst: 'Play this one first!',
    lessonTime: "Let's learn something new!",

    // ── the map ──
    mapHelp: 'This is the island map. Tap a bright place to go there!',

    // ── Home and Pets ──
    homeHelp: 'This is your home! Tap the arrow to go back outside.',
    petsHelp: 'These are your pets. Play games to hatch the eggs and help them grow!',
    petHatched: 'Your egg hatched!',
    petGrew: 'Your pet grew bigger!',
    petGrownUp: 'Your pet is all grown up!',

    // ── "Quit?" in a game ──
    quitAsk: 'Do you want to stop playing?',

    // ── the open K–1 zones (pilot): name on the map, welcome at the gateway and on the zone page ──
    'name-multiplication-mesa': 'Counting Mesa!',
    'name-geometry-grove': 'Shape Grove!',
    'name-reading-reef': 'Letter Reef!',
    'welcome-multiplication-mesa': 'Counting Mesa! Tap a star to play!',
    'welcome-geometry-grove': 'Shape Grove! Tap a star to play!',
    'welcome-reading-reef': 'Letter Reef! Tap a star to play!',

    // ── the pilot's stage buttons ──
    'stage-k-count-1': 'Count with me!',
    'stage-k-count-parade': 'Critter Parade!',
    'stage-k-count-3': 'More or fewer!',
    'stage-k-shapes-1': 'Name that shape!',
    'stage-k-shapes-2': 'Flat or solid!',
    'stage-k-shapes-3': 'Shape hunt!',
    'stage-k-letters-1': 'Find the letter!',
    'stage-k-letters-2': 'Big and little letters!',
    'stage-k-letters-3': 'First sounds!',
    'stage-k-rhyme-1': 'Rhyme time!',
    'stage-k-syllables-1': 'Clap the parts!',
    'stage-k-rhyme-2': 'Finish the rhyme!',
    'stage-k-blend-1': 'Sound it out!',
    'stage-k-sight-1': 'Word hunt!',

    // ── Writing Workshop (K literacy, phase 1b): its name, welcome and stage buttons ──
    'name-writing-workshop': 'Writing Workshop!',
    'welcome-writing-workshop': 'Writing Workshop! Tap a star to play!',
    'stage-k-trace-1': 'Warm-up lines!',
    'stage-k-trace-2': 'Trace numbers!',
    'stage-k-trace-3': 'Trace big letters!',
    'stage-k-story-1': 'Story order!',
  },
})
