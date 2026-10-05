import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useProgress } from './store/progress'
import { unlockAudio } from './lib/sound'
import AppShell from './components/AppShell'
import Welcome from './screens/Welcome'
import AvatarCreate from './screens/AvatarCreate'
import WorldMap from './screens/WorldMap'
import ZoneDetail from './screens/ZoneDetail'
import GameRunner from './screens/GameRunner'
import ParentDashboard from './screens/ParentDashboard'
import BadgesScreen from './screens/BadgesScreen'
import DailyChallenge from './screens/DailyChallenge'
import ProgressScreen from './screens/ProgressScreen'
import TutorIndex from './screens/TutorIndex'
import TutorScreen from './screens/TutorScreen'
import FocusScreen from './screens/FocusScreen'
const HomeScreen = lazy(() => import('./screens/HomeScreen'))
// The single-file offline build is opened straight from disk (file://), where the
// History API can't change the path — so it routes on the URL hash instead.
const Router = import.meta.env.VITE_OFFLINE === 'true' ? HashRouter : BrowserRouter
const WorldScreen = lazy(() => import('./world/WorldScreen'))

function RequireAvatar({ children }: { children: React.ReactNode }) {
  const player = useProgress((s) => s.player)
  if (!player) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const player = useProgress((s) => s.player)
  const bumpStreak = useProgress((s) => s.bumpStreakIfNeeded)

  useEffect(() => {
    const onPointer = () => unlockAudio()
    window.addEventListener('pointerdown', onPointer, { once: true })
    window.addEventListener('keydown', onPointer, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onPointer)
    }
  }, [])

  useEffect(() => {
    if (!player) return
    bumpStreak()
    // A tab left open overnight should still count today when the kid comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') bumpStreak()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [player, bumpStreak])

  return (
    <Router>
      <AppShell>
        <Routes>
          <Route
            path="/"
            element={player ? <Navigate to="/map" replace /> : <Welcome />}
          />
          <Route path="/avatar" element={<AvatarCreate />} />
          <Route
            path="/map"
            element={
              <RequireAvatar>
                <WorldMap />
              </RequireAvatar>
            }
          />
          <Route
            path="/zone/:zoneId"
            element={
              <RequireAvatar>
                <ZoneDetail />
              </RequireAvatar>
            }
          />
          <Route
            path="/play/:zoneId/:stageId"
            element={
              <RequireAvatar>
                <GameRunner />
              </RequireAvatar>
            }
          />
          <Route
            path="/badges"
            element={
              <RequireAvatar>
                <BadgesScreen />
              </RequireAvatar>
            }
          />
          <Route
            path="/daily"
            element={
              <RequireAvatar>
                <DailyChallenge />
              </RequireAvatar>
            }
          />
          <Route
            path="/progress"
            element={
              <RequireAvatar>
                <ProgressScreen />
              </RequireAvatar>
            }
          />
          <Route
            path="/tutor"
            element={
              <RequireAvatar>
                <TutorIndex />
              </RequireAvatar>
            }
          />
          <Route
            path="/tutor/:lessonId"
            element={
              <RequireAvatar>
                <TutorScreen />
              </RequireAvatar>
            }
          />
          <Route path="/focus" element={<RequireAvatar><FocusScreen /></RequireAvatar>} />
          <Route
            path="/home"
            element={
              <RequireAvatar>
                <Suspense fallback={<div className="flex-1 grid place-items-center text-white kid-text text-2xl">Loading your home…</div>}>
                  <HomeScreen />
                </Suspense>
              </RequireAvatar>
            }
          />
          <Route path="/world" element={<RequireAvatar><Suspense fallback={<div className="flex-1 grid place-items-center text-white kid-text text-2xl">Loading the world…</div>}><WorldScreen /></Suspense></RequireAvatar>} />
          <Route path="/parent" element={<ParentDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </Router>
  )
}
