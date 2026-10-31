import { defineVoicePack } from '../types'

/**
 * Gobble Garden (src/games/GobbleGarden.tsx): the intro, the burp, the
 * praise, the cloud growing, the park's end and its K–1 stage names. K–1
 * hears the cloud's number ("You are 5. Eat the snacks smaller than 5!") and,
 * after a burp, the comparison ("7 is bigger than 5."); those numbers are 1–99,
 * recorded whole where the sentences are few and stitched from the shared
 * number clips where they're many. Fractions and decimals (grades 2–5, who
 * read) stay on screen.
 */
export default defineVoicePack({
  id: 'gobble-garden',
  lines: {
    intro: 'Steer the hungry cloud. Eat the snacks that are smaller than its number!',
    introListen: 'Drag the hungry cloud to a snack. It eats snacks smaller than its number!',
    tooBig: 'Too big, burp!',
    yum: 'Yum!',
    delicious: 'Delicious!',
    smartSnacking: 'Smart snacking!',
    greatComparing: 'Great comparing!',
    grew: 'Your cloud grew! Look at its new number.',
    topCloud: 'What a full cloud! Bonus points!',
    parkTidy: 'The park is tidy! Great eating!',
    timeUp: "Time's up! What a feast!",
    nextPark: 'Ready for the next park?',
    allDone: 'What a feast! Tap to collect your stars.',
    // the K–1 stage buttons (src/lib/listenNav.ts looks a stage's name up here after k-nav)
    'stage-k-dunes-gobble': 'Gobble Garden!',
    'stage-g1-tens-gobble': 'Gobble Garden!',
  },
  templates: {
    /** K–1's intro and each new park: the cloud's number. */
    youAre: { text: 'You are {n}. Eat the snacks smaller than {n}!', slots: { n: { numbers: [1, 99] } }, render: 'whole' },
    /** K–1: the belly filled and the number climbed. */
    nowYouAre: { text: 'Now you are {n}!', slots: { n: { numbers: [1, 99] } }, render: 'whole' },
    /** K–1: a nudge toward a snack when the cloud sits still. */
    findSmaller: { text: 'Find a snack smaller than {n}!', slots: { n: { numbers: [1, 99] } }, render: 'whole' },
    /** K–1, after a burp: what the picture shows. */
    bigger: { text: '{a} is bigger than {b}.', slots: { a: { numbers: [1, 99] }, b: { numbers: [1, 99] } }, render: 'stitch' },
    /** K–1's park card and results: how many snacks. */
    ateSnacks: { text: 'You ate {n} snacks!', slots: { n: { numbers: [1, 60] } }, render: 'whole' },
  },
})
