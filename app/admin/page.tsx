'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getQuizzesByHost, createRoom } from '@/lib/rooms'
import type { Quiz } from '@/types'
import Link from 'next/link'

const ADMIN_ID = 'semillero-admin'
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'semillero2025'

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState<string | null>(null)

  useEffect(() => {
    const ok = localStorage.getItem('admin_authed') === 'true'
    setAuthed(ok)
    if (ok) loadQuizzes()
    else setLoading(false)
  }, [])

  async function loadQuizzes() {
    const qs = await getQuizzesByHost(ADMIN_ID)
    setQuizzes(qs)
    setLoading(false)
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_authed', 'true')
      setAuthed(true)
      loadQuizzes()
    } else {
      setError('Contraseña incorrecta.')
    }
  }

  function handleLogout() {
    localStorage.removeItem('admin_authed')
    setAuthed(false)
    setQuizzes([])
  }

  async function handleLaunch(quizId: string) {
    setLaunching(quizId)
    const roomId = await createRoom(quizId, ADMIN_ID)
    router.push(`/host/${roomId}`)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <div className="text-5xl mb-3">👨‍🏫</div>
          <h1 className="text-3xl font-black mb-1">Panel del profe</h1>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-3 w-full max-w-xs">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoFocus
            className="bg-gray-800 rounded-xl px-4 py-4 text-lg text-center outline-none focus:ring-2 focus:ring-violet-500"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="bg-violet-600 hover:bg-violet-500 transition-colors font-bold text-lg py-4 rounded-xl"
          >
            Entrar →
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black">Mis quizzes</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/crear-quiz"
            className="bg-violet-600 hover:bg-violet-500 transition-colors font-bold px-4 py-2 rounded-xl text-sm"
          >
            + Nuevo quiz
          </Link>
          <button
            onClick={handleLogout}
            className="bg-gray-800 hover:bg-gray-700 transition-colors px-4 py-2 rounded-xl text-sm"
          >
            Salir
          </button>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">📝</p>
          <p>No tenés quizzes todavía.</p>
          <Link href="/admin/crear-quiz" className="text-violet-400 hover:underline mt-1 inline-block">
            Creá el primero →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quizzes.map((q) => (
            <div key={q.id} className="bg-gray-800 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-lg">{q.title}</p>
                <p className="text-gray-400 text-sm">{q.questions.length} preguntas</p>
              </div>
              <button
                onClick={() => handleLaunch(q.id)}
                disabled={launching === q.id}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-40 transition-colors font-bold px-5 py-3 rounded-xl whitespace-nowrap"
              >
                {launching === q.id ? '...' : '▶ Lanzar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
