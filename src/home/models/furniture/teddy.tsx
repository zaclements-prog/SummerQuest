import { TCapsule, TCone, TSphere } from '../../../toon/shapes'
import { F } from './_palette'
import { Ol } from './_kit'

const FUR = '#cf955f'
const MUZZLE = '#f6dcb8'

/** Teddy bear (1×1): a plump caramel teddy sitting up, with a cream muzzle and a sky bow tie. */
export function Teddy() {
  return (
    <group>
      {/* legs stuck out in front, with paw pads */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <TCapsule radius={0.08} length={0.14} position={[s * 0.13, 0.085, 0.15]} rotation={[Math.PI / 2, 0, s * -0.15]} color={FUR} segments={10} />
          <TSphere position={[s * 0.14, 0.09, 0.3]} scale={[0.06, 0.06, 0.02]} color={MUZZLE} segments={10} castShadow={false} />
        </group>
      ))}
      {/* body + belly */}
      <TSphere position={[0, 0.28, -0.02]} scale={[0.24, 0.27, 0.21]} color={FUR} segments={16}>
        <Ol />
      </TSphere>
      <TSphere position={[0, 0.26, 0.12]} scale={[0.15, 0.17, 0.09]} color={MUZZLE} segments={12} castShadow={false} />
      {/* arms */}
      {[-1, 1].map((s) => (
        <TCapsule key={s} radius={0.07} length={0.16} position={[s * 0.22, 0.33, 0.07]} rotation={[0.6, 0, s * 0.55]} color={FUR} segments={10} />
      ))}
      {/* head */}
      <TSphere position={[0, 0.66, 0]} scale={[0.21, 0.19, 0.19]} color={FUR} segments={16}>
        <Ol />
      </TSphere>
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={[s * 0.15, 0.82, -0.02]} scale={[0.075, 0.075, 0.05]} color={FUR} segments={10}>
            <Ol />
          </TSphere>
          <TSphere position={[s * 0.15, 0.82, 0.02]} scale={[0.042, 0.042, 0.02]} color={MUZZLE} segments={8} castShadow={false} />
          <TSphere position={[s * 0.075, 0.71, 0.165]} scale={0.026} color={F.ink} segments={8} castShadow={false} />
          <TSphere position={[s * 0.125, 0.635, 0.15]} scale={[0.035, 0.022, 0.015]} color={F.pink} segments={8} castShadow={false} />
        </group>
      ))}
      <TSphere position={[0, 0.62, 0.165]} scale={[0.09, 0.07, 0.06]} color={MUZZLE} segments={12} castShadow={false} />
      <TSphere position={[0, 0.648, 0.222]} scale={[0.036, 0.026, 0.02]} color={F.ink} segments={8} castShadow={false} />
      {/* bow tie */}
      {[-1, 1].map((s) => (
        <TCone key={s} radius={0.055} height={0.1} position={[s * 0.05, 0.49, 0.17]} rotation={[0, 0, s * (Math.PI / 2)]} scale={[1, 1, 0.5]} color={F.sky} segments={8} castShadow={false} />
      ))}
      <TSphere position={[0, 0.49, 0.18]} scale={0.03} color={F.blue} segments={8} castShadow={false} />
    </group>
  )
}
