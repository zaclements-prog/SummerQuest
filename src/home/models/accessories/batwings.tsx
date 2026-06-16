import { Wing } from '../parts'
export function Batwings() {
  const dark = '#3a2a40'
  return (
    <group>
      <Wing x={0} y={0} z={0} side={1} color={dark} w={0.36} d={0.26} flap={0.5} />
      <Wing x={0} y={0} z={0} side={-1} color={dark} w={0.36} d={0.26} flap={0.5} />
    </group>
  )
}
