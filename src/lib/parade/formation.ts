/**
 * The parade's shape: a sunflower spiral (Vogel's model) squeezed into a
 * column behind the leader. Slot i sits at radius √i, turned by the golden
 * angle, so any count fills an even blob and a newcomer always lands on the
 * outside. Pure numbers; the crowd renderer writes them into instance matrices.
 */

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export interface FormationShape {
  /** Distance between neighbours. */
  spacing: number
  /** Squeeze across the track (< 1 keeps the parade inside its lane). */
  sx: number
  /** Stretch along the track (> 1 makes a column). */
  sz: number
}

export const PARADE_SHAPE: FormationShape = { spacing: 0.54, sx: 0.62, sz: 1.3 }

/** Radius of the blob holding `count` critters, along z (for placing it behind the leader). */
export function formationDepth(count: number, shape: FormationShape = PARADE_SHAPE): number {
  return shape.spacing * Math.sqrt(Math.max(1, count)) * shape.sz
}

/** Slot `i`'s offset from the blob's centre: x across, z along the track (+z = behind). Writes into `out`. */
export function slotOffset(i: number, out: { x: number; z: number }, shape: FormationShape = PARADE_SHAPE): { x: number; z: number } {
  const r = shape.spacing * Math.sqrt(i + 0.5)
  const a = i * GOLDEN_ANGLE
  out.x = Math.cos(a) * r * shape.sx
  out.z = Math.sin(a) * r * shape.sz
  return out
}
