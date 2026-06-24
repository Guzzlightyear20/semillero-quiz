'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { subscribeRoom, subscribePlayers, advanceToQuestion, showAnswers, showLeaderboard, finishRoom } from '@/lib/rooms'
import { getQuizzesByHost } from '@/lib/rooms'
import { subscribeAuth } from '@/lib/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Room, Player, Quiz } from '@/types'

const OPTION_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500']
const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function HostPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const unsub1 = subscribeRoom(roomId, setRoom)
    const unsub2 = subscribePlayers(roomId, setPlayers)
    return () => { unsub1(); unsub2() }
  }, [roomId])

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
      if (remaining <= 0) {
        clearInterval(interval)
        setCountdown(0)
        handleShowAnswers()
      } else {
        setCountdown(remaining)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [room?.status, room?.questionStartedAt, room?.currentQuestion])

  async function handleShowAnswers() {
    if (!room || !quiz) return
    const q = quiz.questions[room.currentQuestion]
    await showAnswers(roomId, q.correctIndex, players)
  }

  async function handleNext() {
    if (!room || !quiz) return
    const isLast = room.currentQuestion >= quiz.questions.length - 1
    if (room.status === 'answer') {
      await showLeaderboard(roomId)
    } else if (room.status === 'leaderboard') {
      if (isLast) {
        await finishRoom(roomId)
      } else {
        await advanceToQuestion(roomId, room.currentQuestion + 1)
        setCountdown(null)
      }
    }
  }

  async function handleStart() {
    await advanceToQuestion(roomId, 0)
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  if (!room || !quiz) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando sala...</div>
  }

  const currentQ = quiz.questions[room.currentQuestion]

  return (
    <main className="min-h-screen flex flex-col p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black">{quiz.title}</h1>
          <p className="text-gray-400 text-sm">{players.length} jugadores conectados</p>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-xl text-center">
          <p className="text-xs text-gray-400">Código</p>
          <p className="font-mono font-black text-2xl tracking-widest text-violet-400">{room.code}</p>
        </div>
      </div>

      {/* Sala de espera */}
      {room.status === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-gray-400 mb-2">Los alumnos entran en</p>
            <p className="text-2xl font-bold text-white break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/unirse</p>
            <p className="text-gray-400 mt-1">con el código:</p>
            <p className="font-mono font-black text-6xl tracking-widest text-violet-400 mt-2">{room.code}</p>
          </div>

          {players.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center max-w-lg">
              {players.map((p) => (
                <div key={p.id} className="bg-gray-800 rounded-full px-4 py-2 flex items-center gap-2">
                  <span>{p.emoji}</span>
                  <span className="font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={players.length === 0}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 transition-colors font-black text-2xl px-12 py-5 rounded-2xl"
          >
            ▶ Empezar ({players.length} listos)
          </button>
        </div>
      )}

      {/* Pregunta activa */}
      {room.status === 'question' && currentQ && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-gray-400 text-sm">Pregunta {room.currentQuestion + 1} de {quiz.questions.length}</span>
              {countdown !== null && (
                <span className={`font-black text-3xl ${countdown <= 5 ? 'text-red-400' : 'text-white'}`}>
                  ⏱ {countdown}s
                </span>
              )}
            </div>
            <h2 className="text-3xl font-black">{currentQ.text}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            {currentQ.options.map((opt, i) => (
              <div key={i} className={`${OPTION_COLORS[i]} rounded-2xl p-6 flex items-center gap-4`}>
                <span className="font-black text-2xl w-10 h-10 bg-black/20 rounded-full flex items-center justify-center flex-shrink-0">
                  {OPTION_LABELS[i]}
                </span>
                <span className="font-bold text-xl">{opt}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-sm">
              {players.filter((p) => p.lastAnswer).length} / {players.length} respondieron
            </p>
            <button
              onClick={handleShowAnswers}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Ver respuestas →
            </button>
          </div>
        </div>
      )}

      {/* Respuestas reveladas */}
      {room.status === 'answer' && currentQ && (
        <div className="flex-1 flex flex-col gap-6">
          <h2 className="text-2xl font-black text-center">{currentQ.text}</h2>
          <div className="grid grid-cols-2 gap-4">
            {currentQ.options.map((opt, i) => (
              <div
                key={i}
                className={`${OPTION_COLORS[i]} rounded-2xl p-5 flex items-center gap-3 transition-opacity ${
                  i !== currentQ.correctIndex ? 'opacity-40' : 'ring-4 ring-white'
                }`}
              >
                <span className="font-black text-xl w-9 h-9 bg-black/20 rounded-full flex items-center justify-center flex-shrink-0">
                  {OPTION_LABELS[i]}
                </span>
                <span className="font-bold text-lg">{opt}</span>
                {i === currentQ.correctIndex && <span className="ml-auto text-2xl">✓</span>}
              </div>
            ))}
          </div>

          <div className="bg-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-sm mb-3">Resultados de esta pregunta</p>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {sortedPlayers.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span>{p.emoji}</span>
                  <span className="flex-1 font-medium">{p.name}</span>
                  {p.lastAnswer && (
                    <span className={p.lastAnswer.correct ? 'text-green-400 font-bold' : 'text-red-400'}>
                      {p.lastAnswer.correct ? `+${p.lastAnswer.points}` : '✗'}
                    </span>
                  )}
                  <span className="text-gray-400 text-sm w-16 text-right">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            className="bg-violet-600 hover:bg-violet-500 transition-colors font-bold text-lg py-4 rounded-xl"
          >
            Ver ranking →
          </button>
        </div>
      )}

      {/* Leaderboard */}
      {(room.status === 'leaderboard' || room.status === 'finished') && (
        <div className="flex-1 flex flex-col gap-6">
          <h2 className="text-3xl font-black text-center">
            {room.status === 'finished' ? '🏆 Resultado final' : '📊 Ranking'}
          </h2>
          <div className="flex flex-col gap-3">
            {sortedPlayers.slice(0, 10).map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${
                  i === 0 ? 'bg-yellow-500 text-black' :
                  i === 1 ? 'bg-gray-400 text-black' :
                  i === 2 ? 'bg-orange-600' : 'bg-gray-800'
                }`}
              >
                <span className="font-black text-2xl w-8 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                <span className="text-2xl">{p.emoji}</span>
                <span className="font-bold text-lg flex-1">{p.name}</span>
                <span className="font-black text-xl">{p.score} pts</span>
              </div>
            ))}
          </div>

          {room.status === 'leaderboard' && (
            <button
              onClick={handleNext}
              className="bg-violet-600 hover:bg-violet-500 transition-colors font-bold text-lg py-4 rounded-xl"
            >
              {room.currentQuestion >= quiz.questions.length - 1 ? '🏁 Finalizar' : 'Siguiente pregunta →'}
            </button>
          )}

          {room.status === 'finished' && (
            <button
              onClick={async () => {
                const { createRoom } = await import('@/lib/rooms')
                const newRoomId = await createRoom(room.quizId, room.hostId)
                router.push(`/host/${newRoomId}`)
              }}
              className="bg-green-600 hover:bg-green-500 transition-colors font-bold text-lg py-4 rounded-xl"
            >
              🔄 Nueva partida
            </button>
          )}
        </div>
      )}
    </main>
  )
}
