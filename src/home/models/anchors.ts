export type Slot = 'head' | 'face' | 'back' | 'body'

export interface AnchorSet {
  head: [number, number, number] // top of head (hats)
  face: [number, number, number] // front of head at eye level (glasses)
  back: [number, number, number] // shoulders/back (wings, capes, backpack)
  body: [number, number, number] // front of torso/neck (bowtie, scarf, outfit)
  scale: number // sizes accessories to the creature
}

// Starting values derived from each creature's head/body geometry. These are the
// FIRST DRAFT — a later task vision-tunes them on fox/dragon/octopus and adjusts the rest.
export const CREATURE_ANCHORS: Record<string, AnchorSet> = {
  fox:      { head: [0, 0.86, 0.42], face: [0, 0.66, 0.64], back: [0, 0.52, -0.2], body: [0, 0.4, 0.34], scale: 1.0 },
  tiger:    { head: [0, 0.9, 0.44],  face: [0, 0.68, 0.66], back: [0, 0.52, -0.2], body: [0, 0.4, 0.36], scale: 1.05 },
  lion:     { head: [0, 0.92, 0.42], face: [0, 0.66, 0.64], back: [0, 0.52, -0.2], body: [0, 0.4, 0.34], scale: 1.05 },
  bear:     { head: [0, 0.96, 0.4],  face: [0, 0.72, 0.6],  back: [0, 0.56, -0.2], body: [0, 0.45, 0.34], scale: 1.1 },
  panda:    { head: [0, 1.02, 0.4],  face: [0, 0.78, 0.62], back: [0, 0.5, -0.2],  body: [0, 0.4, 0.36], scale: 1.1 },
  frog:     { head: [0, 0.72, 0.1],  face: [0, 0.5, 0.42],  back: [0, 0.4, -0.2],  body: [0, 0.32, 0.3], scale: 1.0 },
  owl:      { head: [0, 1.0, 0.0],   face: [0, 0.7, 0.36],  back: [0, 0.6, -0.2],  body: [0, 0.45, 0.26], scale: 1.0 },
  dragonet: { head: [0, 1.0, 0.4],   face: [0, 0.75, 0.6],  back: [0, 0.6, -0.25], body: [0, 0.45, 0.3], scale: 1.0 },
  unicorn:  { head: [0, 1.16, 0.46], face: [0, 0.9, 0.66],  back: [0, 0.6, -0.2],  body: [0, 0.45, 0.36], scale: 1.1 },
  octopus:  { head: [0, 0.72, 0.0],  face: [0, 0.46, 0.36], back: [0, 0.4, -0.2],  body: [0, 0.32, 0.3], scale: 1.0 },
  trex:     { head: [0, 1.0, 0.3],   face: [0, 0.82, 0.5],  back: [0, 0.56, -0.1], body: [0, 0.5, 0.3],  scale: 1.05 },
  dragon:   { head: [0, 1.16, 0.54], face: [0, 0.9, 0.74],  back: [0, 0.66, -0.25], body: [0, 0.5, 0.4],  scale: 1.15 },
}

const FALLBACK: AnchorSet = { head: [0, 0.95, 0.3], face: [0, 0.7, 0.55], back: [0, 0.55, -0.2], body: [0, 0.42, 0.32], scale: 1.0 }

export function anchorsFor(creatureId: string | null | undefined): AnchorSet {
  return (creatureId && CREATURE_ANCHORS[creatureId]) || FALLBACK
}
