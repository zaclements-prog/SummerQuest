import { TCyl, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { Ink } from '../parts'

/**
 * Ball cap (head slot). Authored at the `head` anchor: a soft blue dome centred
 * on the anchor (its lower half tucks into the head), a sunny yellow visor
 * poking forward over the eyes, a top button and a little white star badge.
 */
export function Cap() {
  const blue = '#4f8fe8'
  const visor = TOON.flowerYellow
  return (
    <group rotation={[-0.12, 0, 0]}>
      <TSphere position={[0, 0.005, 0]} scale={[0.212, 0.165, 0.212]} color={blue} segments={20}>
        <Ink />
      </TSphere>
      <TCyl radiusTop={0.15} radiusBottom={0.15} height={0.022} position={[0, 0.0, 0.17]} rotation={[0.18, 0, 0]} scale={[1, 1, 0.78]} segments={18} color={visor}>
        <Ink crease />
      </TCyl>
      <TSphere position={[0, 0.17, 0]} scale={[0.028, 0.018, 0.028]} color={visor} segments={8} castShadow={false} />
      {/* star badge on the front panel */}
      <TSphere position={[0, 0.075, 0.185]} rotation={[-0.45, 0, 0]} scale={[0.04, 0.04, 0.012]} color={TOON.white} segments={10} castShadow={false} />
    </group>
  )
}
