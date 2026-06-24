'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeRoom, submitAnswer, subscribePlayers, submitWord } from '@/lib/rooms'
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
  const [wordSent, setWordSent] = useState(false)
  const [wordInput, setWordInput] = useState('')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [myData, setMyData] = useState<Player | null>(null)
  const [ranking, setRanking] = useState(0)

  useEffect(() => { setPlayerId(localStorage.getItem(`player_${roomId}`)) }, [roomId])

  useEffect(() => {
    return subscribeRoom(roomId, (r) => {
      if (r.currentQuestion !== room?.currentQuestion) {
        setAnswered(null)
        setWordSent(false)
        setWordInput('')
      }
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

  async function handleWordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wordInput.trim() || wordSent || !playerId || !room) return
    setWordSent(true)
    await submitWord(roomId, playerId, wordInput.trim(), room.currentQuestion)
  }

  if (!room || !quiz) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sq-muted)' }}>Conectando...</div>
  )

  const currentQ = quiz.questions[room.currentQuestion]
  const qType = currentQ?.type ?? 'quiz'

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Score bar */}
      {myData && room.status !== 'waiting' && qType !== 'wordcloud' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(255,255,255,.05)', borderBottom: '0.5px solid var(--sq-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{myData.emoji} {myData.name}</span>
            {myData.team && (
              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(62,207,163,.2)', border: '0.5px solid rgba(62,207,163,.5)', color: 'var(--sq-green)', borderRadius: 99, padding: '2px 8px' }}>
                {myData.team}
              </span>
            )}
          </div>
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
          {myData && (
            <div style={{ marginTop: 8, background: 'var(--sq-subtle)', borderRadius: 16, padding: '12px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: 32 }}>{myData.emoji}</span>
              <p style={{ fontWeight: 700, margin: '4px 0 0', fontSize: 16 }}>{myData.name}</p>
            </div>
          )}
        </div>
      )}

      {/* QUESTION — Quiz (4 opciones con texto) */}
      {room.status === 'question' && currentQ && qType === 'quiz' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Countdown + pregunta */}
          <div style={{ textAlign: 'center', padding: '12px 16px 8px' }}>
            {countdown !== null && (
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: '50%', background: countdown <= 5 ? '#E84530' : 'var(--sq-purple)', fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 10 }}>
                {countdown}
              </div>
            )}
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{currentQ.text}</h2>
          </div>

          {answered !== null ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: ANS_COLORS[answered], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{ANS_SHAPES[answered]}</div>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>¡Respuesta enviada!</p>
              <p style={{ color: 'var(--sq-muted)', margin: 0, fontSize: 14 }}>Esperando al resto...</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 12px 16px' }}>
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  style={{ background: ANS_COLORS[i], border: 'none', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', minHeight: 100, padding: '14px 10px' }}
                  onTouchStart={e => (e.currentTarget.style.transform = 'scale(.93)')}
                  onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span style={{ fontSize: 26, color: '#fff', fontWeight: 900 }}>{ANS_SHAPES[i]}</span>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{opt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUESTION — Verdadero/Falso */}
      {room.status === 'question' && currentQ && qType === 'truefalse' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            {countdown !== null && (
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: countdown <= 5 ? '#E84530' : 'var(--sq-purple)', fontSize: 28, fontWeight: 900, color: '#fff' }}>
                {countdown}
              </div>
            )}
            <p style={{ fontSize: 18, fontWeight: 800, margin: '12px 16px 0', textAlign: 'center' }}>{currentQ.text}</p>
          </div>
          {answered !== null ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: answered === 0 ? '#3ECFA3' : '#E84530', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                {answered === 0 ? '✅' : '❌'}
              </div>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>¡Respuesta enviada!</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px 16px 24px' }}>
              <button onClick={() => handleAnswer(0)} style={{ background: '#3ECFA3', border: 'none', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', minHeight: 140 }}
                onTouchStart={e => (e.currentTarget.style.transform = 'scale(.93)')}
                onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}>
                <span style={{ fontSize: 48 }}>✅</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#0D4A38' }}>VERDADERO</span>
              </button>
              <button onClick={() => handleAnswer(1)} style={{ background: '#E84530', border: 'none', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', minHeight: 140 }}
                onTouchStart={e => (e.currentTarget.style.transform = 'scale(.93)')}
                onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}>
                <span style={{ fontSize: 48 }}>❌</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>FALSO</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* QUESTION — Word Cloud */}
      {room.status === 'question' && currentQ && qType === 'wordcloud' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>☁️</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px' }}>{currentQ.text}</h2>
            <p style={{ color: 'var(--sq-muted)', margin: 0, fontSize: 14 }}>Escribí una palabra</p>
          </div>
          {wordSent ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 36, margin: '0 0 8px' }}>✅</p>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>«{wordInput}» enviado</p>
              <p style={{ color: 'var(--sq-muted)', margin: '6px 0 0', fontSize: 13 }}>Mirá la pantalla del profe</p>
            </div>
          ) : (
            <form onSubmit={handleWordSubmit} style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={wordInput}
                onChange={e => setWordInput(e.target.value)}
                placeholder="Tu palabra..."
                maxLength={30}
                autoFocus
                className="sq-input"
                style={{ textAlign: 'center', fontSize: 22, fontWeight: 700 }}
              />
              <button type="submit" disabled={!wordInput.trim()} className="sq-btn-primary">
                Enviar →
              </button>
            </form>
          )}
        </div>
      )}

      {/* ANSWER REVEAL */}
      {room.status === 'answer' && currentQ && qType !== 'wordcloud' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', padding: 24 }}>
          {answered !== null ? (
            answered === currentQ.correctIndex ? (
              <>
                <div style={{ width: 90, height: 90, borderRadius: '50%', background: ANS_COLORS[currentQ.correctIndex], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>✓</div>
                <p style={{ fontSize: 32, fontWeight: 900, margin: 0, color: 'var(--sq-green)' }}>¡Correcto!</p>
                {myData?.lastAnswer && (
                  <div style={{ background: 'rgba(62,207,163,.15)', border: '1px solid var(--sq-green)', borderRadius: 14, padding: '12px 28px' }}>
                    <p style={{ fontWeight: 900, fontSize: 28, color: 'var(--sq-green)', margin: 0 }}>+{myData.lastAnswer.points} pts</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#333', border: '3px solid #E84530', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>✗</div>
                <p style={{ fontSize: 32, fontWeight: 900, margin: 0, color: '#F87171' }}>Incorrecto</p>
                <p style={{ color: 'var(--sq-muted)', margin: 0 }}>
                  Era: <span style={{ color: qType === 'truefalse' ? (currentQ.correctIndex === 0 ? '#3ECFA3' : '#E84530') : ANS_COLORS[currentQ.correctIndex], fontWeight: 800 }}>
                    {qType === 'truefalse' ? (currentQ.correctIndex === 0 ? '✅ Verdadero' : '❌ Falso') : `${ANS_SHAPES[currentQ.correctIndex]} ${currentQ.options[currentQ.correctIndex]}`}
                  </span>
                </p>
              </>
            )
          ) : (
            <>
              <div style={{ fontSize: 56 }}>⌛</div>
              <p style={{ fontSize: 24, fontWeight: 900, margin: 0, color: 'var(--sq-muted)' }}>Se acabó el tiempo</p>
            </>
          )}
          <p style={{ color: 'var(--sq-muted)', fontSize: 13 }}>Esperando al profe...</p>
        </div>
      )}

      {/* ANSWER — Word cloud (solo esperar) */}
      {room.status === 'answer' && currentQ && qType === 'wordcloud' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>☁️</div>
          <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Mirá la nube en pantalla</p>
          <p style={{ color: 'var(--sq-muted)', fontSize: 13 }}>El profe está mostrando los resultados</p>
        </div>
      )}

      {/* LEADERBOARD */}
      {room.status === 'leaderboard' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 48 }}>📊</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Ranking en vivo</h2>
          {myData && qType !== 'wordcloud' && (
            <div style={{ background: 'var(--sq-subtle)', border: '0.5px solid var(--sq-border)', borderRadius: 16, padding: '16px 32px' }}>
              <p style={{ color: 'var(--sq-muted)', fontSize: 12, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Tu posición</p>
              <p style={{ fontWeight: 900, fontSize: 48, color: 'var(--sq-green)', margin: '0 0 2px', lineHeight: 1 }}>#{ranking}</p>
              <p style={{ fontWeight: 800, fontSize: 20, margin: 0 }}>{myData.score} pts</p>
            </div>
          )}
          <p style={{ color: 'var(--sq-muted)', fontSize: 13 }}>El profe está mostrando los resultados</p>
        </div>
      )}

      {/* FINISHED */}
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
          <a
            href="/"
            style={{ background: 'var(--sq-green)', color: 'var(--sq-green-dark)', fontWeight: 800, fontSize: 16, padding: '14px 32px', borderRadius: 14, textDecoration: 'none', display: 'inline-block', marginTop: 8 }}
          >
            Volver al inicio
          </a>
        </div>
      )}
    </main>
  )
}
