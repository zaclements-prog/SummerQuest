import { CylinderGeometry, TorusGeometry } from 'three'
import { TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { toonMaterial } from '../../../toon/materials'
import { Ink } from '../parts'

// The cloth: the back part of an open, flaring cylinder, so it wraps around the
// creature's back like real fabric. Built once and shared.
const WRAP = Math.PI - 0.4 // how far round the back the cloth reaches
let clothGeo: CylinderGeometry | null = null
function cloth(): CylinderGeometry {
  if (!clothGeo) clothGeo = new CylinderGeometry(0.185, 0.3, 0.42, 20, 1, true, Math.PI / 2 + 0.2, WRAP)
  return clothGeo
}
// The gold hem: the matching arc of a thin ring along the bottom edge.
let hemGeo: TorusGeometry | null = null
function hem(): TorusGeometry {
  if (!hemGeo) hemGeo = new TorusGeometry(0.3, 0.013, 6, 24, WRAP)
  return hemGeo
}

/**
 * Hero cape (back slot). Authored at the `back` anchor (the spine between the
 * shoulders, ~0.17 behind the body's centre line at scale 1): a bold red cape
 * wrapping the back from the shoulders, flaring out and swept slightly back
 * toward the floor, with a gold-trimmed hem and gold shoulder buttons.
 */
export function Cape() {
  const red = '#e8454f'
  return (
    <group position={[0, 0.0, 0.175]} rotation={[0.13, 0, 0]}>
      <mesh geometry={cloth()} material={toonMaterial(red, { doubleSide: true })} position={[0, -0.16, 0]} castShadow>
        <Ink crease />
      </mesh>
      <mesh geometry={hem()} material={toonMaterial(TOON.gold)} position={[0, -0.37, 0]} rotation={[Math.PI / 2, 0, Math.PI + 0.2]} />
      {[-1, 1].map((s) => (
        <TSphere key={s} position={[s * 0.178, 0.04, -0.048]} scale={0.026} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.35} segments={10} castShadow={false} />
      ))}
    </group>
  )
}
