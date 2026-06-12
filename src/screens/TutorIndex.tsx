import { Link } from 'react-router-dom'
import { allLessons } from '../tutoring/lessons'
import { useProgress } from '../store/progress'
import { weeklyFocus } from '../lib/analytics'

export default function TutorIndex() {
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  const recommended = new Set(weeklyFocus(attempts, sessions).map((f) => f.lessonId))

  return (
    <div className="flex-1 flex flex-col p-4 text-white">
      <div className="max-w-3xl w-full mx-auto">
        <Link to="/map" className="kid-text inline-block mb-2">← Back to map</Link>
        <div className="text-center mb-4">
          <h2 className="kid-text text-4xl drop-shadow-lg">📚 Tutor</h2>
          <p className="kid-text text-white/90">Pick a topic to learn — listen and watch!</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {allLessons.map((l) => (
            <Link key={l.id} to={`/tutor/${l.id}`}
              className="bg-white/10 rounded-3xl p-4 flex items-center gap-3 hover:bg-white/20 transition">
              <div className="text-4xl">{l.emoji}</div>
              <div className="min-w-0">
                <div className="kid-text text-xl flex items-center gap-2">
                  {l.title}
                  {recommended.has(l.id) && (
                    <span className="text-xs bg-quest-500 text-quest-900 px-2 py-0.5 rounded-full">Recommended</span>
                  )}
                </div>
                <div className="text-white/70 text-sm truncate">{l.intro}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
