import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import type { GameProps } from '../screens/GameRunner'
import { Loading } from '../components/ui'

/**
 * The four 3D mini-games, each loaded on demand (three.js and its scene code
 * stay out of the stage runner until a 3D game is actually played). Same
 * props and default exports as the game modules, so the stage runner only
 * swaps its imports:
 *
 *   import { CloudKeeper, DivisionArena, FractionForge, TimesGrove } from '../games/lazyGames'
 *
 * The single-file build inlines these chunks, so it still works offline.
 */
const DivisionArenaGame = lazy(() => import('./DivisionArena'))
const FractionForgeGame = lazy(() => import('./FractionForge'))
const CloudKeeperGame = lazy(() => import('./CloudKeeper'))
const TimesGroveGame = lazy(() => import('./TimesGrove'))

function Loader({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 grid place-items-center">
          <Loading label="Building the play area…" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export function DivisionArena(props: GameProps) {
  return (
    <Loader>
      <DivisionArenaGame {...props} />
    </Loader>
  )
}

export function FractionForge(props: GameProps) {
  return (
    <Loader>
      <FractionForgeGame {...props} />
    </Loader>
  )
}

export function CloudKeeper(props: GameProps) {
  return (
    <Loader>
      <CloudKeeperGame {...props} />
    </Loader>
  )
}

export function TimesGrove(props: GameProps) {
  return (
    <Loader>
      <TimesGroveGame {...props} />
    </Loader>
  )
}
