import { TBox, TCyl, TSphere } from '../../../toon/shapes'
import type { Vec3 } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

const S = 0.26 // block size
const FACE = S / 2

// Counting blocks: a white inset on the front face with 1–3 colored pips.
const PIPS: Record<number, [number, number][]> = {
  0: [],
  1: [[0, 0]],
  2: [
    [-0.045, 0.045],
    [0.045, -0.045],
  ],
  3: [
    [-0.05, 0.05],
    [0, 0],
    [0.05, -0.05],
  ],
}

function Block({ position, yaw, color, pips }: { position: Vec3; yaw: number; color: string; pips: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <TBox size={[S, S, S]} radius={0.035} color={color}>
        <Ol />
      </TBox>
      {pips > 0 && (
        <>
          <TBox size={[0.18, 0.18, 0.02]} radius={0.02} position={[0, 0, FACE]} color={F.white} castShadow={false} />
          {PIPS[pips].map(([x, y]) => (
            <TSphere key={`${x},${y}`} position={[x, y, FACE + 0.012]} scale={[0.024, 0.024, 0.01]} color={color} segments={8} castShadow={false} />
          ))}
        </>
      )}
    </group>
  )
}

/** Toy blocks (1×1): a little stack of chunky counting blocks topped with a roof block. */
export function Blocks() {
  return (
    <group>
      <Block position={[-0.15, FACE, -0.08]} yaw={0.1} color={F.coral} pips={1} />
      <Block position={[0.15, FACE, -0.1]} yaw={-0.2} color={F.blue} pips={0} />
      <Block position={[-0.02, FACE, 0.21]} yaw={0.35} color={F.butter} pips={2} />
      <Block position={[0, S + FACE, -0.09]} yaw={-0.12} color={F.mint} pips={3} />
      {/* triangular roof block */}
      <group position={[0, S * 2 + 0.085, -0.09]} rotation={[0, -0.12, 0]}>
        <TCyl radiusTop={0.17} height={S} segments={3} rotation={[-Math.PI / 2, 0, 0]} color={F.pink} flat>
          <Ol />
        </TCyl>
      </group>
    </group>
  )
}
