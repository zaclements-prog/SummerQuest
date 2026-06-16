export default function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff6e6', '#5a6b8c', 0.9]} />
      <directionalLight
        position={[8, 14, 6]} intensity={1.1} castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16} shadow-camera-right={16}
        shadow-camera-top={16} shadow-camera-bottom={-16}
      />
    </>
  )
}
