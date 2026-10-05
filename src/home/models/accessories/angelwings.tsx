import { TSphere } from '../../../toon/shapes'
import { Ink, Wing } from '../parts'

// Scalloped feather lobes under the top of each wing: [x, y, rx, ry]
const FEATHERS: [number, number, number, number][] = [
  [0.07, -0.035, 0.055, 0.085],
  [0.145, -0.02, 0.05, 0.078],
  [0.215, 0.01, 0.042, 0.066],
]

/**
 * Angel wings (back slot). Authored at the `back` anchor (the spine between the
 * shoulders): two fluffy white wings rooted just behind the shoulders, each a
 * plump top lobe over a row of scalloped pale-lilac feathers, raised and swept
 * back. They beat softly (shared walk clock), faster while walking.
 */
export function Angelwings() {
  const white = '#ffffff'
  const soft = '#e9ecff'
  return (
    <group position={[0, 0.07, -0.03]} scale={1.3}>
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.05} y={0} z={0} side={s} rest={[0.1, 0.45, 0.42]} flap={0.16}>
          {FEATHERS.map(([x, y, rx, ry]) => (
            <TSphere key={x} position={[x, y, -0.005]} rotation={[0, 0, 0.12]} scale={[rx, ry, 0.026]} color={soft} segments={12}>
              <Ink />
            </TSphere>
          ))}
          <TSphere position={[0.14, 0.055, 0.004]} rotation={[0, 0, 0.18]} scale={[0.165, 0.085, 0.032]} color={white} segments={16}>
            <Ink />
          </TSphere>
        </Wing>
      ))}
    </group>
  )
}
