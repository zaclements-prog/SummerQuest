export function Bookshelf() {
  const frame = '#8a5a36'
  const back = '#6f4527'
  const bookColors = ['#d94f4f', '#4f8fd9', '#e0b341', '#5fb35f', '#9b5fd9', '#e07f3c', '#41c0c0']
  const bookXs = [-0.66, -0.48, -0.3, -0.12, 0.06, 0.24, 0.42, 0.6]
  // top-of-board y for each open shelf where books stand
  const shelves = [0.12, 0.6, 1.08]
  return (
    <group>
      {/* back panel — open front (+z) so the books show */}
      <mesh castShadow position={[0, 0.82, -0.17]}>
        <boxGeometry args={[1.8, 1.64, 0.06]} />
        <meshStandardMaterial color={back} />
      </mesh>
      {/* side panels */}
      {[-0.87, 0.87].map((x) => (
        <mesh key={`side${x}`} castShadow position={[x, 0.82, 0]}>
          <boxGeometry args={[0.07, 1.64, 0.4]} />
          <meshStandardMaterial color={frame} />
        </mesh>
      ))}
      {/* bottom, two shelf dividers, top */}
      {[0.06, 0.56, 1.04, 1.58].map((y) => (
        <mesh key={`board${y}`} castShadow position={[0, y, 0]}>
          <boxGeometry args={[1.74, 0.07, 0.4]} />
          <meshStandardMaterial color={frame} />
        </mesh>
      ))}
      {/* colorful books standing in the open compartments */}
      {shelves.map((sy, r) =>
        bookXs.map((x, i) => {
          const h = 0.34 + ((i + r) % 3) * 0.06
          return (
            <mesh key={`book-${r}-${i}`} castShadow position={[x, sy + h / 2, 0]}>
              <boxGeometry args={[0.15, h, 0.24]} />
              <meshStandardMaterial color={bookColors[(i + r * 2) % bookColors.length]} />
            </mesh>
          )
        }),
      )}
    </group>
  )
}
