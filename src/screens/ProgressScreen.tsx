import { Link } from 'react-router-dom'
import { useProgress } from '../store/progress'
import type { SessionRecord } from '../store/progress'
import { overall, byDay, bySubject, recentAccuracy } from '../lib/analytics'
import BarChart from '../components/BarChart'

export default function ProgressScreen() {
  const sessions = useProgress((s) => s.sessions)

  const o = overall(sessions)
  const recent = recentAccuracy(sessions, 8)
  const days = byDay(sessions, 7)
  const subjects = bySubject(sessions)
  const log = [...sessions].reverse().slice(0, 40)

  return (
    <div className="flex-1 flex flex-col p-4 text-white overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto">
        <Link to="/map" className="kid-text inline-block mb-3">
          ← Back to map
        </Link>

        <div className="text-center mb-5">
          <h2 className="kid-text text-4xl drop-shadow-lg">📈 My Progress</h2>
          <p className="kid-text text-lg text-white/90">
            See how you're doing — and how you grow over time
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white/10 rounded-3xl p-8 text-center kid-text">
            <div className="text-5xl mb-2">🌱</div>
            Play a few quizzes and your progress will grow here!
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <SummaryCard label="Quizzes" value={o.sessions} />
              <SummaryCard label="Questions" value={o.total} />
              <SummaryCard label="Accuracy" value={`${o.accuracy}%`} />
              <SummaryCard label="Stars" value={`${o.stars} ⭐`} />
            </div>

            {/* ---- Trend analysis ---- */}
            <h3 className="kid-text text-2xl mb-2">📊 Trends</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-7">
              <ChartCard subtitle="Your last few quizzes — are you climbing?">
                <BarChart
                  title="Recent Quiz Accuracy"
                  bars={recent.map((r) => ({ label: '', value: r.accuracy, emoji: r.emoji }))}
                  maxValue={100}
                  formatValue={(v) => `${v}%`}
                  caption="each bar = one quiz (newest on the right)"
                />
              </ChartCard>

              <ChartCard subtitle="How much you practiced each day.">
                <BarChart
                  title="Questions Per Day"
                  bars={days.map((d) => ({ label: d.label, value: d.questions }))}
                  caption="last 7 active days"
                />
              </ChartCard>

              <ChartCard subtitle="Where you're strongest — and what to practice." wide>
                <BarChart
                  title="Accuracy by Subject"
                  bars={subjects.map((s) => ({ label: '', value: s.accuracy, emoji: s.zoneEmoji }))}
                  maxValue={100}
                  formatValue={(v) => `${v}%`}
                  caption="percent correct in each zone you've played"
                />
              </ChartCard>
            </div>

            {/* ---- Per-session review ---- */}
            <h3 className="kid-text text-2xl mb-2">🗒️ Sessions</h3>
            <div className="bg-white rounded-3xl overflow-hidden text-ocean-900 mb-4">
              {log.map((s, i) => (
                <SessionRow key={s.id} session={s} striped={i % 2 === 1} />
              ))}
            </div>
            {sessions.length > log.length && (
              <p className="text-center text-white/70 text-sm kid-text">
                Showing your {log.length} most recent quizzes.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white/15 rounded-2xl p-3 text-center">
      <div className="kid-text text-2xl">{value}</div>
      <div className="text-[11px] text-white/80 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function ChartCard({
  subtitle,
  wide,
  children,
}: {
  subtitle: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      {children}
      <p className="text-xs text-white/70 text-center mt-1 kid-text">{subtitle}</p>
    </div>
  )
}

function SessionRow({ session, striped }: { session: SessionRecord; striped: boolean }) {
  const d = new Date(session.at)
  const when = `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString(
    [],
    { hour: 'numeric', minute: '2-digit' },
  )}`
  const accuracy = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${striped ? 'bg-ocean-50' : ''}`}>
      <div className="text-2xl flex-shrink-0">{session.zoneEmoji}</div>
      <div className="min-w-0 flex-1">
        <div className="kid-text text-sm truncate">
          {session.zoneTitle}
          {session.kind === 'daily' && (
            <span className="ml-1 text-quest-600">🌟</span>
          )}
        </div>
        <div className="text-xs text-gray-500 truncate">{when}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="kid-text text-sm">
          {session.correct}/{session.total}{' '}
          <span className={accuracy >= 80 ? 'text-correct-600' : 'text-gray-500'}>
            ({accuracy}%)
          </span>
        </div>
        <div className="text-xs">{'⭐'.repeat(session.stars) || '—'}</div>
      </div>
    </div>
  )
}
