'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeRoom, submitAnswer, subscribePlayers } from '@/lib/rooms'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Room, Quiz, Player } from '@/types'

const OPTION_COLORS = ['bg-red-500 hover:bg-red-400', 'bg-blue-500 hover:bg-blue-400', 'bg-yellow-500 hover:bg-yellow-400', 'bg-green-500 hover:bg-green-400']
const OPTION_COLORS_STATIC = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500']
const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function JugarPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answered, setAnswered] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [myData, setMyData] = useState<Player | null>(null)
  const [ranking, setRanking] = useState<number>(0)

  useEffect(() => {
    setPlayerId(localStorage.getItem(`player_${roomId}`))
  }, [roomId])

  useEffect(() => {
    if (!playerId) return
    return subscribePlayers(roomId, (players) => {
      const sorted = [...players].sort((a, b) => b.score - a.score)
      const me = players.find((p) => p.id === playerId)
      if (me) {
        setMyData(me)
        setRanking(sorted.findIndex((p) => p.id === playerId) + 1)
      }
    })
  }, [roomId, playerId])

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

  async function handleAnswer(index: number) {
    if (!room || !quiz || answered !== null || !playerId) return
    const q = quiz.questions[room.currentQuestion]
    setAnswered(index)
    await submitAnswer(roomId, playerId, index, room.questionStartedAt!, q.timeLimit)
  }

  if (!room || !quiz) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Conectando...</div>
  }

  const currentQ = quiz.questions[room.currentQuestion]

  return (
    <main className="min-h-screen flex flex-col p-4">
      {/* Score bar */}
      {myData && room.status !== 'waiting' && (
        <div className="flex items-center justify-between mb-4 bg-gray-800 rounded-xl px-4 py-2">
          <span className="text-lg">{myData.emoji} <span className="font-bold">{myData.name}</span></span>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">#{ranking}</span>
            <span className="font-black text-violet-400 text-lg">{myData.score} pts</span>
          </div>
        </div>
      )}

      {/* Sala de espera */}
      {room.status === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl animate-bounce">⏳</div>
          <h1 className="text-2xl font-black">Esperando al profe...</h1>
          <p className="text-gray-400">La partida arranca en cualquier momento</p>
        </div>
      )}

      {/* Pregunta activa */}
      {room.status === 'question' && currentQ && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="text-center py-4">
            {countdown !== null && (
              <div className={`text-5xl font-black mb-2 ${countdown <= 5 ? 'text-red-400' : 'text-white'}`}>
                {countdown}
              </div>
            )}
            <h2 className="text-2xl font-black px-2">{currentQ.text}</h2>
          </div>

          {answered !== null ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-xl font-bold">¡Respuesta enviada!</p>
                <p className="text-gray-400 mt-1">Esperando al resto...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 flex-1">
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`${OPTION_COLORS[i]} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-colors active:scale-95 transform`}
                >
                  <span className="font-black text-2xl w-10 h-10 bg-black/20 rounded-full flex items-center justify-center">
                    {OPTION_LABELS[i]}
                  </span>
                  <span className="font-bold text-sm text-center">{opt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Respuestas reveladas */}
      {room.status === 'answer' && currentQ && (
        <div className="flex-1 flex flex-col gap-4 items-center justify-center text-center">
          {answered !== null ? (
            answered === currentQ.correctIndex ? (
              <div>
                <div className="text-6xl mb-3">🎉</div>
                <p className="text-3xl font-black text-green-400">¡Correcto!</p>
              </div>
            ) : (
              <div>
                <div className="text-6xl mb-3">😬</div>
                <p className="text-3xl font-black text-red-400">Incorrecto</p>
                <p className="text-gray-400 mt-2">
                  Era: <span className="text-white font-bold">{currentQ.options[currentQ.correctIndex]}</span>
                </p>
              </div>
            )
          ) : (
            <div>
              <div className="text-6xl mb-3">⌛</div>
              <p className="text-2xl font-black text-gray-400">Se acabó el tiempo</p>
              <p className="text-gray-400 mt-2">
                Era: <span className="text-white font-bold">{currentQ.options[currentQ.correctIndex]}</span>
              </p>
            </div>
          )}
          <p className="text-gray-400 text-sm mt-4">Esperando al profe...</p>
        </div>
      )}

      {/* Leaderboard */}
      {room.status === 'leaderboard' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl">📊</div>
          <h2 className="text-2xl font-black">Ranking en vivo</h2>
          {myData && (
            <div className="bg-gray-800 rounded-2xl px-8 py-4 mt-2">
              <p className="text-gray-400 text-sm mb-1">Tu posición</p>
              <p className="font-black text-5xl text-violet-400">#{ranking}</p>
              <p className="font-black text-2xl mt-1">{myData.score} pts</p>
            </div>
          )}
          <p className="text-gray-400 text-sm">El profe está mostrando los resultados</p>
        </div>
      )}

      {/* Final */}
      {room.status === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-6xl">{ranking === 1 ? '🏆' : ranking === 2 ? '🥈' : ranking === 3 ? '🥉' : '🎉'}</div>
          <h2 className="text-3xl font-black">¡Partida terminada!</h2>
          {myData && (
            <div className="bg-gray-800 rounded-2xl px-8 py-4">
              <p className="font-black text-4xl text-violet-400">#{ranking}</p>
              <p className="text-gray-400 mt-1">{myData.score} pts finales</p>
            </div>
          )}
          <p className="text-gray-400">¡Buen juego!</p>
        </div>
      )}
    </main>
  )
}
