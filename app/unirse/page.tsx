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
      <div className="w-full max-w-xs">

        {step === 'code' ? (
          <form onSubmit={handleCode} className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div className="sq-chip mb-4" style={{display:'inline-flex',color:'var(--sq-blue)'}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:'var(--sq-blue)',display:'inline-block'}}/>
                Unirse a partida
              </div>
              <h1 style={{fontSize:28,fontWeight:900,margin:0}}>Ingresá el código</h1>
            </div>

            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="sq-input"
              style={{fontSize:32,fontWeight:900,textAlign:'center',letterSpacing:'0.2em',fontFamily:'monospace'}}
            />

            {error && <p style={{color:'#F87171',fontSize:13,textAlign:'center',margin:0}}>{error}</p>}

            <button type="submit" disabled={loading || code.length < 4} className="sq-btn-primary">
              {loading ? 'Buscando...' : 'Entrar →'}
            </button>
          </form>

        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <div className="text-center mb-2">
              <h1 style={{fontSize:28,fontWeight:900,margin:0}}>¿Cómo te llamás?</h1>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={20}
              autoFocus
              className="sq-input"
              style={{textAlign:'center',fontSize:20,fontWeight:700}}
            />

            <div>
              <p style={{fontSize:12,color:'var(--sq-muted)',textAlign:'center',marginBottom:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>Elegí tu emoji</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8}}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    style={{
                      fontSize:22,
                      padding:'8px 4px',
                      borderRadius:12,
                      border: emoji === e ? '1.5px solid var(--sq-green)' : '0.5px solid var(--sq-border)',
                      background: emoji === e ? 'rgba(62,207,163,.15)' : 'var(--sq-subtle)',
                      cursor:'pointer',
                      transition:'all .1s'
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {error && <p style={{color:'#F87171',fontSize:13,textAlign:'center',margin:0}}>{error}</p>}

            <button type="submit" disabled={loading} className="sq-btn-primary">
              {loading ? 'Entrando...' : `${emoji} ¡Jugar!`}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
