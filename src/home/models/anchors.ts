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
  fox:      { head: [0, 0.865, 0.02],  face: [0, 0.705, 0.27],  back: [0, 0.43, -0.175], body: [0, 0.47, 0.15],  scale: 1.0 },
  tiger:    { head: [0, 0.867, 0.02],  face: [0, 0.715, 0.27],  back: [0, 0.43, -0.175], body: [0, 0.47, 0.15],  scale: 1.04 },
  lion:     { head: [0, 0.97, -0.02],  face: [0, 0.72, 0.27],   back: [0, 0.43, -0.175], body: [0, 0.47, 0.15],  scale: 1.0 },
  bear:     { head: [0, 0.867, 0.02],  face: [0, 0.72, 0.27],   back: [0, 0.43, -0.18],  body: [0, 0.47, 0.155], scale: 1.04 },
  panda:    { head: [0, 0.868, 0.02],  face: [0, 0.71, 0.27],   back: [0, 0.43, -0.18],  body: [0, 0.47, 0.155], scale: 1.055 },
  frog:     { head: [0, 0.8, -0.07],   face: [0, 0.805, 0.21],  back: [0, 0.4, -0.18],   body: [0, 0.43, 0.17],  scale: 1.1 },
  owl:      { head: [0, 0.874, 0.02],  face: [0, 0.71, 0.28],   back: [0, 0.47, -0.22],  body: [0, 0.47, 0.2],   scale: 1.04 },
  dragonet: { head: [0, 0.864, 0.03],  face: [0, 0.72, 0.28],   back: [0, 0.43, -0.175], body: [0, 0.47, 0.15],  scale: 1.0 },
  unicorn:  { head: [0, 0.875, -0.02], face: [0, 0.725, 0.27],  back: [0, 0.43, -0.175], body: [0, 0.47, 0.15],  scale: 1.0 },
  octopus:  { head: [0, 0.8, 0.0],     face: [0, 0.49, 0.285],  back: [0, 0.55, -0.29],  body: [0, 0.28, 0.19],  scale: 1.15 },
  trex:     { head: [0, 0.88, 0.02],   face: [0, 0.795, 0.27],  back: [0, 0.43, -0.205], body: [0, 0.43, 0.17],  scale: 0.98 },
  dragon:   { head: [0, 0.897, 0.03],  face: [0, 0.755, 0.285], back: [0, 0.46, -0.19],  body: [0, 0.49, 0.165], scale: 1.02 },
}

const FALLBACK: AnchorSet = { head: [0, 0.865, 0.02], face: [0, 0.705, 0.27], back: [0, 0.43, -0.175], body: [0, 0.47, 0.15], scale: 1.0 }

export function anchorsFor(creatureId: string | null | undefined): AnchorSet {
  return (creatureId && CREATURE_ANCHORS[creatureId]) || FALLBACK
}
