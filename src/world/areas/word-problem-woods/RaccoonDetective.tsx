import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { TBox, TCapsule, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { Eye, Parts } from './storyKit'
import type { Part } from './instancing'

const FUR = '#a7abb8'
const FUR_DARK = '#5e5a6b'
const FUR_LIGHT = '#eeeae3'
const COAT = '#c99f68'
const COAT_DARK = '#a77d4c'

// Small smooth details batched into one draw call (local coords; feet at y = 0.22).
const DETAILS: Part[] = [
  // feet
  { p: [-0.11, 0.27, 0.05], s: [0.1, 0.06, 0.13], c: FUR_DARK },
  { p: [0.11, 0.27, 0.05], s: [0.1, 0.06, 0.13], c: FUR_DARK },
  // belly patch
  { p: [0, 0.5, 0.17], s: [0.15, 0.17, 0.08], c: FUR_LIGHT },
  // muzzle + nose
  { p: [0, 0.98, 0.25], s: [0.13, 0.09, 0.1], c: FUR_LIGHT },
  { p: [0, 1.01, 0.345], s: [0.045, 0.035, 0.035], c: TOON.eye },
  // bandit mask patches round the eyes
  { p: [-0.11, 1.08, 0.235], r: [0, -0.3, 0.35], s: [0.105, 0.075, 0.06], c: FUR_DARK },
  { p: [0.11, 1.08, 0.235], r: [0, 0.3, -0.35], s: [0.105, 0.075, 0.06], c: FUR_DARK },
  // white eye rings
  { p: [-0.105, 1.085, 0.275], s: [0.058, 0.058, 0.03], c: FUR_LIGHT },
  { p: [0.105, 1.085, 0.275], s: [0.058, 0.058, 0.03], c: FUR_LIGHT },
  // blush
  { p: [-0.19, 0.97, 0.21], s: [0.05, 0.03, 0.02], c: TOON.blush },
  { p: [0.19, 0.97, 0.21], s: [0.05, 0.03, 0.02], c: TOON.blush },
  // ears (poking out of the hat)
  { p: [-0.25, 1.27, -0.02], r: [0, 0, 0.55], s: [0.08, 0.1, 0.05], c: FUR },
  { p: [0.25, 1.27, -0.02], r: [0, 0, -0.55], s: [0.08, 0.1, 0.05], c: FUR },
  // paws
  { p: [-0.3, 0.5, 0.06], s: 0.068, c: FUR_DARK },
  { p: [0.33, 0.86, 0.1], s: 0.07, c: FUR_DARK },
  // ringed tail curling up behind
  { p: [0.17, 0.38, -0.22], s: [0.11, 0.1, 0.12], c: FUR },
  { p: [0.28, 0.48, -0.3], s: [0.12, 0.11, 0.12], c: FUR_DARK },
  { p: [0.35, 0.62, -0.33], s: [0.125, 0.115, 0.12], c: FUR },
  { p: [0.37, 0.77, -0.3], s: [0.115, 0.105, 0.11], c: FUR_DARK },
  { p: [0.34, 0.9, -0.25], s: [0.09, 0.085, 0.09], c: FUR },
  // deerstalker brims + bow
  { p: [0, 1.21, 0.22], r: [0.35, 0, 0], s: [0.16, 0.03, 0.11], c: COAT_DARK },
  { p: [0, 1.21, -0.24], r: [-0.35, 0, 0], s: [0.16, 0.03, 0.11], c: COAT_DARK },
  { p: [0, 1.42, 0], s: [0.05, 0.035, 0.05], c: COAT_DARK },
]

/**
 * Detective Rascal — a chibi raccoon in a deerstalker and a little cape, holding
 * up a magnifying glass to inspect the woods' word problems. Feet at y = 0.22,
 * facing +z; Npc bobs it.
 */
export default function RaccoonDetective() {
  return (
    <group>
      <Parts geometry={geo.sphere(10)} items={DETAILS} castShadow={false} />
      {/* body + cape */}
      <TCapsule radius={0.22} length={0.1} position={[0, 0.52, 0]} color={FUR} outline />
      <TCyl radiusTop={0.16} radiusBottom={0.31} height={0.26} position={[0, 0.66, 0]} color={COAT} outline segments={12} />
      <TSphere position={[0, 0.79, 0.15]} scale={0.035} color={TOON.gold} castShadow={false} />
      {/* head */}
      <TSphere position={[0, 1.04, 0]} scale={[0.31, 0.28, 0.28]} color={FUR} outline segments={16} />
      <Eye position={[-0.105, 1.085, 0.3]} size={0.042} />
      <Eye position={[0.105, 1.085, 0.3]} size={0.042} />
      {/* deerstalker cap */}
      <TSphere position={[0, 1.2, -0.01]} scale={[0.27, 0.17, 0.27]} color={COAT} outline segments={14} />
      {/* arms: left hangs, right holds the magnifier up */}
      <TCapsule radius={0.065} length={0.14} position={[-0.27, 0.6, 0.04]} rotation={[0, 0, 0.45]} color={FUR} />
      <TCapsule radius={0.065} length={0.16} position={[0.27, 0.72, 0.07]} rotation={[0.2, 0, -0.75]} color={FUR} />
      {/* magnifying glass */}
      <group position={[0.36, 0.9, 0.12]} rotation={[0.25, 0, -0.35]}>
        <TCyl radiusTop={0.03} radiusBottom={0.035} height={0.24} position={[0, 0.1, 0]} color={TOON.woodDark} castShadow={false} />
        <TBox size={[0.07, 0.05, 0.07]} radius={0.015} position={[0, 0.23, 0]} color={TOON.gold} castShadow={false} />
        <TTorus radius={0.14} tube={0.03} position={[0, 0.39, 0]} color={TOON.gold} segments={18} outline outlineThickness={1.6} />
        <TCyl radiusTop={0.125} height={0.02} position={[0, 0.39, 0]} rotation={[Math.PI / 2, 0, 0]} color="#d8f3ff" opacity={0.55} emissive="#bfeaff" emissiveIntensity={0.35} castShadow={false} segments={16} />
      </group>
    </group>
  )
}
