'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeRoom, submitAnswer, subscribePlayers } from '@/lib/rooms'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Room, Quiz, Player } from '@/types'

const ANS_COLORS = ['#E84530', '#3B82F6', '#F5921E', '#3ECFA3']
const ANS_SHAPES = ['▲', '◆', '●', '■']

export default function JugarPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answered, setAnswered] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [myData, setMyData] = useState<Player | null>(null)
  const [ranking, setRanking] = useState(0)

  useEffect(() => { setPlayerId(localStorage.getItem(`player_${roomId}`)) }, [roomId])

  useEffect(() => {
    return subscribeRoom(roomId, (r) => {
      if (r.currentQuestion !== room?.currentQuestion) setAnswered(null)
      setRoom(r)
    })
  }, [roomId, room?.currentQuestion])

  useEffect(() => {
    if (!room?.quizId) return
    getDoc(doc(db, 'quizzes', room.quizId)).then((d) => {
      if (d.exists()) setQuiz({ id: d.id, ...d.data() } as Quiz)
    })
  }, [room?.quizId])

  useEffect(() => {
    if (room?.status !== 'question' || !room.questionStartedAt || !quiz) return
    const q = quiz.questions[room.currentQuestion]
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - room.questionStartedAt!) / 1000)
      const remaining = q.timeLimit - elapsed
      setCountdown(Math.max(0, remaining))
      if (remaining <= 0) clearInterval(interval)
    }, 500)
    return () => clearInterval(interval)
  }, [room?.status, room?.questionStartedAt, room?.currentQuestion])

  useEffect(() => {
    if (!playerId) return
    return subscribePlayers(roomId, (players) => {
      const sorted = [...players].sort((a, b) => b.score - a.score)
      const me = players.find((p) => p.id === playerId)
      if (me) { setMyData(me); setRanking(sorted.findIndex((p) => p.id === playerId) + 1) }
    })
  }, [roomId, playerId])

  async function handleAnswer(index: number) {
    if (!room || !quiz || answered !== null || !playerId) return
    setAnswered(index)
    await submitAnswer(roomId, playerId, index, room.questionStartedAt!, quiz.questions[room.currentQuestion].timeLimit)
  }

  if (!room || !quiz) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sq-muted)' }}>
      Conectando...
    </div>
  )

  const currentQ = quiz.questions[room.currentQuestion]

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Score bar */}
      {myData && room.status !== 'waiting' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px',
          background: 'rgba(255,255,255,.05)',
          borderBottom: '0.5px solid var(--sq-border)'
        }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{myData.emoji} {myData.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--sq-muted)', fontWeight: 600 }}>#{ranking}</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--sq-green)' }}>{myData.score} pts</span>
          </div>
        </div>
      )}

      {/* WAITING */}
      {room.status === 'waiting' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>⏳</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Esperando al profe...</h1>
          <p style={{ color: 'var(--sq-muted)', margin: 0, fontSize: 15 }}>La partida arranca en cualquier momento</p>
          {myData && (
            <div style={{ marginTop: 16, background: 'var(--sq-subtle)', borderRadius: 16, padding: '12px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: 32 }}>{myData.emoji}</span>
              <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 16 }}>{myData.name}</p>
            </div>
          )}
        </div>
      )}

      {/* QUESTION — solo formas, sin texto (como Kahoot) */}
      {room.status === 'question' && currentQ && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Countdown */}
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            {countdown !== null && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 64, height: 64, borderRadius: '50%',
                background: countdown <= 5 ? '#E84530' : 'var(--sq-purple)',
                fontSize: 28, fontWeight: 900, color: '#fff',
                transition: 'background .3s'
              }}>
                {countdown}
              </div>
            )}
          </div>

          {answered !== null ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: ANS_COLORS[answered],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36
              }}>
                {ANS_SHAPES[answered]}
              </div>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>¡Respuesta enviada!</p>
              <p style={{ color: 'var(--sq-muted)', margin: 0, fontSize: 14 }}>Esperando al resto...</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 12px 16px' }}>
              {currentQ.options.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  style={{
                    background: ANS_COLORS[i],
                    border: 'none', borderRadius: 16,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 10, cursor: 'pointer',
                    transition: 'transform .1s, opacity .1s',
                    minHeight: 120
                  }}
                  onTouchStart={e => (e.currentTarget.style.transform = 'scale(.93)')}
                  onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span style={{ fontSize: 40, color: '#fff', fontWeight: 900 }}>{ANS_SHAPES[i]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANSWER REVEAL */}
      {room.status === 'answer' && currentQ && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', padding: 24 }}>
          {answered !== null ? (
            answered === currentQ.correctIndex ? (
              <>
                <div style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: ANS_COLORS[currentQ.correctIndex],
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40
                }}>✓</div>
                <p style={{ fontSize: 32, fontWeight: 900, margin: 0, color: 'var(--sq-green)' }}>¡Correcto!</p>
                {myData?.lastAnswer && (
                  <div style={{ background: 'rgba(62,207,163,.15)', border: '1px solid var(--sq-green)', borderRadius: 14, padding: '12px 28px' }}>
                    <p style={{ fontWeight: 900, fontSize: 28, color: 'var(--sq-green)', margin: 0 }}>+{myData.lastAnswer.points} pts</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: '#333', border: '3px solid #E84530',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40
                }}>✗</div>
                <p style={{ fontSize: 32, fontWeight: 900, margin: 0, color: '#F87171' }}>Incorrecto</p>
                <p style={{ color: 'var(--sq-muted)', margin: 0 }}>
                  Era: <span style={{ color: ANS_COLORS[currentQ.correctIndex], fontWeight: 800 }}>
                    {ANS_SHAPES[currentQ.correctIndex]} {currentQ.options[currentQ.correctIndex]}
                  </span>
                </p>
              </>
            )
          ) : (
            <>
              <div style={{ fontSize: 56 }}>⌛</div>
              <p style={{ fontSize: 24, fontWeight: 900, margin: 0, color: 'var(--sq-muted)' }}>Se acabó el tiempo</p>
              <p style={{ color: 'var(--sq-muted)', margin: 0 }}>
                Era: <span style={{ color: ANS_COLORS[currentQ.correctIndex], fontWeight: 800 }}>
                  {ANS_SHAPES[currentQ.correctIndex]} {currentQ.options[currentQ.correctIndex]}
                </span>
              </p>
            </>
          )}
          <p style={{ color: 'var(--sq-muted)', fontSize: 13, marginTop: 8 }}>Esperando al profe...</p>
        </div>
      )}

      {/* LEADERBOARD — podio */}
      {room.status === 'leaderboard' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📊 Ranking</h2>
          {myData && (
            <div style={{ background: 'var(--sq-subtle)', border: '0.5px solid var(--sq-border)', borderRadius: 16, padding: '16px 32px' }}>
              <p style={{ color: 'var(--sq-muted)', fontSize: 12, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Tu posición</p>
              <p style={{ fontWeight: 900, fontSize: 48, color: 'var(--sq-green)', margin: '0 0 2px', lineHeight: 1 }}>#{ranking}</p>
              <p style={{ fontWeight: 800, fontSize: 20, margin: 0 }}>{myData.score} pts</p>
            </div>
          )}
          <p style={{ color: 'var(--sq-muted)', fontSize: 13 }}>El profe está mostrando los resultados</p>
        </div>
      )}

      {/* FINISHED — podio personal */}
      {room.status === 'finished' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 64 }}>{ranking === 1 ? '🏆' : ranking === 2 ? '🥈' : ranking === 3 ? '🥉' : '🎉'}</div>
          <h2 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>¡Partida terminada!</h2>
          {myData && (
            <div style={{ background: 'var(--sq-subtle)', border: '0.5px solid var(--sq-border)', borderRadius: 16, padding: '20px 40px' }}>
              <p style={{ fontSize: 20, margin: '0 0 4px' }}>{myData.emoji} {myData.name}</p>
              <p style={{ fontWeight: 900, fontSize: 48, color: 'var(--sq-green)', margin: '0 0 2px', lineHeight: 1 }}>#{ranking}</p>
              <p style={{ color: 'var(--sq-muted)', margin: 0, fontSize: 14 }}>{myData.score} pts finales</p>
            </div>
          )}
          <p style={{ color: 'var(--sq-muted)', fontSize: 14 }}>¡Buen juego!</p>
        </div>
      )}
    </main>
  )
}
