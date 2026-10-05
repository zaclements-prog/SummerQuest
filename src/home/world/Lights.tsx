import { toonMaterial } from '../../toon/materials'

/**
 * Toon lighting for the Home room: a warm hemisphere fill (sunny ceiling, honey
 * floor bounce), a little ambient so shadow bands stay soft, and one warm key
 * light from the open (+x, +z) side that casts soft shadows onto the floor and
 * the two back walls. Matches the World's sun so furniture reads the same in
 * both places.
 */
export default function Lights({ extent = 9 }: { extent?: number }) {
  return (
    <>
      <hemisphereLight args={['#fff6e8', '#e6c9a4', 1.05]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[7, 13, 9]}
        intensity={1.55}
        color="#fff1da"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        shadow-radius={3}
      />
    </>
  )
}

/**
 * Lights + a soft round floor for the ModelStudio galleries (/home?studio=…),
 * so models are judged under the same toon light as the room.
 */
export function StudioStage({ size = 40 }: { size?: number }) {
  return (
    <>
      <Lights extent={size * 0.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={toonMaterial('#f6ead8')} receiveShadow>
        <circleGeometry args={[size / 2, 48]} />
      </mesh>
    </>
  )
}
