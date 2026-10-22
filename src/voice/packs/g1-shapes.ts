import { defineVoicePack } from '../types'

/** "Which one is still a …?": the shapes whose defining attributes 1st grade checks (1.G.1). */
export const G1_STILL_SHAPES = ['triangle', 'square', 'rectangle', 'circle'] as const
/** Every shape a 1st-grade card or piece can be named as it is tapped. */
export const G1_SHAPE_LABELS = ['triangle', 'square', 'rectangle', 'trapezoid', 'pentagon', 'hexagon', 'circle', 'oval', 'cube', 'cone', 'cylinder', 'sphere', 'box'] as const
/** The shapes two pieces make ("Which piece finishes the square?"). */
export const G1_MADE_SHAPES = ['square', 'rectangle', 'triangle', 'hexagon'] as const
/** The solids 1st grade rolls and stacks (1.G.1–2: cube, cone, cylinder, sphere). */
export const G1_SOLIDS = ['cube', 'cone', 'cylinder', 'sphere'] as const

/**
 * Things shaped like each solid: emoji every Android tablet draws (Unicode 9
 * or older, one symbol each), with the name said when the card is tapped.
 */
export const G1_SOLID_THINGS = {
  sphere: [
    { id: 'ball', emoji: '⚽', name: 'Ball!' },
    { id: 'globe', emoji: '🌍', name: 'Globe!' },
  ],
  cube: [{ id: 'dice', emoji: '🎲', name: 'Dice!' }],
  cone: [{ id: 'iceCream', emoji: '🍦', name: 'Ice cream cone!' }],
  cylinder: [
    { id: 'drum', emoji: '🥁', name: 'Drum!' },
    { id: 'battery', emoji: '🔋', name: 'Battery!' },
  ],
} as const

const each = <T,>(xs: readonly T[], f: (x: T) => [string, string][]) => Object.fromEntries(xs.flatMap(f))

/**
 * Shape Grove (1st grade, 1.G.1–2): what makes a shape that shape (closed,
 * straight sides, how many sides and corners) and what doesn't (its colour,
 * its size, which way it is turned); putting shapes together (two triangles
 * make a square, two squares a rectangle, a trapezoid and a triangle a bigger
 * triangle, two trapezoids a hexagon); and solids that roll and stack. Every
 * template is recorded whole.
 */
export default defineVoicePack({
  id: 'g1-shapes',
  lines: {
    // ── sides and corners (shape cards) ──
    sides3: 'Tap the shape with three sides and three corners.',
    sides4: 'Tap the shape with four sides and four corners.',
    sides5: 'Tap the shape with five sides and five corners.',
    sides6: 'Tap the shape with six sides and six corners.',
    noCorners: 'Tap the shape with no corners.',
    // a word about a card that was tapped and isn't the shape
    open: 'That one is not closed. It has an opening.',
    curved: 'That one has a curved side.',
    notSame: 'Its sides are not all the same length.',
    isOval: 'That one is an oval. It is stretched out.',
    hasCorners: 'That one has corners.',
    round: 'That one is round. It has no corners.',

    // ── put shapes together (the `snap` activity) ──
    'makes-square2tri': 'Two triangles snap together. What shape do they make?',
    'makes-rect2sq': 'Two squares snap together. What shape do they make?',
    'makes-bigTri': 'A trapezoid and a triangle snap together. What shape do they make?',
    'makes-hex2trap': 'Two trapezoids snap together. What shape do they make?',
    'makes-square2rect': 'Two rectangles snap together. What shape do they make?',
    // the help: the gap, or the new shape, and what it is
    'gap-triangle': 'Look at the gap: three sides and three corners. A triangle fits!',
    'gap-square': 'Look at the gap: four sides, all the same. A square fits!',
    'gap-rectangle': 'Look at the gap: two long sides and two short sides. A rectangle fits!',
    'gap-trapezoid': 'Look at the gap: a long side, a short side, and two slanted sides. A trapezoid fits!',
    'is-square': 'Four sides, all the same, and four square corners: a square!',
    'is-rectangle': 'Two long sides, two short sides, and four square corners: a rectangle!',
    'is-triangle': 'Three sides and three corners: a triangle!',
    'is-hexagon': 'Six sides and six corners: a hexagon!',

    // ── solids that roll and stack ──
    roll: 'Which one can roll?',
    cantRoll: "Which one can't roll?",
    stack: 'Which one can you stack?',
    rollStack: 'Which one can roll and stack?',
    stackNoRoll: "Which one can stack, but can't roll?",
    // a word about a solid that was tapped and isn't the answer
    'solid-sphere': "A sphere can roll, but it can't stack.",
    'solid-cube': "A cube can stack, but it can't roll.",
    'solid-box': "A box can stack, but it can't roll.",
    'solid-cylinder': 'A cylinder can roll and stack!',
    // the things shaped like the solids: their names as they are tapped
    ...each(Object.values(G1_SOLID_THINGS).flat(), (t) => [[`thing-${t.id}`, t.name]]),

    // ── praise (taking turns with the kit's own) ──
    shapeSmart: 'Smart shape thinking!',
    shapeBuilder: 'Great shape building!',
  },
  templates: {
    /** 4 clips: a turned, coloured, big or small one, among shapes that are open or have a curved side. */
    still: { text: 'Which one is still a {shape}?', slots: { shape: { words: G1_STILL_SHAPES } }, render: 'whole' },
    /** 13 clips: a card's name as it is tapped ("Triangle!"). */
    label: { text: '{shape}!', slots: { shape: { words: G1_SHAPE_LABELS } }, render: 'whole' },
    /** 4 clips: a note about a shape with the wrong number of sides. */
    hasSides: { text: 'That one has {n} sides.', slots: { n: { numbers: [3, 6] } }, render: 'whole' },
    /** 4 clips (the `snap` activity). */
    fill: { text: 'Which piece finishes the {shape}?', slots: { shape: { words: G1_MADE_SHAPES } }, render: 'whole' },
    /** 4 clips: things shaped like a solid. */
    likeShape: { text: 'Which one is shaped like a {solid}?', slots: { solid: { words: G1_SOLIDS } }, render: 'whole' },
    /** 4 clips: a note about a thing that was tapped: "That one is shaped like a sphere." */
    shapedLike: { text: 'That one is shaped like a {solid}.', slots: { solid: { words: G1_SOLIDS } }, render: 'whole' },
  },
})
