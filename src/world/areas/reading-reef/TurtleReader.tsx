import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { toonMaterial } from '../../../toon/materials'
import { TBox, TCapsule, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { Eye, Parts } from '../word-problem-woods/storyKit'
import type { Part } from '../word-problem-woods/instancing'
import { smileGeometry } from '../word-problem-woods/storyGeometry'

const SKIN = '#9edb9a'
const SKIN_DARK = '#79c47f'
const SHELL = '#4fa889'
const SHELL_PLATE = '#7fcfa6'
const SHELL_RIM = '#f1d98f'
const BELLY = '#f6e7b0'
const FRAME = '#6b4a8a'

// Small details in one draw call (local coords; feet at y = 0.22).
const DETAILS: Part[] = [
  // stubby feet
  { p: [-0.12, 0.27, 0.05], s: [0.11, 0.065, 0.13], c: SKIN },
  { p: [0.12, 0.27, 0.05], s: [0.11, 0.065, 0.13], c: SKIN },
  // shell plates on the back dome
  { p: [0, 0.74, -0.27], r: [-0.5, 0, 0], s: [0.1, 0.09, 0.04], c: SHELL_PLATE },
  { p: [-0.16, 0.58, -0.25], r: [-0.2, -0.5, 0], s: [0.09, 0.08, 0.04], c: SHELL_PLATE },
  { p: [0.16, 0.58, -0.25], r: [-0.2, 0.5, 0], s: [0.09, 0.08, 0.04], c: SHELL_PLATE },
  { p: [0, 0.48, -0.3], r: [0.1, 0, 0], s: [0.1, 0.08, 0.04], c: SHELL_PLATE },
  // belly plate lines
  { p: [0, 0.6, 0.2], s: [0.14, 0.012, 0.03], c: '#e2cf8c' },
  { p: [0, 0.48, 0.21], s: [0.15, 0.012, 0.03], c: '#e2cf8c' },
  // cheeks, nostrils, freckles
  { p: [-0.17, 0.95, 0.222], r: [0, -0.6, 0], s: [0.05, 0.03, 0.02], c: TOON.blush },
  { p: [0.17, 0.95, 0.222], r: [0, 0.6, 0], s: [0.05, 0.03, 0.02], c: TOON.blush },
  { p: [-0.03, 1.0, 0.285], s: 0.012, c: TOON.eye },
  { p: [0.03, 1.0, 0.285], s: 0.012, c: TOON.eye },
  { p: [-0.12, 1.2, 0.175], r: [-0.8, -0.4, 0], s: [0.035, 0.035, 0.02], c: SKIN_DARK },
  { p: [0.08, 1.235, 0.15], r: [-0.95, 0.3, 0], s: [0.03, 0.03, 0.02], c: SKIN_DARK },
  // little tail
  { p: [0, 0.3, -0.24], s: [0.05, 0.04, 0.07], c: SKIN },
]

/**
 * Professor Paddle — a chibi sea turtle in tiny round reading glasses, nose in
 * an open storybook. Feet at y = 0.22, facing +z; Npc bobs it.
 */
export default function TurtleReader() {
  return (
    <group>
      <Parts geometry={geo.sphere(10)} items={DETAILS} castShadow={false} />
      {/* shell dome on the back, a sunny rim, and the cream belly plate in front */}
      <TSphere position={[0, 0.58, -0.08]} scale={[0.29, 0.31, 0.24]} color={SHELL} outline segments={14} />
      <TTorus radius={0.25} tube={0.045} position={[0, 0.56, 0.0]} rotation={[0, 0, 0]} scale={[1, 1.18, 1]} color={SHELL_RIM} segments={18} castShadow={false} />
      <TCapsule radius={0.2} length={0.14} position={[0, 0.54, 0.04]} color={BELLY} outline />
      {/* head */}
      <TSphere position={[0, 1.02, 0.04]} scale={[0.28, 0.25, 0.25]} color={SKIN} outline segments={16} />
      <Eye position={[-0.1, 1.06, 0.27]} size={0.044} />
      <Eye position={[0.1, 1.06, 0.27]} size={0.044} />
      <mesh geometry={smileGeometry()} material={toonMaterial(TOON.outline)} position={[0, 0.955, 0.288]} scale={[0.05, 0.04, 0.05]} />
      {/* tiny round reading glasses */}
      <TTorus radius={0.058} tube={0.012} position={[-0.1, 1.055, 0.29]} color={FRAME} castShadow={false} segments={14} />
      <TTorus radius={0.058} tube={0.012} position={[0.1, 1.055, 0.29]} color={FRAME} castShadow={false} segments={14} />
      <TCyl radiusTop={0.01} height={0.08} position={[0, 1.065, 0.295]} rotation={[0, 0, Math.PI / 2]} color={FRAME} castShadow={false} segments={4} />
      {/* flippers holding the book up */}
      <TCapsule radius={0.06} length={0.16} position={[-0.21, 0.66, 0.15]} rotation={[1.1, 0, -0.55]} scale={[1, 1, 0.7]} color={SKIN} />
      <TCapsule radius={0.06} length={0.16} position={[0.21, 0.66, 0.15]} rotation={[1.1, 0, 0.55]} scale={[1, 1, 0.7]} color={SKIN} />
      {/* the open storybook: covers out (toward you), pages toward the reader */}
      <group position={[0, 0.72, 0.3]} rotation={[-0.35, 0, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} rotation={[0, side * 0.42, 0]}>
            <TBox size={[0.24, 0.32, 0.025]} radius={0.01} position={[side * 0.125, 0, 0]} color={TOON.coral} outline outlineThickness={1.6} />
            <TBox size={[0.21, 0.28, 0.03]} radius={0.01} position={[side * 0.115, 0, -0.025]} color={TOON.flowerWhite} castShadow={false} />
          </group>
        ))}
        <TSphere position={[0.125, 0.02, 0.025]} scale={[0.045, 0.045, 0.012]} color={TOON.flowerYellow} castShadow={false} segments={8} />
        <TBox size={[0.04, 0.32, 0.04]} radius={0.015} position={[0, 0, 0.005]} color="#e98668" castShadow={false} />
      </group>
    </group>
  )
}
