import { useEffect } from 'react'
import { guide } from '../../guide/store'
import { SLEEPING_LINE } from '../../lib/listenNav'
import './listen.css'

/**
 * "Still sleeping, coming soon" (K–1): a place with no K–1 games yet. Its
 * picture dozes, dimmed, under drifting z's, and the voice says "This place is
 * still sleeping. Come back soon!" (on mount, and again on 🔊).
 */
export function SleepingBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`sq-zzz pointer-events-none ${className}`} aria-hidden="true">
      <span>z</span>
      <span>z</span>
      <span>Z</span>
    </span>
  )
}

export function ListenSleeping({ emoji, size = 'md', say = true }: { emoji: string; size?: 'md' | 'lg'; say?: boolean }) {
  useEffect(() => {
    if (!say) return
    void guide.show({ voice: SLEEPING_LINE })
    return () => guide.clear({ forget: true })
  }, [say])
  const box = size === 'lg' ? 'w-40 h-40 text-[5.5rem]' : 'w-28 h-28 text-6xl'
  return (
    <div className="flex justify-center py-2" data-sleeping="">
      <div className="relative">
        <span className={`grid place-items-center rounded-full border-[3px] border-line/60 bg-cream-200 grayscale-[0.6] opacity-70 ${box}`} role="img" aria-label="Still sleeping, coming soon">
          <span aria-hidden="true">{emoji}</span>
        </span>
        <SleepingBadge className="absolute -top-4 -right-6 text-4xl" />
      </div>
    </div>
  )
}
