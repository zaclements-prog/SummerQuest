import { TOON } from '../../../toon/palette'
import { TBox, TCapsule, TCyl, TSphere, TTorus } from '../../../toon/shapes'
import { ChibiFace, PieDisc } from './kit'

const FUR = '#bf8656'
const FUR_DARK = '#8a5a39'
const TAIL = '#6b4a36'
const CREAM = '#f3d6a8'

/**
 * Fraction Falls' guide: a chubby beaver holding up a pie-chart lollipop sign
 * (three quarters filled, one quarter left plain). Stands on y = 0.22, faces +z.
 */
export default function Beaver() {
  return (
    <group position={[0, 0.22, 0]}>
      {/* flat paddle tail, peeking out behind */}
      <TBox size={[0.34, 0.07, 0.48]} radius={0.03} position={[0, 0.08, -0.36]} rotation={[-0.35, 0, 0]} color={TAIL} outline />

      {/* feet */}
      <TSphere position={[-0.13, 0.05, 0.07]} scale={[0.1, 0.06, 0.13]} color={FUR_DARK} castShadow={false} />
      <TSphere position={[0.13, 0.05, 0.07]} scale={[0.1, 0.06, 0.13]} color={FUR_DARK} castShadow={false} />

      {/* round body + cream belly */}
      <TCapsule radius={0.27} length={0.14} position={[0, 0.36, 0]} color={FUR} outline />
      <TSphere position={[0, 0.33, 0.16]} scale={[0.19, 0.22, 0.13]} color={CREAM} castShadow={false} />

      {/* left arm resting on the belly, right arm holding the sign */}
      <TCapsule radius={0.07} length={0.12} position={[-0.2, 0.42, 0.17]} rotation={[0.9, 0, -0.5]} color={FUR} outline />
      <TCapsule radius={0.07} length={0.14} position={[0.27, 0.5, 0.12]} rotation={[0.5, 0, -0.9]} color={FUR} outline />

      {/* big head */}
      <TSphere position={[0, 0.86, 0.02]} scale={0.31} color={FUR} outline segments={16} />
      <TSphere position={[-0.22, 1.1, -0.03]} scale={0.08} color={FUR_DARK} outline />
      <TSphere position={[0.22, 1.1, -0.03]} scale={0.08} color={FUR_DARK} outline />
      <TSphere position={[0, 0.77, 0.25]} scale={[0.17, 0.12, 0.12]} color={CREAM} castShadow={false} />
      <TSphere position={[0, 0.83, 0.36]} scale={[0.065, 0.05, 0.045]} color={'#4a2f25'} castShadow={false} />
      <TBox size={[0.11, 0.09, 0.035]} radius={0.012} position={[0, 0.685, 0.33]} color={TOON.white} castShadow={false} />
      <ChibiFace eyeY={0.93} eyeX={0.12} eyeZ={0.27} eyeR={0.05} blushY={0.81} blushX={0.205} blushZ={0.22} />

      {/* the pie-chart lollipop sign */}
      <group position={[0.36, 0, 0.16]}>
        <TCyl radiusTop={0.028} height={0.78} position={[0, 0.72, 0]} color={TOON.woodDark} />
        <group position={[0, 1.18, 0.02]}>
          <TCyl radiusTop={0.26} height={0.07} rotation={[Math.PI / 2, 0, 0]} color={'#e9b46c'} outline segments={20} />
          <TTorus radius={0.25} tube={0.035} segments={20} position={[0, 0, 0.035]} color={'#d39550'} castShadow={false} />
          <PieDisc parts={4} radius={0.2} height={0.05} gap={0.025} colors={['#f0645c', '#f0645c', '#f0645c', TOON.wallCream]} position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      </group>
    </group>
  )
}
