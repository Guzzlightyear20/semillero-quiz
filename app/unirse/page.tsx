'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRoomByCode, joinRoom } from '@/lib/rooms'

const EMOJIS = ['🐶','🐱','🐸','🦊','🐼','🦁','🐯','🐻','🐨','🦄','🐙','🦋','🐬','🦖','🚀','⭐','🌈','🎸']

export default function UnirsePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🐶')
  const [step, setStep] = useState<'code' | 'profile'>('code')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [roomId, setRoomId] = useState('')

  async function handleCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const room = await getRoomByCode(code.trim())
    setLoading(false)
    if (!room) return setError('Sala no encontrada. Revisá el código.')
    if (room.data.status === 'finished') return setError('Esta partida ya terminó.')
    setRoomId(room.id)
    setStep('profile')
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Poné tu nombre.')
    setLoading(true)
    const playerId = crypto.randomUUID()
    localStorage.setItem(`player_${roomId}`, playerId)
    await joinRoom(roomId, { id: playerId, name: name.trim(), emoji })
    router.push(`/sala/${roomId}/jugar`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {step === 'code' ? (
          <form onSubmit={handleCode} className="flex flex-col gap-4">
            <h1 className="text-3xl font-black text-center mb-2">Ingresá el código</h1>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="bg-gray-800 rounded-xl px-4 py-4 text-3xl font-mono tracking-widest text-center uppercase outline-none focus:ring-2 focus:ring-violet-500"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-colors font-bold text-lg py-4 rounded-xl"
            >
              {loading ? 'Buscando...' : 'Entrar →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <h1 className="text-3xl font-black text-center mb-2">¿Cómo te llamás?</h1>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={20}
              autoFocus
              className="bg-gray-800 rounded-xl px-4 py-4 text-xl text-center outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div>
              <p className="text-gray-400 text-sm mb-2 text-center">Elegí tu emoji</p>
              <div className="grid grid-cols-6 gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`text-2xl p-2 rounded-xl transition-colors ${emoji === e ? 'bg-violet-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-colors font-bold text-lg py-4 rounded-xl"
            >
              {loading ? 'Entrando...' : `${emoji} ¡Jugar!`}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
