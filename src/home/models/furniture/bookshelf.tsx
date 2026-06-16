export function Bookshelf() {
  const frame = '#8a5a36'
  const bookColors = ['#d94f4f', '#4f8fd9', '#e0b341', '#5fb35f', '#9b5fd9', '#e07f3c', '#41c0c0']
  // two shelf rows at these y heights; books stand on each
  const rows = [0.42, 1.06]
  // book x positions across the 1.8-wide cabinet (interior ~1.6)
  const bookXs = [-0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7]
  return (
    <group>
      {/* cabinet body — w(x) 1.8 × h 1.6 × d(z) 0.4, back toward -z */}
      <mesh castShadow position={[0, 0.8, 0]}>
        <boxGeometry args={[1.8, 1.6, 0.4]} />
        <meshStandardMaterial color={frame} />
      </mesh>
      {/* horizontal shelf dividers */}
      {rows.map((y) => (
        <mesh key={`shelf-${y}`} castShadow position={[0, y - 0.12, 0.02]}>
          <boxGeometry args={[1.7, 0.05, 0.36]} />
          <meshStandardMaterial color="#6f4527" />
        </mesh>
      ))}
      {/* rows of books standing on each shelf, slightly forward (+z) */}
      {rows.map((y, r) =>
        bookXs.map((x, i) => {
          const h = 0.34 + ((i + r) % 3) * 0.06
          return (
            <mesh key={`book-${r}-${x}`} castShadow position={[x, y + h / 2 - 0.1, 0.07]}>
              <boxGeometry args={[0.16, h, 0.22]} />
              <meshStandardMaterial color={bookColors[(i + r * 2) % bookColors.length]} />
            </mesh>
          )
        }),
      )}
    </group>
  )
}
