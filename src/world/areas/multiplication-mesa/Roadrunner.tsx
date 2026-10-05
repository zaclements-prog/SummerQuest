import { useMemo } from 'react'
import { TOON } from '../../../toon/palette'
import { geo } from '../../../toon/geometry'
import { TBox, TCapsule, TCone, TCyl, TSphere } from '../../../toon/shapes'
import { ToonInstances, type InstanceSpec } from '../../../toon/Scatter'
import { ChibiFace } from '../fraction-falls/kit'
import { ROW_COLORS } from './colors'

const PLUME = '#8ea2ea'
const PLUME_DARK = '#5d70c8'
const BELLY = '#f6ecd6'
const BEAK = '#ffb347'

/**
 * Multiplication Mesa's guide: a chibi roadrunner with a perky crest and tall tail
 * feathers, holding open a times-table scroll printed with a 3 × 4 array of dots.
 * Stands on y = 0.22, faces +z.
 */
export default function Roadrunner() {
  const dots = useMemo(() => {
    const out: InstanceSpec[] = []
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) out.push({ x: (c - 1.5) * 0.095, y: (1 - r) * 0.085, z: 0, s: 0.03, color: ROW_COLORS[r] })
    return out
  }, [])
  return (
    <group position={[0, 0.22, 0]}>
      {/* sturdy orange legs and big feet */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.09, 0, 0]}>
          <TCapsule radius={0.04} length={0.12} position={[0, 0.12, 0]} color={BEAK} castShadow={false} />
          <TSphere position={[0, 0.025, 0.06]} scale={[0.07, 0.03, 0.1]} color={BEAK} castShadow={false} />
        </group>
      ))}

      {/* tail feathers sweeping up behind */}
      <group position={[0, 0.42, -0.2]} rotation={[0, 0, 0.75]}>
        <TCapsule radius={0.075} length={0.46} position={[0, 0.3, -0.12]} rotation={[-0.45, 0, 0]} color={PLUME_DARK} outline />
        <TCapsule radius={0.065} length={0.38} position={[0.1, 0.24, -0.1]} rotation={[-0.6, 0, -0.35]} color={PLUME} outline />
      </group>

      {/* body + cream belly */}
      <TSphere position={[0, 0.42, -0.02]} scale={[0.25, 0.27, 0.27]} color={PLUME} outline segments={16} />
      <TSphere position={[0, 0.37, 0.13]} scale={[0.17, 0.19, 0.13]} color={BELLY} castShadow={false} />

      {/* big head with crest, beak and the roadrunner's colour patch */}
      <group position={[0, 0.86, 0.03]}>
        <TSphere scale={0.28} color={PLUME} outline segments={16} />
        <TSphere position={[0, -0.07, 0.12]} scale={[0.2, 0.15, 0.17]} color={BELLY} castShadow={false} />
        {/* a perky fan of crest feathers */}
        <TCone radius={0.08} height={0.38} position={[0, 0.36, -0.06]} rotation={[-0.35, 0, 0]} color={PLUME_DARK} outline segments={6} />
        <TCone radius={0.07} height={0.3} position={[-0.09, 0.31, -0.08]} rotation={[-0.45, 0, 0.45]} color={PLUME_DARK} outline segments={6} />
        <TCone radius={0.07} height={0.3} position={[0.09, 0.31, -0.08]} rotation={[-0.45, 0, -0.45]} color={PLUME_DARK} outline segments={6} />
        <TCone radius={0.075} height={0.3} position={[0, -0.05, 0.36]} rotation={[Math.PI / 2 - 0.2, 0, 0]} color={BEAK} outline segments={8} />
        <TSphere position={[-0.2, 0.03, 0.15]} scale={[0.05, 0.035, 0.03]} rotation={[0, -0.7, 0]} color={TOON.coral} castShadow={false} segments={8} />
        <TSphere position={[0.2, 0.03, 0.15]} scale={[0.05, 0.035, 0.03]} rotation={[0, 0.7, 0]} color={TOON.coral} castShadow={false} segments={8} />
        <ChibiFace eyeY={0.05} eyeX={0.1} eyeZ={0.24} eyeR={0.048} blushY={-0.07} blushX={0.16} blushZ={0.2} blushR={0.045} />
      </group>

      {/* wings holding the scroll */}
      <TSphere position={[-0.23, 0.46, 0.1]} scale={[0.07, 0.15, 0.12]} rotation={[0.5, 0, 0.5]} color={PLUME_DARK} castShadow={false} />
      <TSphere position={[0.23, 0.46, 0.1]} scale={[0.07, 0.15, 0.12]} rotation={[0.5, 0, -0.5]} color={PLUME_DARK} castShadow={false} />

      {/* the times-table scroll: a 3 × 4 array of dots in three row colours */}
      <group position={[0, 0.47, 0.29]} rotation={[-0.25, 0, 0]}>
        <TBox size={[0.46, 0.32, 0.025]} radius={0.01} color={'#fbf2dc'} outline />
        <TCyl radiusTop={0.035} height={0.56} position={[0, 0.17, 0.01]} rotation={[0, 0, Math.PI / 2]} color={TOON.woodDark} castShadow={false} />
        <TCyl radiusTop={0.035} height={0.56} position={[0, -0.17, 0.01]} rotation={[0, 0, Math.PI / 2]} color={TOON.woodDark} castShadow={false} />
        <TSphere position={[-0.29, 0.17, 0.01]} scale={0.045} color={TOON.gold} castShadow={false} segments={6} />
        <TSphere position={[0.29, 0.17, 0.01]} scale={0.045} color={TOON.gold} castShadow={false} segments={6} />
        <group position={[0, 0, 0.02]}>
          <ToonInstances geometry={geo.sphere(6)} color={TOON.white} items={dots} castShadow={false} />
        </group>
      </group>
    </group>
  )
}
