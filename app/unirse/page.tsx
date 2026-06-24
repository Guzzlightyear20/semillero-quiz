'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRoomByCode, joinRoom } from '@/lib/rooms'
import type { Room } from '@/types'

const EMOJIS = ['🐶','🐱','🐸','🦊','🐼','🦁','🐯','🐻','🐨','🦄','🐙','🦋','🐬','🦖','🚀','⭐','🌈','🎸']
const TEAM_COLORS = ['var(--sq-green)','var(--sq-orange)','var(--sq-blue)','var(--sq-purple)','#F87171','#FBBF24']
const TEAM_BG = ['rgba(62,207,163,.15)','rgba(245,146,30,.15)','rgba(91,189,232,.15)','rgba(192,132,252,.15)','rgba(248,113,113,.15)','rgba(251,191,36,.15)']

export default function UnirsePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🐶')
  const [team, setTeam] = useState('')
  const [step, setStep] = useState<'code' | 'team' | 'profile'>('code')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [roomData, setRoomData] = useState<Room | null>(null)

  async function handleCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const room = await getRoomByCode(code.trim())
    setLoading(false)
    if (!room) return setError('Sala no encontrada. Revisá el código.')
    if (room.data.status === 'finished') return setError('Esta partida ya terminó.')
    setRoomId(room.id)
    setRoomData(room.data)
    setStep(room.data.teamsMode && room.data.teams?.length ? 'team' : 'profile')
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Poné tu nombre.')
    setLoading(true)
    const playerId = crypto.randomUUID()
    localStorage.setItem(`player_${roomId}`, playerId)
    await joinRoom(roomId, { id: playerId, name: name.trim(), emoji, team: team || undefined })
    router.push(`/sala/${roomId}/jugar`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xs">

        {/* Paso 1: código */}
        {step === 'code' && (
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
              onChange={e => setCode(e.target.value.toUpperCase())}
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
        )}

        {/* Paso 2: elegir célula (solo si teamsMode) */}
        {step === 'team' && roomData?.teams && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h1 style={{fontSize:26,fontWeight:900,margin:'0 0 6px'}}>¿A qué célula pertenecés?</h1>
              <p style={{color:'var(--sq-muted)',fontSize:14,margin:0}}>Elegí tu equipo para esta partida</p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {roomData.teams.map((t, i) => (
                <button
                  key={t}
                  onClick={() => { setTeam(t); setStep('profile') }}
                  style={{
                    background: TEAM_BG[i % TEAM_BG.length],
                    border: `1.5px solid ${TEAM_COLORS[i % TEAM_COLORS.length]}`,
                    borderRadius:16,padding:'18px',
                    fontSize:20,fontWeight:800,
                    color: TEAM_COLORS[i % TEAM_COLORS.length],
                    cursor:'pointer',transition:'transform .1s'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paso 3: nombre y emoji */}
        {step === 'profile' && (
          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <div className="text-center mb-2">
              {team && (
                <div className="sq-chip mb-3" style={{display:'inline-flex',color:'var(--sq-green)'}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:'var(--sq-green)',display:'inline-block'}}/>
                  Célula {team}
                </div>
              )}
              <h1 style={{fontSize:28,fontWeight:900,margin:0}}>¿Cómo te llamás?</h1>
            </div>

            <input
              value={name}
              onChange={e => setName(e.target.value)}
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
                      fontSize:22,padding:'8px 4px',borderRadius:12,
                      border: emoji===e ? '1.5px solid var(--sq-green)' : '0.5px solid var(--sq-border)',
                      background: emoji===e ? 'rgba(62,207,163,.15)' : 'var(--sq-subtle)',
                      cursor:'pointer',transition:'all .1s'
                    }}
                  >{e}</button>
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
