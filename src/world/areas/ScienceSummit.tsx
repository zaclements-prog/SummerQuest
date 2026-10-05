import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import Npc from '../Npc'
import { areaById, npcPosition } from '../worldLayout'
import { TOON } from '../../toon/palette'
import { TCyl } from '../../toon/shapes'
import { Lamp, Rock, Signpost, Tree } from '../../toon/props'
import Penguin from './science-summit/Penguin'
import { LabBench, Observatory, Peak, Rocket } from './science-summit/SummitProps'
import { SUMMIT } from './colliders/science-summit'

/**
 * Science Summit: a snow-capped faceted mountain rising from the north cliffs,
 * a little blue-domed observatory on a rocky ledge, a bubbling lab bench with an
 * atom spinning above it, and a toy rocket on its pad. Professor Pebble the
 * penguin (lab coat, goggles, glowing flask) waits on the stage.
 */
export default function ScienceSummit({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('science-summit')!
  const npc = npcPosition(a)!
  const { ledge, lab, rocket } = SUMMIT
  return (
    <group>
      {/* the mountain: one tall peak flanked by two shoulders */}
      {SUMMIT.peaks.map((p, i) => (
        <Peak
          key={i}
          position={[p.at[0], p.baseY + p.height / 2, p.at[1]]}
          radius={p.radius}
          height={p.height}
          rot={p.rot}
          color={i === 0 ? '#b8bbd4' : '#a7abc8'}
          snow={i === 0 ? 0.34 : 0.3}
          jagged={i === 0 ? 0.42 : 0.35}
        />
      ))}

      {/* rocky ledge with the observatory */}
      <group position={[ledge.at[0], 0, ledge.at[1]]}>
        <TCyl radiusTop={ledge.r - 0.25} radiusBottom={ledge.r + 0.2} height={ledge.top + 1} position={[0, (ledge.top - 1) / 2, 0]} color={TOON.rock} segments={7} flat outline receiveShadow />
        <TCyl radiusTop={ledge.r - 0.2} radiusBottom={ledge.r - 0.1} height={0.26} position={[0, ledge.top + 0.08, 0]} rotation={[0, 0.4, 0]} color={TOON.snow} segments={7} flat outline receiveShadow />
        <Observatory position={[0.1, ledge.top + 0.2, 0.1]} rotation={-0.35} />
      </group>

      <LabBench position={[lab.at[0], 0, lab.at[1]]} rotation={lab.rot} />
      <Rocket position={[rocket.at[0], 0, rocket.at[1]]} rotation={0.6} />

      {/* pines and boulders at the mountain's foot */}
      {SUMMIT.pines.map(([x, z], i) => (
        <Tree key={i} variant="pine" position={[x, 0, z]} scale={0.95 + i * 0.12} seed={20 + i} />
      ))}
      {SUMMIT.rocks.map(([x, z, s], i) => (
        <Rock key={i} position={[x, 0, z]} scale={s} seed={31 + i} color={i ? TOON.rock : TOON.rockLight} />
      ))}

      <Signpost position={[SUMMIT.sign[0], 0, SUMMIT.sign[1]]} rotation={Math.PI / 4} color={TOON.roofBlue} />
      <Lamp position={[SUMMIT.lamp[0], 0, SUMMIT.lamp[1]]} />

      <Npc areaId={a.id} zoneId={a.zoneId} hub={a.hub} label={a.label} position={[npc[0], 0, npc[1]]} posRef={posRef} facing={0.2}>
        <Penguin />
      </Npc>
    </group>
  )
}
