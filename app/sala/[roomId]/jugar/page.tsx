'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeRoom, submitAnswer, subscribePlayers } from '@/lib/rooms'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Room, Quiz, Player } from '@/types'

const ANS_COLORS = ['#E84530','#3B82F6','#F5921E','#3ECFA3']
const ANS_BG = ['rgba(232,69,48,.2)','rgba(59,130,246,.2)','rgba(245,146,30,.2)','rgba(62,207,163,.2)']
const ANS_BORDER = ['rgba(232,69,48,.5)','rgba(59,130,246,.5)','rgba(245,146,30,.5)','rgba(62,207,163,.5)']
const ANS_LABELS = ['A','B','C','D']

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
    <div className="min-h-screen flex items-center justify-center" style={{color:'var(--sq-muted)'}}>Conectando...</div>
  )

  const currentQ = quiz.questions[room.currentQuestion]

  return (
    <main className="min-h-screen flex flex-col p-4">

      {/* Score bar */}
      {myData && room.status !== 'waiting' && (
        <div className="sq-card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',marginBottom:16}}>
          <span style={{fontSize:14,fontWeight:700}}>{myData.emoji} {myData.name}</span>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:12,color:'var(--sq-muted)',fontWeight:600}}>#{ranking}</span>
            <span style={{fontSize:16,fontWeight:900,color:'var(--sq-green)'}}>{myData.score} pts</span>
          </div>
        </div>
      )}

      {/* WAITING */}
      {room.status === 'waiting' && (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,textAlign:'center'}}>
          <div style={{fontSize:52,marginBottom:4}}>⏳</div>
          <h1 style={{fontSize:24,fontWeight:900,margin:0}}>Esperando al profe...</h1>
          <p style={{color:'var(--sq-muted)',margin:0,fontSize:14}}>La partida arranca en cualquier momento</p>
        </div>
      )}

      {/* QUESTION */}
      {room.status === 'question' && currentQ && (
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:14}}>
          <div style={{textAlign:'center',padding:'8px 0'}}>
            {countdown !== null && (
              <div style={{fontSize:48,fontWeight:900,color:countdown<=5?'#F87171':'var(--sq-orange)',lineHeight:1,marginBottom:8}}>{countdown}</div>
            )}
            <h2 style={{fontSize:20,fontWeight:800,margin:0,padding:'0 4px'}}>{currentQ.text}</h2>
          </div>

          {answered !== null ? (
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10}}>
              <div style={{fontSize:56}}>✅</div>
              <p style={{fontSize:18,fontWeight:800,margin:0}}>¡Respuesta enviada!</p>
              <p style={{color:'var(--sq-muted)',margin:0,fontSize:14}}>Esperando al resto...</p>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,flex:1}}>
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  style={{
                    background:ANS_BG[i],
                    border:`1.5px solid ${ANS_COLORS[i]}`,
                    borderRadius:16,
                    padding:'20px 12px',
                    display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                    cursor:'pointer',transition:'transform .1s'
                  }}
                  onTouchStart={(e) => (e.currentTarget.style.transform='scale(.95)')}
                  onTouchEnd={(e) => (e.currentTarget.style.transform='scale(1)')}
                >
                  <span style={{fontSize:24,fontWeight:900,color:ANS_COLORS[i]}}>{ANS_LABELS[i]}</span>
                  <span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.85)',textAlign:'center',lineHeight:1.3}}>{opt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANSWER */}
      {room.status === 'answer' && currentQ && (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,textAlign:'center'}}>
          {answered !== null ? (
            answered === currentQ.correctIndex ? (
              <>
                <div style={{fontSize:60}}>🎉</div>
                <p style={{fontSize:30,fontWeight:900,margin:0,color:'var(--sq-green)'}}>¡Correcto!</p>
                {myData?.lastAnswer && (
                  <div className="sq-card" style={{padding:'10px 24px'}}>
                    <p style={{fontWeight:900,fontSize:24,color:'var(--sq-green)',margin:0}}>+{myData.lastAnswer.points} pts</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{fontSize:60}}>😬</div>
                <p style={{fontSize:30,fontWeight:900,margin:0,color:'#F87171'}}>Incorrecto</p>
                <p style={{color:'var(--sq-muted)',margin:0,fontSize:14}}>
                  Era: <span style={{color:'#fff',fontWeight:700}}>{currentQ.options[currentQ.correctIndex]}</span>
                </p>
              </>
            )
          ) : (
            <>
              <div style={{fontSize:60}}>⌛</div>
              <p style={{fontSize:24,fontWeight:900,margin:0,color:'var(--sq-muted)'}}>Se acabó el tiempo</p>
              <p style={{color:'var(--sq-muted)',margin:0,fontSize:14}}>
                Era: <span style={{color:'#fff',fontWeight:700}}>{currentQ.options[currentQ.correctIndex]}</span>
              </p>
            </>
          )}
          <p style={{color:'var(--sq-muted)',fontSize:13,marginTop:8}}>Esperando al profe...</p>
        </div>
      )}

      {/* LEADERBOARD */}
      {room.status === 'leaderboard' && (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,textAlign:'center'}}>
          <div style={{fontSize:48}}>📊</div>
          <h2 style={{fontSize:24,fontWeight:900,margin:0}}>Ranking en vivo</h2>
          {myData && (
            <div className="sq-card" style={{padding:'16px 32px',marginTop:8}}>
              <p style={{color:'var(--sq-muted)',fontSize:12,margin:'0 0 4px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>Tu posición</p>
              <p style={{fontWeight:900,fontSize:48,color:'var(--sq-green)',margin:'0 0 2px',lineHeight:1}}>#{ranking}</p>
              <p style={{fontWeight:800,fontSize:20,margin:0}}>{myData.score} pts</p>
            </div>
          )}
          <p style={{color:'var(--sq-muted)',fontSize:13}}>El profe está mostrando los resultados</p>
        </div>
      )}

      {/* FINISHED */}
      {room.status === 'finished' && (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,textAlign:'center'}}>
          <div style={{fontSize:60}}>{ranking===1?'🏆':ranking===2?'🥈':ranking===3?'🥉':'🎉'}</div>
          <h2 style={{fontSize:28,fontWeight:900,margin:0}}>¡Partida terminada!</h2>
          {myData && (
            <div className="sq-card" style={{padding:'16px 32px'}}>
              <p style={{fontWeight:900,fontSize:44,color:'var(--sq-green)',margin:'0 0 2px',lineHeight:1}}>#{ranking}</p>
              <p style={{color:'var(--sq-muted)',margin:0,fontSize:14}}>{myData.score} pts finales</p>
            </div>
          )}
          <p style={{color:'var(--sq-muted)',fontSize:14}}>¡Buen juego!</p>
        </div>
      )}
    </main>
  )
}
