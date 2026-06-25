'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getQuizzesByHost, createRoom, deleteQuiz, validateTeacherCode, duplicateQuiz } from '@/lib/rooms'
import type { Quiz } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

function getFallbackCodes(): Record<string, string> {
  try {
    const raw = process.env.NEXT_PUBLIC_TEACHER_CODES
    if (raw) return JSON.parse(raw)
  } catch {}
  return { [process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'semillero2025']: 'Profe' }
}

export default function AdminPage() {
  const router = useRouter()
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [teamModal, setTeamModal] = useState<{ quizId: string } | null>(null)
  const [teamsMode, setTeamsMode] = useState(false)
  const [teamNames, setTeamNames] = useState(['', '', ''])

  function addTeam() { setTeamNames(t => [...t, '']) }
  function removeTeam(i: number) { setTeamNames(t => t.filter((_, idx) => idx !== i)) }
  function updateTeam(i: number, v: string) { setTeamNames(t => t.map((x, idx) => idx === i ? v : x)) }

  useEffect(() => {
    const stored = localStorage.getItem('teacher_session')
    if (stored) {
      try {
        const t = JSON.parse(stored)
        setTeacher(t)
        loadQuizzes(t.id)
      } catch {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  async function loadQuizzes(teacherId: string) {
    const qs = await getQuizzesByHost(teacherId)
    setQuizzes(qs)
    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const upperCode = code.trim().toUpperCase()

    // 1. Check Firestore (managed by coordinator)
    let result = await validateTeacherCode(upperCode)

    // 2. Fallback to env var codes (legacy / initial setup)
    if (!result) {
      const fallback = getFallbackCodes()
      const name = fallback[upperCode] ?? fallback[code.trim()]
      if (name) result = { id: upperCode, name, code: upperCode, createdAt: 0 }
    }

    if (!result) return setError('Código incorrecto. Pedíselo a tu coordinador.')
    const session = { id: result.id, name: result.name }
    localStorage.setItem('teacher_session', JSON.stringify(session))
    setTeacher(session)
    loadQuizzes(result.id)
  }

  function handleLogout() {
    localStorage.removeItem('teacher_session')
    setTeacher(null)
    setQuizzes([])
    setCode('')
  }

  async function handleDuplicate(quizId: string) {
    if (!teacher) return
    await duplicateQuiz(quizId, teacher.id)
    await loadQuizzes(teacher.id)
  }

  function openLaunch(quizId: string) {
    setTeamModal({ quizId })
    setTeamsMode(false)
    setTeamNames(['', '', ''])
  }

  async function confirmLaunch() {
    if (!teacher || !teamModal) return
    setLaunching(teamModal.quizId)
    setTeamModal(null)
    const teams = teamsMode ? teamNames.filter(t => t.trim()) : []
    const roomId = await createRoom(teamModal.quizId, teacher.id, teams)
    router.push(`/host/${roomId}`)
  }

  async function handleDelete(quizId: string, title: string) {
    if (!confirm(`¿Eliminás "${title}"? Esta acción no se puede deshacer.`)) return
    setDeleting(quizId)
    await deleteQuiz(quizId)
    setQuizzes(qs => qs.filter(q => q.id !== quizId))
    setDeleting(null)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{color:'var(--sq-muted)'}}>Cargando...</div>
  )

  if (!teacher) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs flex flex-col gap-5">
        <div className="text-center flex flex-col items-center">
          <Image src="/logo.png" alt="Semillero Digital" width={180} height={70} style={{objectFit:'contain',marginBottom:16,filter:'none'}} priority />
          <h1 style={{fontSize:24,fontWeight:900,margin:'0 0 4px'}}>Panel del profe</h1>
          <p style={{color:'var(--sq-muted)',fontSize:14,margin:0}}>Ingresá tu código personal</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Tu código"
            autoFocus
            autoCapitalize="characters"
            className="sq-input"
            style={{textAlign:'center',fontSize:20,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase'}}
          />
          {error && <p style={{color:'#F87171',fontSize:13,textAlign:'center',margin:0}}>{error}</p>}
          <button type="submit" className="sq-btn-primary">Entrar →</button>
        </form>
        <Link href="/admin/coordinador" style={{textAlign:'center',color:'var(--sq-muted)',fontSize:12,textDecoration:'none',marginTop:4}}>
          ⚙️ Acceso coordinador
        </Link>
      </div>
    </main>
  )

  return (
    <main className="sq-admin-layout">
      <div className="sq-admin-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Image src="/logo.png" alt="Semillero Digital" width={110} height={42} style={{objectFit:'contain',filter:'none'}} className="sq-admin-header-logo" />
          <div>
            <p style={{fontSize:11,color:'var(--sq-muted)',margin:'0 0 2px',fontWeight:500,textTransform:'uppercase',letterSpacing:'.05em'}}>Panel de</p>
            <h1 style={{fontSize:17,fontWeight:700,margin:0,WebkitFontSmoothing:'subpixel-antialiased'}}>{teacher.name}</h1>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <Link
            href="/admin/crear-quiz"
            style={{background:'var(--sq-green)',color:'var(--sq-green-dark)',fontWeight:700,fontSize:13,padding:'8px 14px',borderRadius:10,textDecoration:'none',display:'inline-block',whiteSpace:'nowrap'}}
          >
            + Nuevo
          </Link>
          <button
            onClick={handleLogout}
            style={{background:'var(--sq-subtle)',border:'0.5px solid var(--sq-border)',color:'var(--sq-muted)',fontSize:13,padding:'8px 14px',borderRadius:10,cursor:'pointer',whiteSpace:'nowrap'}}
          >
            Salir
          </button>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--sq-muted)'}}>
          <p style={{fontSize:40,margin:'0 0 12px'}}>📝</p>
          <p style={{margin:'0 0 8px'}}>No tenés quizzes todavía.</p>
          <Link href="/admin/crear-quiz" style={{color:'var(--sq-green)',textDecoration:'none',fontWeight:600}}>
            Creá el primero →
          </Link>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {quizzes.map((q) => (
            <div key={q.id} className="sq-card" style={{padding:'16px 20px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:700,fontSize:16,margin:'0 0 3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{q.title}</p>
                  <p style={{color:'var(--sq-muted)',fontSize:13,margin:0}}>{q.questions.length} preguntas</p>
                </div>
                <button
                  onClick={() => openLaunch(q.id)}
                  disabled={!!launching}
                  style={{background:'var(--sq-green)',color:'var(--sq-green-dark)',fontWeight:800,fontSize:14,padding:'10px 18px',borderRadius:10,border:'none',cursor:'pointer',opacity:launching===q.id?.35:1,whiteSpace:'nowrap',flexShrink:0}}
                >
                  {launching === q.id ? '...' : '▶ Lanzar'}
                </button>
              </div>
              <div className="sq-quiz-actions" style={{display:'flex',gap:8,marginTop:12,borderTop:'0.5px solid var(--sq-border)',paddingTop:12}}>
                <Link
                  href={`/admin/crear-quiz?id=${q.id}`}
                  style={{flex:1,textAlign:'center',background:'var(--sq-subtle)',border:'0.5px solid var(--sq-border)',color:'#fff',fontWeight:600,fontSize:13,padding:'10px 8px',borderRadius:8,textDecoration:'none',display:'block'}}
                >
                  ✏️ Editar
                </Link>
                <button
                  onClick={() => handleDuplicate(q.id)}
                  style={{flex:1,background:'rgba(91,189,232,.1)',border:'0.5px solid rgba(91,189,232,.3)',color:'var(--sq-blue)',fontWeight:600,fontSize:13,padding:'10px 8px',borderRadius:8,cursor:'pointer'}}
                >
                  📋 Duplicar
                </button>
                <button
                  onClick={() => handleDelete(q.id, q.title)}
                  disabled={deleting === q.id}
                  style={{flex:1,background:'rgba(248,113,113,.1)',border:'0.5px solid rgba(248,113,113,.3)',color:'#F87171',fontWeight:600,fontSize:13,padding:'10px 8px',borderRadius:8,cursor:'pointer'}}
                >
                  {deleting === q.id ? '...' : '🗑️ Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de células */}
      {teamModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,zIndex:100}}>
          <div className="sq-card" style={{width:'100%',maxWidth:400,padding:24,display:'flex',flexDirection:'column',gap:16}}>
            <h2 style={{fontSize:20,fontWeight:900,margin:0}}>Configurar partida</h2>

            {/* Toggle células */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--sq-subtle)',borderRadius:12,padding:'12px 16px'}}>
              <div>
                <p style={{fontWeight:700,fontSize:15,margin:'0 0 2px'}}>Modo células</p>
                <p style={{color:'var(--sq-muted)',fontSize:12,margin:0}}>Los alumnos compiten en equipos</p>
              </div>
              <button
                onClick={() => setTeamsMode(m => !m)}
                style={{
                  width:48,height:26,borderRadius:99,border:'none',cursor:'pointer',
                  background: teamsMode ? 'var(--sq-green)' : 'rgba(255,255,255,.2)',
                  transition:'background .2s',position:'relative',flexShrink:0
                }}
              >
                <span style={{
                  position:'absolute',top:3,left: teamsMode ? 25 : 3,
                  width:20,height:20,borderRadius:'50%',background:'#fff',
                  transition:'left .2s',display:'block'
                }}/>
              </button>
            </div>

            {/* Nombres de células */}
            {teamsMode && (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <p style={{fontSize:12,color:'var(--sq-muted)',fontWeight:600,margin:0,textTransform:'uppercase',letterSpacing:'.05em'}}>Nombre de cada célula</p>
                {teamNames.map((t, i) => (
                  <div key={i} style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input
                      value={t}
                      onChange={e => updateTeam(i, e.target.value)}
                      placeholder={`Célula ${i+1} (ej: 1A)`}
                      className="sq-input"
                      style={{fontSize:14,flex:1}}
                    />
                    {teamNames.length > 2 && (
                      <button onClick={() => removeTeam(i)} style={{background:'none',border:'none',color:'#F87171',cursor:'pointer',fontSize:18,padding:'0 4px'}}>×</button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addTeam}
                  style={{background:'var(--sq-subtle)',border:'0.5px dashed var(--sq-border)',color:'var(--sq-muted)',fontSize:13,padding:'8px',borderRadius:8,cursor:'pointer'}}
                >
                  + Agregar célula
                </button>
              </div>
            )}

            <div style={{display:'flex',gap:10}}>
              <button
                onClick={() => setTeamModal(null)}
                style={{flex:1,background:'var(--sq-subtle)',border:'0.5px solid var(--sq-border)',color:'var(--sq-muted)',fontWeight:600,fontSize:14,padding:'12px',borderRadius:12,cursor:'pointer'}}
              >
                Cancelar
              </button>
              <button
                onClick={confirmLaunch}
                disabled={teamsMode && teamNames.filter(t=>t.trim()).length < 2}
                className="sq-btn-primary"
                style={{flex:2,fontSize:15}}
              >
                ▶ Lanzar partida
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
