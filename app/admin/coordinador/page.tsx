'use client'
import { useEffect, useState } from 'react'
import { getTeachers, createTeacher, deleteTeacher, updateTeacherName, getTeacherSettings, updateTeacherSettings, Teacher } from '@/lib/rooms'
import Link from 'next/link'
import Image from 'next/image'

const MASTER_CODE = process.env.NEXT_PUBLIC_MASTER_CODE ?? 'SEMILLERO-ADMIN'

export default function CoordinadorPage() {
  const [authed, setAuthed] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [openAnswerEnabled, setOpenAnswerEnabled] = useState(false)
  const GLOBAL_TEACHER_ID = 'semillero-global'
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('coord_authed') === 'true') {
      setAuthed(true)
      loadTeachers()
      getTeacherSettings(GLOBAL_TEACHER_ID).then(s => setOpenAnswerEnabled(s.openAnswerEnabled))
    }
  }, [])

  async function loadTeachers() {
    setLoading(true)
    const list = await getTeachers()
    setTeachers(list.sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false)
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim().toUpperCase() === MASTER_CODE.toUpperCase()) {
      sessionStorage.setItem('coord_authed', 'true')
      setAuthed(true)
      loadTeachers()
    } else {
      setError('Código incorrecto.')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    if (!newName.trim()) return setCreateError('Escribí el nombre del profe.')
    if (!newCode.trim()) return setCreateError('Escribí el código.')
    if (newCode.trim().length < 4) return setCreateError('El código debe tener al menos 4 caracteres.')
    if (teachers.find(t => t.id === newCode.trim().toUpperCase())) return setCreateError('Ese código ya existe.')
    setCreating(true)
    await createTeacher(newName, newCode)
    setNewName('')
    setNewCode('')
    await loadTeachers()
    setCreating(false)
  }

  async function handleEditName(t: Teacher) {
    if (!editName.trim() || editName.trim() === t.name) return setEditing(null)
    await updateTeacherName(t.id, editName.trim())
    setTeachers(ts => ts.map(x => x.id === t.id ? { ...x, name: editName.trim() } : x))
    setEditing(null)
  }

  async function handleDelete(t: Teacher) {
    if (!confirm(`¿Eliminás a ${t.name}? Perderá acceso pero sus quizzes se mantienen.`)) return
    setDeleting(t.id)
    await deleteTeacher(t.id)
    setTeachers(ts => ts.filter(x => x.id !== t.id))
    setDeleting(null)
  }

  if (!authed) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs flex flex-col gap-5">
        <div className="text-center flex flex-col items-center">
          <Image src="/logo.png" alt="Semillero Digital" width={180} height={70} style={{objectFit:'contain',marginBottom:16,filter:'none'}} priority />
          <h1 style={{fontSize:22,fontWeight:900,margin:'0 0 4px'}}>Panel coordinador</h1>
          <p style={{color:'var(--sq-muted)',fontSize:14,margin:0}}>Ingresá el código maestro</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Código maestro"
            autoFocus
            autoCapitalize="characters"
            className="sq-input"
            style={{textAlign:'center',fontSize:18,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase'}}
          />
          {error && <p style={{color:'#F87171',fontSize:13,textAlign:'center',margin:0}}>{error}</p>}
          <button type="submit" className="sq-btn-primary">Entrar →</button>
        </form>
        <Link href="/admin" style={{textAlign:'center',color:'var(--sq-muted)',fontSize:13,textDecoration:'none'}}>
          ← Volver al panel de profes
        </Link>
      </div>
    </main>
  )

  return (
    <main className="sq-admin-layout">
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Image src="/logo.png" alt="Semillero Digital" width={110} height={42} style={{objectFit:'contain',filter:'none'}} />
          <div>
            <p style={{fontSize:11,color:'var(--sq-muted)',margin:'0 0 2px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>Panel</p>
            <h1 style={{fontSize:18,fontWeight:900,margin:0}}>Coordinador</h1>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link href="/admin" style={{background:'var(--sq-subtle)',border:'0.5px solid var(--sq-border)',color:'var(--sq-muted)',fontSize:13,padding:'8px 14px',borderRadius:10,textDecoration:'none'}}>
            Panel profes
          </Link>
          <button
            onClick={() => { sessionStorage.removeItem('coord_authed'); setAuthed(false) }}
            style={{background:'var(--sq-subtle)',border:'0.5px solid var(--sq-border)',color:'var(--sq-muted)',fontSize:13,padding:'8px 14px',borderRadius:10,cursor:'pointer'}}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Agregar profe */}
      <div className="sq-card" style={{padding:20,marginBottom:20}}>
        <p style={{fontSize:13,fontWeight:700,margin:'0 0 14px',color:'var(--sq-green)',textTransform:'uppercase',letterSpacing:'.05em'}}>+ Agregar profe</p>
        <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nombre (ej: Profe García)"
              className="sq-input"
              style={{fontSize:14}}
            />
            <input
              value={newCode}
              onChange={e => setNewCode(e.target.value.toUpperCase())}
              placeholder="Código (ej: GARCIA2025)"
              className="sq-input"
              style={{fontSize:14,fontFamily:'monospace',letterSpacing:'.05em'}}
              maxLength={20}
            />
          </div>
          {createError && <p style={{color:'#F87171',fontSize:13,margin:0}}>{createError}</p>}
          <button type="submit" disabled={creating} className="sq-btn-primary" style={{fontSize:14}}>
            {creating ? 'Creando...' : 'Crear profe'}
          </button>
        </form>
      </div>

      {/* Configuración global */}
      <div className="sq-card" style={{padding:16,marginBottom:20}}>
        <p style={{fontSize:13,fontWeight:700,margin:'0 0 14px',color:'var(--sq-orange)',textTransform:'uppercase',letterSpacing:'.05em'}}>⚙️ Configuración global</p>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <p style={{fontWeight:700,fontSize:14,margin:'0 0 2px'}}>Respuesta abierta</p>
            <p style={{color:'var(--sq-muted)',fontSize:12,margin:0}}>Permite que los profes usen preguntas de texto libre</p>
          </div>
          <button
            onClick={async () => {
              const next = !openAnswerEnabled
              setOpenAnswerEnabled(next)
              await updateTeacherSettings(GLOBAL_TEACHER_ID, { openAnswerEnabled: next })
            }}
            style={{ width:48,height:26,borderRadius:99,border:'none',cursor:'pointer', background: openAnswerEnabled ? 'var(--sq-green)' : 'rgba(255,255,255,.2)', transition:'background .2s',position:'relative',flexShrink:0 }}
          >
            <span style={{ position:'absolute',top:3,left: openAnswerEnabled ? 25 : 3, width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .2s',display:'block' }}/>
          </button>
        </div>
      </div>

      {/* Lista de profes */}
      <p style={{fontSize:13,fontWeight:700,color:'var(--sq-muted)',margin:'0 0 10px',textTransform:'uppercase',letterSpacing:'.05em'}}>
        Profes activos ({teachers.length})
      </p>

      {loading ? (
        <p style={{color:'var(--sq-muted)',textAlign:'center',padding:'40px 0'}}>Cargando...</p>
      ) : teachers.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--sq-muted)'}}>
          <p style={{fontSize:32,margin:'0 0 8px'}}>👨‍🏫</p>
          <p>No hay profes todavía. Agregá el primero arriba.</p>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {teachers.map(t => (
            <div key={t.id} className="sq-card" style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                {editing === t.id ? (
                  <div style={{display:'flex',gap:6}}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditName(t); if (e.key === 'Escape') setEditing(null) }}
                      autoFocus
                      className="sq-input"
                      style={{fontSize:14,flex:1}}
                    />
                    <button onClick={() => handleEditName(t)} style={{background:'var(--sq-green)',border:'none',color:'#0D4A38',fontWeight:700,fontSize:12,padding:'6px 10px',borderRadius:8,cursor:'pointer'}}>✓</button>
                    <button onClick={() => setEditing(null)} style={{background:'var(--sq-subtle)',border:'0.5px solid var(--sq-border)',color:'var(--sq-muted)',fontSize:12,padding:'6px 10px',borderRadius:8,cursor:'pointer'}}>✗</button>
                  </div>
                ) : (
                  <>
                    <p style={{fontWeight:700,fontSize:15,margin:'0 0 3px'}}>{t.name}</p>
                    <p style={{fontFamily:'monospace',fontSize:13,color:'var(--sq-green)',margin:0,letterSpacing:'.05em'}}>{t.code}</p>
                  </>
                )}
              </div>
              {editing !== t.id && (
                <div style={{display:'flex',gap:6}}>
                  <button
                    onClick={() => { setEditing(t.id); setEditName(t.name) }}
                    style={{background:'rgba(91,189,232,.1)',border:'0.5px solid rgba(91,189,232,.3)',color:'var(--sq-blue)',fontWeight:600,fontSize:12,padding:'7px 12px',borderRadius:8,cursor:'pointer',flexShrink:0}}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={deleting === t.id}
                    style={{background:'rgba(248,113,113,.1)',border:'0.5px solid rgba(248,113,113,.3)',color:'#F87171',fontWeight:600,fontSize:12,padding:'7px 12px',borderRadius:8,cursor:'pointer',flexShrink:0}}
                  >
                    {deleting === t.id ? '...' : '🗑️'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
