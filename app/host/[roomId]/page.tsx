'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { subscribeRoom, subscribePlayers, advanceToQuestion, showAnswers, showLeaderboard, finishRoom, subscribeWordResponses } from '@/lib/rooms'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Room, Player, Quiz } from '@/types'

const ANS_COLORS = ['#E84530','#3B82F6','#F5921E','#3ECFA3']
const ANS_BG = ['rgba(232,69,48,.2)','rgba(59,130,246,.2)','rgba(245,146,30,.2)','rgba(62,207,163,.2)']
const ANS_BORDER = ['rgba(232,69,48,.5)','rgba(59,130,246,.5)','rgba(245,146,30,.5)','rgba(62,207,163,.5)']
const ANS_LABELS = ['A','B','C','D']

export default function HostPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [wordCloud, setWordCloud] = useState<{ word: string; count: number }[]>([])

  useEffect(() => {
    const u1 = subscribeRoom(roomId, setRoom)
    const u2 = subscribePlayers(roomId, setPlayers)
    return () => { u1(); u2() }
  }, [roomId])

  useEffect(() => {
    if (!room?.quizId) return
    getDoc(doc(db, 'quizzes', room.quizId)).then((d) => {
      if (d.exists()) setQuiz({ id: d.id, ...d.data() } as Quiz)
    })
  }, [room?.quizId])

  useEffect(() => {
    if (!room || !quiz) return
    const currentQ = quiz.questions[room.currentQuestion]
    if (currentQ?.type !== 'wordcloud') return
    return subscribeWordResponses(roomId, room.currentQuestion, setWordCloud)
  }, [roomId, room?.currentQuestion, room?.status, quiz])

  useEffect(() => {
    if (room?.status !== 'question' || !room.questionStartedAt || !quiz) return
    const q = quiz.questions[room.currentQuestion]
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - room.questionStartedAt!) / 1000)
      const remaining = q.timeLimit - elapsed
      if (remaining <= 0) { clearInterval(interval); setCountdown(0); handleShowAnswers() }
      else setCountdown(remaining)
    }, 500)
    return () => clearInterval(interval)
  }, [room?.status, room?.questionStartedAt, room?.currentQuestion])

  async function handleShowAnswers() {
    if (!room || !quiz) return
    await showAnswers(roomId, quiz.questions[room.currentQuestion].correctIndex, players)
  }

  async function handleNext() {
    if (!room || !quiz) return
    const isLast = room.currentQuestion >= quiz.questions.length - 1
    if (room.status === 'answer') await showLeaderboard(roomId)
    else if (room.status === 'leaderboard') {
      if (isLast) await finishRoom(roomId)
      else { await advanceToQuestion(roomId, room.currentQuestion + 1); setCountdown(null) }
    }
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  if (!room || !quiz) return (
    <div className="min-h-screen flex items-center justify-center" style={{color:'var(--sq-muted)'}}>Cargando sala...</div>
  )

  const currentQ = quiz.questions[room.currentQuestion]
  const qType = currentQ?.type ?? 'quiz'
  const maxWordCount = wordCloud[0]?.count ?? 1

  return (
    <main className="min-h-screen flex flex-col p-6" style={{maxWidth:900,margin:'0 auto'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <p style={{fontSize:11,color:'var(--sq-muted)',margin:'0 0 3px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Quiz activo</p>
          <h1 style={{fontSize:18,fontWeight:800,margin:0}}>{quiz.title}</h1>
          <p style={{fontSize:13,color:'var(--sq-muted)',margin:'2px 0 0'}}>{players.length} jugadores conectados</p>
        </div>
        <div className="sq-card" style={{padding:'8px 18px',textAlign:'center'}}>
          <p style={{fontSize:10,color:'var(--sq-muted)',margin:'0 0 2px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em'}}>Código</p>
          <p style={{fontFamily:'monospace',fontWeight:900,fontSize:26,letterSpacing:'.15em',color:'var(--sq-green)',margin:0}}>{room.code}</p>
        </div>
      </div>

      {/* WAITING */}
      {room.status === 'waiting' && (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24}}>
          <div className="sq-card" style={{padding:'20px 32px',textAlign:'center'}}>
            <p style={{fontSize:13,color:'var(--sq-muted)',margin:'0 0 6px'}}>Los alumnos entran en</p>
            <p style={{fontSize:18,fontWeight:700,color:'var(--sq-blue)',margin:0}}>
              {typeof window !== 'undefined' ? window.location.origin : ''}/unirse
            </p>
            <p style={{fontSize:13,color:'var(--sq-muted)',margin:'12px 0 6px'}}>con el código</p>
            <p style={{fontFamily:'monospace',fontWeight:900,fontSize:52,letterSpacing:'.2em',color:'var(--sq-green)',margin:0}}>{room.code}</p>
          </div>

          {players.length > 0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',maxWidth:500}}>
              {players.map((p, i) => {
                const colors = ['var(--sq-green)','var(--sq-orange)','var(--sq-blue)','var(--sq-purple)']
                const c = colors[i % 4]
                return (
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:6,background:`${c}18`,border:`0.5px solid ${c}44`,borderRadius:99,padding:'6px 14px'}}>
                    <span style={{fontSize:16}}>{p.emoji}</span>
                    <span style={{fontSize:13,fontWeight:600,color:c}}>{p.name}</span>
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={() => advanceToQuestion(roomId, 0)}
            disabled={players.length === 0}
            className="sq-btn-primary"
            style={{width:'auto',padding:'14px 40px',fontSize:18}}
          >
            ▶ Empezar ({players.length} listos)
          </button>
        </div>
      )}

      {/* QUESTION */}
      {room.status === 'question' && currentQ && (
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16}}>
            <span style={{fontSize:13,color:'var(--sq-muted)',fontWeight:600}}>Pregunta {room.currentQuestion+1} de {quiz.questions.length}</span>
            {countdown !== null && (
              <div style={{
                width:56,height:56,borderRadius:'50%',
                background:countdown<=5?'#E84530':'var(--sq-purple)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:24,fontWeight:900,color:'#fff',flexShrink:0,
                transition:'background .3s'
              }}>{countdown}</div>
            )}
          </div>

          {/* Pregunta + imagen */}
          <div style={{display:'flex',gap:16,alignItems:'stretch'}}>
            <div className="sq-card" style={{padding:'20px 24px',flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <h2 style={{fontSize:24,fontWeight:800,margin:0,textAlign:'center'}}>{currentQ.text}</h2>
            </div>
            {currentQ.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentQ.imageUrl}
                alt="imagen de pregunta"
                style={{height:130,maxWidth:220,objectFit:'cover',borderRadius:16,flexShrink:0}}
              />
            )}
          </div>

          {/* Opciones quiz/truefalse */}
          {qType !== 'wordcloud' && (
            <div style={{display:'grid',gridTemplateColumns: qType==='truefalse'?'1fr 1fr':'1fr 1fr',gap:12,flex:1}}>
              {(qType==='truefalse'
                ? [{label:'✅ Verdadero',color:'#3ECFA3',bg:'rgba(62,207,163,.2)',border:'rgba(62,207,163,.5)'},
                   {label:'❌ Falso',color:'#E84530',bg:'rgba(232,69,48,.2)',border:'rgba(232,69,48,.5)'}]
                : currentQ.options.map((opt,i)=>({label:opt,color:ANS_COLORS[i],bg:ANS_BG[i],border:ANS_BORDER[i]}))
              ).map((item, i) => (
                <div key={i} style={{background:item.bg,border:`1.5px solid ${item.border}`,borderRadius:16,padding:'20px 16px',display:'flex',alignItems:'center',gap:12}}>
                  {qType==='quiz' && <span style={{width:36,height:36,borderRadius:10,background:ANS_COLORS[i],color:'#fff',fontWeight:900,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{ANS_LABELS[i]}</span>}
                  <span style={{fontWeight:700,fontSize:qType==='truefalse'?22:16,color:'#fff'}}>{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Nube de palabras en tiempo real */}
          {qType === 'wordcloud' && (
            <div style={{flex:1,background:'rgba(255,255,255,.04)',border:'0.5px solid var(--sq-border)',borderRadius:16,padding:24,display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
              {wordCloud.length === 0
                ? <p style={{color:'var(--sq-muted)',fontSize:18}}>Esperando respuestas...</p>
                : wordCloud.map(({word,count}) => {
                    const size = 14 + Math.round((count/maxWordCount) * 32)
                    const opacity = 0.5 + (count/maxWordCount) * 0.5
                    const colors = ['var(--sq-green)','var(--sq-orange)','var(--sq-blue)','var(--sq-purple)','#F87171','#FBBF24']
                    const color = colors[Math.abs(word.charCodeAt(0)) % colors.length]
                    return <span key={word} style={{fontSize:size,fontWeight:700,color,opacity,transition:'all .4s'}}>{word}</span>
                  })
              }
            </div>
          )}

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p style={{fontSize:13,color:'var(--sq-muted)',margin:0}}>
              {qType==='wordcloud' ? `${wordCloud.length} respuestas` : `${players.filter(p=>p.lastAnswer).length} / ${players.length} respondieron`}
            </p>
            <button
              onClick={handleShowAnswers}
              style={{background:'var(--sq-orange)',color:'#fff',fontWeight:700,fontSize:14,padding:'10px 20px',borderRadius:10,border:'none',cursor:'pointer'}}
            >
              {qType==='wordcloud'?'Cerrar nube →':'Ver respuestas →'}
            </button>
          </div>
        </div>
      )}

      {/* ANSWER */}
      {room.status === 'answer' && currentQ && (
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',gap:16,alignItems:'stretch'}}>
            <div className="sq-card" style={{padding:'16px 20px',flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <h2 style={{fontSize:20,fontWeight:800,margin:0,textAlign:'center'}}>{currentQ.text}</h2>
            </div>
            {currentQ.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentQ.imageUrl} alt="" style={{height:90,maxWidth:160,objectFit:'cover',borderRadius:14,flexShrink:0}} />
            )}
          </div>
          {qType === 'wordcloud' ? (
            <div style={{flex:1,background:'rgba(255,255,255,.04)',border:'0.5px solid var(--sq-border)',borderRadius:16,padding:24,display:'flex',flexWrap:'wrap',gap:14,alignItems:'center',justifyContent:'center'}}>
              {wordCloud.map(({word,count}) => {
                const size = 16 + Math.round((count/maxWordCount) * 36)
                const colors = ['var(--sq-green)','var(--sq-orange)','var(--sq-blue)','var(--sq-purple)','#F87171','#FBBF24']
                const color = colors[Math.abs(word.charCodeAt(0)) % colors.length]
                return <span key={word} style={{fontSize:size,fontWeight:700,color}}>{word} <span style={{fontSize:12,opacity:.6}}>×{count}</span></span>
              })}
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {(qType==='truefalse'
                ? ['✅ Verdadero','❌ Falso']
                : currentQ.options
              ).map((opt, i) => (
                <div key={i} style={{
                  background: i===currentQ.correctIndex ? ANS_BG[i] : 'rgba(255,255,255,.04)',
                  border: `1.5px solid ${i===currentQ.correctIndex ? ANS_COLORS[i] : 'rgba(255,255,255,.1)'}`,
                  borderRadius:16,padding:'16px',display:'flex',alignItems:'center',gap:10,
                  opacity: i===currentQ.correctIndex ? 1 : 0.4
                }}>
                  {qType==='quiz' && <span style={{width:32,height:32,borderRadius:8,background:i===currentQ.correctIndex?ANS_COLORS[i]:'rgba(255,255,255,.1)',color:'#fff',fontWeight:900,fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{ANS_LABELS[i]}</span>}
                  <span style={{fontWeight:700,fontSize:15,color:'#fff'}}>{opt}</span>
                  {i===currentQ.correctIndex && <span style={{marginLeft:'auto',fontSize:20}}>✓</span>}
                </div>
              ))}
            </div>
          )}
          <div className="sq-card" style={{padding:16}}>
            <p style={{fontSize:12,color:'var(--sq-muted)',margin:'0 0 10px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>Resultados</p>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:160,overflowY:'auto'}}>
              {sortedPlayers.map(p => (
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:10}}>
                  <span>{p.emoji}</span>
                  <span style={{flex:1,fontWeight:600,fontSize:14}}>{p.name}</span>
                  {p.lastAnswer && (
                    <span style={{fontWeight:700,color:p.lastAnswer.correct?'var(--sq-green)':'#F87171',fontSize:13}}>
                      {p.lastAnswer.correct?`+${p.lastAnswer.points}`:'✗'}
                    </span>
                  )}
                  <span style={{color:'var(--sq-muted)',fontSize:13,minWidth:55,textAlign:'right'}}>{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleNext} className="sq-btn-primary">Ver ranking →</button>
        </div>
      )}

      {/* LEADERBOARD / FINISHED — Podio estilo Kahoot */}
      {(room.status === 'leaderboard' || room.status === 'finished') && (
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:16}}>
          <h2 style={{fontSize:26,fontWeight:900,textAlign:'center',margin:0}}>
            {room.status==='finished' ? '🏆 Resultado final' : '📊 Ranking'}
          </h2>

          {/* PODIO top 3 */}
          {sortedPlayers.length >= 1 && (
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:12,padding:'0 16px'}}>
              {/* 2do lugar */}
              {sortedPlayers[1] && (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                  <span style={{fontSize:28}}>{sortedPlayers[1].emoji}</span>
                  <p style={{fontWeight:700,fontSize:13,margin:0,textAlign:'center'}}>{sortedPlayers[1].name}</p>
                  <p style={{fontSize:12,color:'var(--sq-muted)',margin:0}}>{sortedPlayers[1].score} pts</p>
                  <div style={{
                    width:'100%', height:80,
                    background:'rgba(156,163,175,.25)',
                    border:'1.5px solid rgba(156,163,175,.5)',
                    borderRadius:'10px 10px 0 0',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:28,fontWeight:900,color:'#9CA3AF'
                  }}>🥈</div>
                </div>
              )}
              {/* 1er lugar */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                <span style={{fontSize:36}}>{sortedPlayers[0].emoji}</span>
                <p style={{fontWeight:800,fontSize:14,margin:0,textAlign:'center'}}>{sortedPlayers[0].name}</p>
                <p style={{fontSize:12,color:'var(--sq-green)',fontWeight:700,margin:0}}>{sortedPlayers[0].score} pts</p>
                <div style={{
                  width:'100%', height:110,
                  background:'rgba(245,158,11,.25)',
                  border:'1.5px solid rgba(245,158,11,.6)',
                  borderRadius:'10px 10px 0 0',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:36,fontWeight:900
                }}>🥇</div>
              </div>
              {/* 3er lugar */}
              {sortedPlayers[2] && (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                  <span style={{fontSize:28}}>{sortedPlayers[2].emoji}</span>
                  <p style={{fontWeight:700,fontSize:13,margin:0,textAlign:'center'}}>{sortedPlayers[2].name}</p>
                  <p style={{fontSize:12,color:'var(--sq-muted)',margin:0}}>{sortedPlayers[2].score} pts</p>
                  <div style={{
                    width:'100%', height:60,
                    background:'rgba(234,88,12,.2)',
                    border:'1.5px solid rgba(234,88,12,.5)',
                    borderRadius:'10px 10px 0 0',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:24,fontWeight:900,color:'#EA580C'
                  }}>🥉</div>
                </div>
              )}
            </div>
          )}

          {/* resto del ranking */}
          {sortedPlayers.length > 3 && (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {sortedPlayers.slice(3,8).map((p, i) => (
                <div key={p.id} style={{
                  background:'var(--sq-subtle)', border:'0.5px solid var(--sq-border)',
                  borderRadius:10, padding:'10px 16px',
                  display:'flex', alignItems:'center', gap:12
                }}>
                  <span style={{fontSize:14,fontWeight:700,color:'var(--sq-muted)',width:20}}>{i+4}</span>
                  <span style={{fontSize:20}}>{p.emoji}</span>
                  <span style={{fontWeight:600,fontSize:14,flex:1}}>{p.name}</span>
                  <span style={{fontWeight:800,fontSize:15,color:'var(--sq-green)'}}>{p.score} pts</span>
                </div>
              ))}
            </div>
          )}

          {room.status==='leaderboard' && (
            <button onClick={handleNext} className="sq-btn-primary">
              {room.currentQuestion>=quiz.questions.length-1 ? '🏁 Finalizar' : 'Siguiente pregunta →'}
            </button>
          )}
          {room.status==='finished' && (
            <button
              onClick={async () => {
                const { createRoom } = await import('@/lib/rooms')
                const newRoomId = await createRoom(room.quizId, room.hostId)
                router.push(`/host/${newRoomId}`)
              }}
              style={{background:'var(--sq-subtle)',border:'0.5px solid var(--sq-border)',color:'var(--sq-text)',fontWeight:700,fontSize:15,padding:'14px',borderRadius:14,cursor:'pointer',width:'100%'}}
            >
              🔄 Nueva partida
            </button>
          )}
        </div>
      )}
    </main>
  )
}
