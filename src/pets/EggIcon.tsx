/** A little CSS egg in a pet's egg colors, for tiles and buttons. */
export function EggIcon({ shell, spot, size = 'md' }: { shell: string; spot: string; size?: 'md' | 'sm' }) {
  return (
    <span
      className={`block border-2 border-line rounded-[50%_50%_46%_46%/60%_60%_40%_40%] ${size === 'md' ? 'w-8 h-10' : 'w-6 h-7'}`}
      style={{
        background: `radial-gradient(circle at 32% 36%, ${spot} 0 11%, transparent 12%), radial-gradient(circle at 68% 58%, ${spot} 0 10%, transparent 11%), radial-gradient(circle at 40% 78%, ${spot} 0 8%, transparent 9%), radial-gradient(circle at 35% 25%, #ffffffaa 0 9%, transparent 10%), ${shell}`,
      }}
      aria-hidden="true"
    />
  )
}
