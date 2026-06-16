import { Wing } from '../parts'
export function Angelwings() {
  return (
    <group>
      <Wing x={0} y={0} z={0} side={1} color="#ffffff" w={0.34} d={0.3} flap={0.4} />
      <Wing x={0} y={0} z={0} side={-1} color="#ffffff" w={0.34} d={0.3} flap={0.4} />
    </group>
  )
}
