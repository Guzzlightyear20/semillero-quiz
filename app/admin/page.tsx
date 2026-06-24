'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getQuizzesByHost, createRoom, deleteQuiz } from '@/lib/rooms'
import type { Quiz } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

function getTeacherCodes(): Record<string, string> {
  try {
    const raw = process.env.NEXT_PUBLIC_TEACHER_CODES
    if (raw) return JSON.parse(raw)
  } catch {}
  // fallback: single password mode
  return { [process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'semillero2025']: 'Profe' }
}

const TEACHER_CODES = getTeacherCodes()

function validateCode(code: string): { id: string; name: string } | null {
  const name = TEACHER_CODES[code.trim().toUpperCase()] ?? TEACHER_CODES[code.trim()]
  if (!name) return null
  return { id: code.trim().toUpperCase(), name }
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

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const result = validateCode(code)
    if (!result) return setError('Código incorrecto. Pedíselo a tu coordinador.')
    localStorage.setItem('teacher_session', JSON.stringify(result))
    setTeacher(result)
    loadQuizzes(result.id)
  }

  function handleLogout() {
    localStorage.removeItem('teacher_session')
    setTeacher(null)
    setQuizzes([])
    setCode('')
  }

  async function handleLaunch(quizId: string) {
    if (!teacher) return
    setLaunching(quizId)
    const roomId = await createRoom(quizId, teacher.id)
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
          <Image src="/logo.png" alt="Semillero Digital" width={180} height={70} style={{objectFit:'contain',marginBottom:16,filter:'brightness(0) invert(1)'}} priority />
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
      </div>
    </main>
  )

  return (
    <main className="sq-admin-layout">
      <div className="sq-admin-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Image src="/logo.png" alt="Semillero Digital" width={110} height={42} style={{objectFit:'contain',filter:'brightness(0) invert(1)'}} className="sq-admin-header-logo" />
          <div>
            <p style={{fontSize:11,color:'var(--sq-muted)',margin:'0 0 2px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>Panel de</p>
            <h1 style={{fontSize:18,fontWeight:900,margin:0}}>{teacher.name}</h1>
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
                  onClick={() => handleLaunch(q.id)}
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
    </main>
  )
}
