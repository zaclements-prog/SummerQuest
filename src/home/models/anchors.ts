export type Slot = 'head' | 'face' | 'back' | 'body'

/**
 * Where each accessory slot sits on a creature, in the creature's own space
 * (feet on y = 0, facing +z). Accessories are authored at scale 1 for the
 * reference chibi head (≈0.54 wide, eyes at x = ±0.1) and are scaled by `scale`.
 *
 * The fitting conventions every accessory and every anchor below agree on:
 * - head: on the head's centre line, at the height where the skull is about
 *   0.19 × scale in radius — a hat's band of that size hugs the head there.
 * - face: midway between the eyes, on the eyes' front surface (eyes sit at
 *   x = ±0.1 × scale), so glasses lenses frame them.
 * - back: on the spine between the shoulders, at the body's surface; the body's
 *   centre line is ~0.175 × scale in front of it (capes and straps wrap round).
 * - body: the front of the neck just under the chin; the neck's centre line is
 *   ~0.15 × scale behind it (scarves and leis ring the neck).
 */
export interface AnchorSet {
  head: [number, number, number] // top of head (hats)
  face: [number, number, number] // front of head at eye level (glasses)
  back: [number, number, number] // shoulders/back (wings, capes, backpack)
  body: [number, number, number] // front of torso/neck (bowtie, scarf, outfit)
  scale: number // sizes accessories to the creature
}

// Measured from each creature's head/body ellipsoids (see the HC/HR constants in
// the creature files) and checked in /home?studio=anchors.
export const CREATURE_ANCHORS: Record<string, AnchorSet> = {
  fox:      { head: [0, 1.222, 0.03],  face: [0, 1.085, 0.282], back: [0, 0.75, -0.162], body: [0, 0.82, 0.155], scale: 1.05 },
  tiger:    { head: [0, 1.224, 0.02],  face: [0, 1.065, 0.272], back: [0, 0.745, -0.17],  body: [0, 0.8, 0.14],   scale: 1.08 },
  lion:     { head: [0, 1.32, -0.02],  face: [0, 1.085, 0.293], back: [0, 0.72, -0.18],  body: [0, 0.78, 0.15],  scale: 1.1 },
  bear:     { head: [0, 1.247, 0.03],  face: [0, 1.1, 0.285],   back: [0, 0.75, -0.19],  body: [0, 0.82, 0.155], scale: 1.1 },
  panda:    { head: [0, 1.249, 0.03],  face: [0, 1.09, 0.293],  back: [0, 0.75, -0.19],  body: [0, 0.82, 0.17],  scale: 1.1 },
  frog:     { head: [0, 1.217, -0.07], face: [0, 1.24, 0.2],    back: [0, 0.765, -0.167], body: [0, 0.82, 0.14],  scale: 1.15 },
  owl:      { head: [0, 1.244, 0.02],  face: [0, 1.075, 0.29],  back: [0, 0.82, -0.21],  body: [0, 0.86, 0.19],  scale: 1.08 },
  dragonet: { head: [0, 1.178, 0.04],  face: [0, 1.065, 0.283], back: [0, 0.78, -0.17],  body: [0, 0.79, 0.165], scale: 1.08 },
  unicorn:  { head: [0, 1.225, -0.05], face: [0, 1.083, 0.265], back: [0, 0.745, -0.168], body: [0, 0.8, 0.14],  scale: 1.02 },
  octopus:  { head: [0, 1.187, -0.01], face: [0, 0.82, 0.242],  back: [0, 0.82, -0.266], body: [0, 0.625, 0.15], scale: 1.12 },
  trex:     { head: [0, 1.24, -0.02],  face: [0, 1.15, 0.26],   back: [0, 0.82, -0.23],  body: [0, 0.76, 0.18],  scale: 1.12 },
  dragon:   { head: [0, 1.239, 0.03],  face: [0, 1.12, 0.281],  back: [0, 0.8, -0.18],   body: [0, 0.82, 0.18],  scale: 1.12 },
}

const FALLBACK: AnchorSet = { head: [0, 0.865, 0.02], face: [0, 0.705, 0.27], back: [0, 0.43, -0.175], body: [0, 0.47, 0.15], scale: 1.0 }

export function anchorsFor(creatureId: string | null | undefined): AnchorSet {
  return (creatureId && CREATURE_ANCHORS[creatureId]) || FALLBACK
}
