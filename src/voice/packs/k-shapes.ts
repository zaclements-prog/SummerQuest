import { defineVoicePack } from '../types'

/** The flat shapes a kindergartner names (K.G.2). */
export const K_FLAT_SHAPES = ['circle', 'square', 'triangle', 'rectangle', 'hexagon'] as const
/** The solid shapes a kindergartner names (K.G.2–3). */
export const K_SOLID_SHAPES = ['cube', 'sphere', 'cone', 'cylinder'] as const
export const K_SHAPES = [...K_FLAT_SHAPES, ...K_SOLID_SHAPES] as const
/** Flat shapes with straight sides to count (K.G.4). */
export const K_SIDED_SHAPES = ['triangle', 'square', 'rectangle', 'hexagon'] as const

/**
 * Kindergarten shapes (K.G.2–4): Shape Grove. Name flat and solid shapes,
 * tell flat from solid, count sides. Every template is a small space,
 * recorded whole.
 */
export default defineVoicePack({
  id: 'k-shapes',
  lines: {
    /** One flat card among solids (or the other way round). */
    tapFlat: 'Tap the shape that is flat.',
    tapSolid: 'Tap the shape that is solid.',
    /** Exactly one card has that many sides. */
    sides3: 'Tap the shape with three sides.',
    sides4: 'Tap the shape with four sides.',
    sides6: 'Tap the shape with six sides.',
    /** A circle among shapes with corners. */
    noCorners: 'Tap the shape with no corners.',
    // praise for this pack's questions (taking turns with the kit's own)
    youKnowShapes: 'You know your shapes!',
    shapeSpotter: 'Super shape spotting!',
  },
  templates: {
    /** 9 clips: "Tap the triangle." / "Tap the cube." */
    tapShape: { text: 'Tap the {shape}.', slots: { shape: { words: K_SHAPES } }, render: 'whole' },
    /** 9 clips: a card's label as it is tapped ("triangle!"). */
    label: { text: '{shape}!', slots: { shape: { words: K_SHAPES } }, render: 'whole' },
    /** 4 clips. The shape lights up; the walkthrough traces its sides as they are counted. */
    howManySides: {
      text: 'How many sides does the {shape} have?',
      slots: { shape: { words: K_SIDED_SHAPES } },
      render: 'whole',
    },
    /** 5 clips, after a flat card was the wrong pick: "A circle is flat." */
    isFlat: { text: 'A {shape} is flat.', slots: { shape: { words: K_FLAT_SHAPES } }, render: 'whole' },
    /** 4 clips: "A cube is solid." */
    isSolid: { text: 'A {shape} is solid.', slots: { shape: { words: K_SOLID_SHAPES } }, render: 'whole' },
  },
})
