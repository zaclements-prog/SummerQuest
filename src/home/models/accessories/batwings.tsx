import { TCapsule, TCone } from '../../../toon/shapes'
import { Ink, Wing } from '../parts'

// Membrane panels hanging under the wing bone: [x, half-width, length]
const PANELS: [number, number, number][] = [
  [0.055, 0.06, 0.15],
  [0.125, 0.055, 0.13],
  [0.19, 0.045, 0.1],
]

/**
 * Bat wings (back slot). Authored at the `back` anchor (the spine between the
 * shoulders): a dark plum bone arm per side with a little claw at the tip and a
 * zig-zag violet membrane of three pointed panels hanging beneath it, raised
 * and swept back. They flap on the shared walk clock.
 */
export function Batwings() {
  const bone = '#4f3a6e'
  const membrane = '#9a72da'
  return (
    <group position={[0, 0.08, -0.03]} scale={1.3}>
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.05} y={0} z={0} side={s} rest={[0.1, 0.45, 0.5]} flap={0.24}>
          {PANELS.map(([x, w, len]) => (
            <TCone
              key={x}
              position={[x, -len / 2 + 0.01, 0]}
              rotation={[0, 0, Math.PI]}
              radius={w}
              height={len}
              segments={4}
              scale={[1, 1, 0.22]}
              color={membrane}
            >
              <Ink crease />
            </TCone>
          ))}
          <TCapsule radius={0.02} length={0.2} position={[0.11, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} segments={8} color={bone}>
            <Ink />
          </TCapsule>
          <TCone position={[0.225, 0.04, 0]} rotation={[0, 0, -0.5]} radius={0.018} height={0.05} segments={6} color={bone} castShadow={false} />
        </Wing>
      ))}
    </group>
  )
}
