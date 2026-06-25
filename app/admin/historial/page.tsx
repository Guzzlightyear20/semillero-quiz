'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getGameHistory } from '@/lib/rooms'
import Link from 'next/link'

interface HistoryEntry {
  id: string
  quizTitle: string
  date: number
  playerCount: number
  players: { name: string; emoji: string; team?: string; score: number; position: number }[]
}

export default function HistorialPage() {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const s = localStorage.getItem('teacher_session')
    if (!s) { router.push('/admin'); return }
    const { id } = JSON.parse(s)
    getGameHistory(id).then(h => {
      setHistory(h as HistoryEntry[])
      setLoading(false)
    })
  }, [router])

  function downloadCSV(entry: HistoryEntry) {
    const rows = [
      ['Posición', 'Nombre', 'Emoji', 'Equipo', 'Puntaje'],
      ...entry.players.map(p => [p.position, p.name, p.emoji, p.team ?? '-', p.score]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entry.quizTitle.replace(/\s+/g, '_')}_${new Date(entry.date).toLocaleDateString('es-AR').replace(/\//g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="sq-admin-layout">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--sq-muted)', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Mis partidas</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Historial</h1>
        </div>
        <Link href="/admin" style={{ background: 'var(--sq-subtle)', border: '0.5px solid var(--sq-border)', color: 'var(--sq-muted)', fontSize: 13, padding: '8px 14px', borderRadius: 10, textDecoration: 'none' }}>
          ← Volver
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--sq-muted)', textAlign: 'center', padding: '40px 0' }}>Cargando...</p>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--sq-muted)' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📜</p>
          <p>Todavía no jugaste ninguna partida.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map(entry => (
            <div key={entry.id} className="sq-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.quizTitle}
                  </p>
                  <p style={{ color: 'var(--sq-muted)', fontSize: 12, margin: 0 }}>
                    {new Date(entry.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {' · '}{entry.playerCount} jugadores
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); downloadCSV(entry) }}
                    style={{ background: 'rgba(62,207,163,.15)', border: '0.5px solid rgba(62,207,163,.4)', color: 'var(--sq-green)', fontWeight: 600, fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    📥 CSV
                  </button>
                  <span style={{ color: 'var(--sq-muted)', fontSize: 12 }}>{expanded === entry.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Detalle expandible */}
              {expanded === entry.id && (
                <div style={{ borderTop: '0.5px solid var(--sq-border)', padding: '12px 18px' }}>
                  {/* Top 3 podio */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
                    {entry.players.slice(0, 3).map((p, i) => {
                      const medals = ['🥇', '🥈', '🥉']
                      const colors = ['#F59E0B', '#9CA3AF', '#EA580C']
                      return (
                        <div key={i} style={{ textAlign: 'center', background: `${colors[i]}18`, border: `1px solid ${colors[i]}44`, borderRadius: 12, padding: '10px 14px', minWidth: 80 }}>
                          <p style={{ fontSize: 20, margin: '0 0 4px' }}>{medals[i]}</p>
                          <p style={{ fontSize: 14 }}>{p.emoji}</p>
                          <p style={{ fontWeight: 700, fontSize: 12, margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{p.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--sq-muted)', margin: 0 }}>{p.score} pts</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Lista completa */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                    {entry.players.map(p => (
                      <div key={p.position} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <span style={{ color: 'var(--sq-muted)', width: 20, textAlign: 'right', flexShrink: 0 }}>#{p.position}</span>
                        <span>{p.emoji}</span>
                        <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
                        {p.team && <span style={{ fontSize: 11, color: 'var(--sq-green)', background: 'rgba(62,207,163,.1)', borderRadius: 99, padding: '1px 8px' }}>{p.team}</span>}
                        <span style={{ color: 'var(--sq-muted)', minWidth: 50, textAlign: 'right' }}>{p.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
