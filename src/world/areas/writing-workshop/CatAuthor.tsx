import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { TBlob, TBox, TCapsule, TCone, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { Eye, Parts } from '../word-problem-woods/storyKit'
import type { Part } from '../word-problem-woods/instancing'

const FUR = '#f8c58f'
const STRIPE = '#e59a58'
const CREAM = '#fff4e6'
const BERET = '#e4606f'
const SCARF = TOON.roofTeal
const SCARF_STRIPE = TOON.flowerYellow

// Small smooth details in one draw call (local coords; feet at y = 0.22).
const DETAILS: Part[] = [
  // white sock paws
  { p: [-0.11, 0.27, 0.05], s: [0.1, 0.065, 0.13], c: CREAM },
  { p: [0.11, 0.27, 0.05], s: [0.1, 0.065, 0.13], c: CREAM },
  // belly
  { p: [0, 0.49, 0.17], s: [0.14, 0.16, 0.08], c: CREAM },
  // muzzle puffs, pink nose, blush
  { p: [-0.05, 0.955, 0.245], s: [0.065, 0.05, 0.05], c: CREAM },
  { p: [0.05, 0.955, 0.245], s: [0.065, 0.05, 0.05], c: CREAM },
  { p: [0, 0.995, 0.285], s: [0.036, 0.026, 0.026], c: TOON.flowerPink },
  { p: [-0.18, 0.97, 0.2], s: [0.05, 0.03, 0.02], c: TOON.blush },
  { p: [0.18, 0.97, 0.2], s: [0.05, 0.03, 0.02], c: TOON.blush },
  // tabby stripes on the forehead
  { p: [0, 1.2, 0.2], r: [0.6, 0, 0], s: [0.025, 0.06, 0.02], c: STRIPE },
  { p: [-0.07, 1.19, 0.2], r: [0.6, 0, 0.3], s: [0.022, 0.05, 0.02], c: STRIPE },
  { p: [0.07, 1.19, 0.2], r: [0.6, 0, -0.3], s: [0.022, 0.05, 0.02], c: STRIPE },
  // paws holding things
  { p: [-0.2, 0.6, 0.2], s: 0.065, c: CREAM },
  { p: [0.31, 0.82, 0.12], s: 0.066, c: CREAM },
  // curly tail, ending in a striped tip
  { p: [-0.16, 0.36, -0.2], s: [0.075, 0.075, 0.09], c: FUR },
  { p: [-0.27, 0.46, -0.26], s: 0.075, c: FUR },
  { p: [-0.33, 0.6, -0.27], s: 0.072, c: STRIPE },
  { p: [-0.31, 0.74, -0.24], s: 0.07, c: FUR },
  { p: [-0.23, 0.82, -0.2], s: 0.066, c: STRIPE },
  // beret stalk
  { p: [0.06, 1.39, -0.02], s: [0.03, 0.045, 0.03], c: BERET },
]

/** Whiskers: thin dark strokes either side of the muzzle. */
const WHISKERS: Part[] = [-1, 1].flatMap((side) => [
  { p: [side * 0.18, 0.975, 0.22], r: [0, side * -0.35, Math.PI / 2 + side * 0.12], s: [1, 1, 1] },
  { p: [side * 0.18, 0.945, 0.22], r: [0, side * -0.35, Math.PI / 2 - side * 0.1], s: [1, 1, 1] },
])

/**
 * Penelope Paws — a chibi tabby cat author in a jaunty red beret and a striped
 * scarf, notebook in one paw and a big quill in the other. Feet at y = 0.22,
 * facing +z; Npc bobs it.
 */
export default function CatAuthor() {
  return (
    <group>
      <Parts geometry={geo.sphere(10)} items={DETAILS} castShadow={false} />
      <Parts geometry={geo.cyl(0.006, 0.006, 0.17, 4)} items={WHISKERS} color={TOON.outline} castShadow={false} />
      {/* body */}
      <TCapsule radius={0.21} length={0.12} position={[0, 0.52, 0]} color={FUR} outline />
      {/* striped scarf: a ring round the neck and a tail hanging down the front */}
      <TTorus radius={0.16} tube={0.065} position={[0, 0.77, 0]} rotation={[Math.PI / 2, 0, 0]} color={SCARF} segments={16} outline outlineThickness={1.8} />
      <TBox size={[0.11, 0.3, 0.06]} radius={0.025} position={[0.1, 0.62, 0.2]} rotation={[0.25, 0, 0.12]} color={SCARF} castShadow={false} />
      <TBox size={[0.115, 0.05, 0.065]} radius={0.015} position={[0.112, 0.55, 0.218]} rotation={[0.25, 0, 0.12]} color={SCARF_STRIPE} castShadow={false} />
      {/* head */}
      <TSphere position={[0, 1.03, 0]} scale={[0.3, 0.27, 0.27]} color={FUR} outline segments={16} />
      <Eye position={[-0.1, 1.07, 0.245]} size={0.046} />
      <Eye position={[0.1, 1.07, 0.245]} size={0.046} />
      {/* ears with pink insides */}
      <TCone radius={0.1} height={0.19} position={[-0.17, 1.28, -0.02]} rotation={[0, 0, 0.32]} color={FUR} outline outlineThickness={1.8} segments={6} />
      <TCone radius={0.055} height={0.11} position={[-0.165, 1.27, 0.03]} rotation={[0, 0, 0.32]} color={TOON.flowerPink} castShadow={false} segments={6} />
      <TCone radius={0.1} height={0.19} position={[0.17, 1.28, -0.02]} rotation={[0, 0, -0.32]} color={FUR} outline outlineThickness={1.8} segments={6} />
      <TCone radius={0.055} height={0.11} position={[0.165, 1.27, 0.03]} rotation={[0, 0, -0.32]} color={TOON.flowerPink} castShadow={false} segments={6} />
      {/* jaunty beret, tipped to one side */}
      <TSphere position={[0.05, 1.29, -0.03]} rotation={[0.1, 0, -0.28]} scale={[0.25, 0.075, 0.25]} color={BERET} outline segments={14} />
      {/* arms */}
      <TCapsule radius={0.062} length={0.13} position={[-0.21, 0.63, 0.1]} rotation={[0.9, 0, -0.5]} color={FUR} />
      <TCapsule radius={0.062} length={0.15} position={[0.26, 0.72, 0.07]} rotation={[0.25, 0, -0.65]} color={FUR} />
      {/* notebook hugged to the chest */}
      <TBox size={[0.24, 0.3, 0.06]} radius={0.02} position={[-0.1, 0.56, 0.235]} rotation={[-0.15, 0.25, 0.15]} color={TOON.roofPlum} castShadow={false} />
      {/* the quill: a big lilac-tipped feather with a gold nib */}
      <group position={[0.33, 0.8, 0.13]} rotation={[0.15, 0, -0.32]}>
        <TCone radius={0.022} height={0.08} position={[0, -0.07, 0]} rotation={[Math.PI, 0, 0]} color={TOON.gold} castShadow={false} segments={6} />
        <TCyl radiusTop={0.012} radiusBottom={0.016} height={0.5} position={[0, 0.2, 0]} color={TOON.flowerWhite} castShadow={false} segments={5} />
        <TBlob position={[0.045, 0.32, 0]} rotation={[0, 0, -0.08]} scale={[0.07, 0.24, 0.03]} color={TOON.flowerWhite} detail={1} flat={false} outline outlineThickness={1.6} />
        <TBlob position={[0.06, 0.47, 0]} rotation={[0, 0, -0.12]} scale={[0.06, 0.1, 0.032]} color={TOON.lilac} detail={1} flat={false} castShadow={false} />
      </group>
    </group>
  )
}
