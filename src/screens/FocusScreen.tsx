import { Link } from 'react-router-dom'
import { useProgress } from '../store/progress'
import { weeklyFocus, byDay } from '../lib/analytics'
import { skillMeta } from '../tutoring/skills'
import { getZone } from '../curriculum'
import BarChart from '../components/BarChart'
import { seedSampleWeek } from '../tutoring/devSeed'

export default function FocusScreen() {
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  const focus = weeklyFocus(attempts, sessions)
  const days = byDay(sessions, 7)

  return (
    <div className="flex-1 flex flex-col p-4 text-white overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto">
        <Link to="/map" className="kid-text inline-block mb-2">← Back to map</Link>
        <div className="text-center mb-4">
          <h2 className="kid-text text-4xl drop-shadow-lg">🎯 This Week's Focus</h2>
          <p className="kid-text text-white/90">Let's work on the trickiest spots from this week.</p>
        </div>

        {focus.length === 0 ? (
          <div className="bg-white/10 rounded-3xl p-8 text-center kid-text">
            <div className="text-5xl mb-2">🌱</div>
            Play some quizzes this week and your focus plan will appear here!
            {import.meta.env.DEV && (
              <div className="mt-4">
                <button onClick={() => { seedSampleWeek(); location.reload() }}
                  className="btn-quest bg-monster-500 text-white" style={{ borderColor: '#7c3aed' }}>
                  Seed sample week (dev)
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {days.length > 0 && (
              <div className="mb-5">
                <BarChart title="Questions this week"
                  bars={days.map((d) => ({ label: d.label, value: d.questions }))}
                  caption="practice over the last 7 active days" />
              </div>
            )}
            <div className="space-y-3">
              {focus.map((f) => {
                const zone = getZone(skillMeta(f.skillId).zoneId)
                return (
                  <div key={f.skillId} className="bg-white rounded-3xl p-4 text-ocean-900 flex items-center gap-3">
                    <div className="text-4xl">{zone?.emoji ?? '🎯'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="kid-text text-lg">{f.label}</div>
                      <div className="text-sm text-gray-500">{f.accuracy}% correct · {f.attempts} tries this week</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link to={`/tutor/${f.lessonId}`} className="kid-text text-center px-3 py-1.5 rounded-full bg-island-500 text-ocean-900">📚 Learn it</Link>
                      <Link to={`/play/${f.zoneId}/${f.practiceStageId}`} className="kid-text text-center px-3 py-1.5 rounded-full bg-correct-500 text-white">🎮 Practice</Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
