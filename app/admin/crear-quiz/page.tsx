'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createQuiz, updateQuiz, getQuizById } from '@/lib/rooms'
import { uploadQuizImage } from '@/lib/storage'
import type { Question } from '@/types'
import Image from 'next/image'

function getTeacherId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const s = localStorage.getItem('teacher_session')
    if (s) return JSON.parse(s).id
  } catch {}
  return 'semillero-admin'
}

const ANS_COLORS = ['#E84530', '#3B82F6', '#F5921E', '#3ECFA3']
const ANS_BG = ['rgba(232,69,48,.25)', 'rgba(59,130,246,.25)', 'rgba(245,146,30,.25)', 'rgba(62,207,163,.25)']
const ANS_LABELS = ['A', 'B', 'C', 'D']
const ANS_SHAPES = ['▲', '◆', '●', '■']

function emptyQuestion(type: Question['type'] = 'quiz'): Question {
  if (type === 'truefalse') return { text: '', type: 'truefalse', options: ['Verdadero', 'Falso', '', ''], correctIndex: 0, timeLimit: 20 }
  if (type === 'wordcloud') return { text: '', type: 'wordcloud', options: ['', '', '', ''], correctIndex: 0, timeLimit: 30 }
  if (type === 'sort') return { text: '', type: 'sort', options: ['', '', '', ''], correctIndex: 0, timeLimit: 40 }
  return { text: '', type: 'quiz', options: ['', '', '', ''], correctIndex: 0, timeLimit: 20 }
}

const QUESTION_TYPES = [
  { type: 'quiz' as const, label: '🔤 Quiz', desc: '4 opciones' },
  { type: 'truefalse' as const, label: '✅ V / F', desc: 'Verdadero o Falso' },
  { type: 'wordcloud' as const, label: '☁️ Nube', desc: 'Palabra libre' },
  { type: 'sort' as const, label: '🔢 Ordenar', desc: 'Secuencia correcta' },
]

function EditorQuiz() {
  const router = useRouter()
  const params = useSearchParams()
  const editId = params.get('id')
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])
  const [active, setActive] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!editId)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!localStorage.getItem('teacher_session')) router.push('/admin')
  }, [router])

  useEffect(() => {
    if (!editId) return
    getQuizById(editId).then((quiz) => {
      if (quiz) {
        setTitle(quiz.title)
        setQuestions(quiz.questions)
      }
      setLoading(false)
    })
  }, [editId])

  const q = questions[active]

  function updateQ(field: keyof Question, value: unknown) {
    setQuestions(qs => qs.map((item, i) => i === active ? { ...item, [field]: value } : item))
  }

  function updateOption(oi: number, value: string) {
    setQuestions(qs => qs.map((item, i) => {
      if (i !== active) return item
      const opts = [...item.options] as Question['options']
      opts[oi] = value
      return { ...item, options: opts }
    }))
  }

  function addQuestion(type: Question['type'] = 'quiz') {
    setQuestions(qs => {
      const next = [...qs, emptyQuestion(type)]
      setTimeout(() => setActive(next.length - 1), 0)
      return next
    })
  }

  function duplicateQuestion(i: number) {
    setQuestions(qs => {
      const copy = { ...qs[i], options: [...qs[i].options] as Question['options'] }
      const next = [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)]
      setTimeout(() => setActive(i + 1), 0)
      return next
    })
  }

  function moveQuestion(i: number, dir: -1 | 1) {
    const j = i + dir
    setQuestions(qs => {
      if (j < 0 || j >= qs.length) return qs
      const next = [...qs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setActive(j)
  }

  function changeType(type: Question['type']) {
    const base = emptyQuestion(type)
    setQuestions(qs => qs.map((item, i) => i !== active ? item : {
      ...base,
      text: item.text,
      imageUrl: item.imageUrl,
      timeLimit: item.timeLimit,
    }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadQuizImage(file)
      updateQ('imageUrl', url)
    } catch {
      alert('Error al subir la imagen. Intentá de nuevo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeQuestion(i: number) {
    if (questions.length === 1) return
    const next = questions.filter((_, idx) => idx !== i)
    setQuestions(next)
    setActive(Math.min(active, next.length - 1))
  }

  async function handleSave() {
    if (!title.trim()) return alert('Poné un título al quiz.')

    // Encontrar la primera pregunta incompleta y navegar a ella
    const invalidIdx = questions.findIndex(q =>
      q.type === 'wordcloud' ? !q.text.trim() : !q.text.trim() || q.options.some(o => !o.trim())
    )
    if (invalidIdx !== -1) {
      setActive(invalidIdx)
      alert(`La pregunta ${invalidIdx + 1} está incompleta. Completá el texto y todas las opciones.`)
      return
    }

    setSaving(true)
    try {
      const teacherId = getTeacherId()
      if (editId) {
        await updateQuiz(editId, title.trim(), questions)
      } else {
        await createQuiz(title.trim(), questions, teacherId)
      }
      router.push('/admin')
    } catch (err) {
      console.error(err)
      alert('Error al guardar. Revisá tu conexión y volvé a intentar.')
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sq-muted)' }}>
      Cargando quiz...
    </div>
  )

  return (
    <div className="sq-editor-layout">

      {/* SIDEBAR */}
      <aside className="sq-editor-sidebar">
        <div style={{ padding: '12px', borderBottom: '0.5px solid var(--sq-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Image src="/logo.png" alt="Semillero Digital" width={130} height={50} style={{ objectFit: 'contain', filter: 'none' }} className="sq-editor-sidebar-logo" />
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título del quiz"
            style={{ background: 'var(--sq-subtle)', border: '0.5px solid var(--sq-border)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, fontWeight: 700, width: '100%', outline: 'none', boxSizing: 'border-box' as const }}
          />
        </div>

        <div className="sq-editor-sidebar-list">
          {questions.map((q, i) => (
            <div
              key={i}
              onClick={() => setActive(i)}
              className="sq-editor-sidebar-item"
              style={{ background: active === i ? 'rgba(62,207,163,.12)' : 'var(--sq-subtle)', border: `1px solid ${active === i ? 'var(--sq-green)' : 'var(--sq-border)'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8 }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: active === i ? 'var(--sq-green)' : 'var(--sq-muted)', minWidth: 16, paddingTop: 1 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text || 'Sin pregunta'}</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--sq-muted)' }}>{q.timeLimit}s · {q.type === 'truefalse' ? 'V/F' : q.type === 'wordcloud' ? '☁️' : 'Quiz'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => moveQuestion(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? 'rgba(255,255,255,.15)' : 'var(--sq-muted)', cursor: i === 0 ? 'default' : 'pointer', fontSize: 10, padding: '1px 3px', lineHeight: 1 }}>▲</button>
                <button onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1} style={{ background: 'none', border: 'none', color: i === questions.length - 1 ? 'rgba(255,255,255,.15)' : 'var(--sq-muted)', cursor: i === questions.length - 1 ? 'default' : 'pointer', fontSize: 10, padding: '1px 3px', lineHeight: 1 }}>▼</button>
                <button onClick={() => duplicateQuestion(i)} style={{ background: 'none', border: 'none', color: 'var(--sq-muted)', cursor: 'pointer', fontSize: 10, padding: '1px 3px', lineHeight: 1 }}>⧉</button>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(i)} style={{ background: 'none', border: 'none', color: 'var(--sq-muted)', cursor: 'pointer', fontSize: 12, padding: '1px 3px', lineHeight: 1 }}>×</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 10, borderTop: '0.5px solid var(--sq-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {QUESTION_TYPES.map(({ type, label }) => (
            <button key={type} onClick={() => addQuestion(type)} style={{ width: '100%', background: type === 'quiz' ? 'var(--sq-green)' : type === 'truefalse' ? 'rgba(62,207,163,.2)' : 'rgba(92,107,192,.2)', border: `0.5px solid ${type === 'quiz' ? 'transparent' : 'var(--sq-border)'}`, color: type === 'quiz' ? '#0D4A38' : '#fff', fontWeight: 700, fontSize: 12, padding: '8px', borderRadius: 8, cursor: 'pointer' }}>
              + {label}
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN EDITOR */}
      <main className="sq-editor-main">

        {/* Top bar */}
        <div className="sq-editor-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--sq-border)', background: '#0A0C0F' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', color: 'var(--sq-muted)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            ← Volver
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sq-muted)' }}>
            {editId ? '✏️ Editando quiz' : 'Pregunta'} {active + 1} de {questions.length}
          </span>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            style={{
              background: saving || !title.trim() ? 'rgba(62,207,163,.3)' : 'var(--sq-green)',
              color: '#0D4A38', fontWeight: 800, fontSize: 14,
              padding: '8px 20px', borderRadius: 10, border: 'none',
              cursor: saving || !title.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Guardando...' : editId ? `💾 Guardar (${questions.length}p)` : `💾 Guardar (${questions.length}p)`}
          </button>
        </div>

        {/* Question area */}
        <div className="sq-editor-question-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Tipo de pregunta */}
          <div style={{ display: 'flex', gap: 8 }}>
            {QUESTION_TYPES.map(({ type, label, desc }) => (
              <button
                key={type}
                onClick={() => changeType(type)}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${(q.type ?? 'quiz') === type ? 'var(--sq-green)' : 'var(--sq-border)'}`,
                  background: (q.type ?? 'quiz') === type ? 'rgba(62,207,163,.12)' : 'var(--sq-subtle)',
                  color: '#fff', textAlign: 'center'
                }}
              >
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{label}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--sq-muted)' }}>{desc}</p>
              </button>
            ))}
          </div>

          {/* Question text */}
          <div style={{
            background: 'rgba(255,255,255,.04)', border: '0.5px solid var(--sq-border)',
            borderRadius: 16, padding: '20px 24px'
          }}>
            <textarea
              value={q.text}
              onChange={e => updateQ('text', e.target.value)}
              placeholder="Escribí tu pregunta acá..."
              rows={3}
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 22, fontWeight: 700, resize: 'none',
                lineHeight: 1.4, boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Imagen — URL o upload */}
          <div>
            <p style={{ fontSize: 12, color: 'var(--sq-muted)', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              🖼 Imagen (opcional)
            </p>

            {q.imageUrl ? (
              /* Preview de imagen cargada */
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={q.imageUrl}
                  alt="preview"
                  style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10, border: '0.5px solid var(--sq-border)', flexShrink: 0 }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: 'var(--sq-muted)', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.imageUrl.startsWith('https://firebasestorage') ? '📁 Imagen subida' : q.imageUrl}
                  </p>
                  <button
                    onClick={() => updateQ('imageUrl', '')}
                    style={{ background: 'rgba(248,113,113,.15)', border: '0.5px solid rgba(248,113,113,.4)', color: '#F87171', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    × Quitar imagen
                  </button>
                </div>
              </div>
            ) : (
              /* Sin imagen — mostrar opciones */
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Subir archivo */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    flex: 1, background: uploading ? 'rgba(62,207,163,.1)' : 'rgba(62,207,163,.15)',
                    border: '0.5px solid rgba(62,207,163,.4)', color: 'var(--sq-green)',
                    fontWeight: 700, fontSize: 13, padding: '10px', borderRadius: 10,
                    cursor: uploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploading ? '⏳ Subiendo...' : '📁 Subir imagen'}
                </button>

                {/* Pegar URL */}
                <input
                  value={q.imageUrl ?? ''}
                  onChange={e => updateQ('imageUrl', e.target.value)}
                  placeholder="O pegá una URL..."
                  style={{
                    flex: 2, background: 'var(--sq-subtle)', border: '0.5px solid var(--sq-border)',
                    borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13,
                    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit'
                  }}
                />
              </div>
            )}
          </div>

          {/* Time selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--sq-muted)', fontWeight: 600 }}>⏱ Tiempo:</span>
            {[5, 10, 20, 30, 60].map(t => (
              <button
                key={t}
                onClick={() => updateQ('timeLimit', t)}
                style={{
                  background: q.timeLimit === t ? 'var(--sq-orange)' : 'var(--sq-subtle)',
                  border: `0.5px solid ${q.timeLimit === t ? 'var(--sq-orange)' : 'var(--sq-border)'}`,
                  color: q.timeLimit === t ? '#fff' : 'var(--sq-muted)',
                  fontWeight: 700, fontSize: 13, padding: '6px 14px',
                  borderRadius: 8, cursor: 'pointer'
                }}
              >
                {t}s
              </button>
            ))}
          </div>

          {/* Answer options — condicional por tipo */}
          {(q.type ?? 'quiz') === 'quiz' && (
            <>
              <div className="sq-editor-answers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ background: ANS_BG[oi], border: `2px solid ${q.correctIndex === oi ? ANS_COLORS[oi] : 'rgba(255,255,255,.08)'}`, borderRadius: 14, padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18, color: ANS_COLORS[oi], fontWeight: 900, width: 28, textAlign: 'center', flexShrink: 0 }}>{ANS_SHAPES[oi]}</span>
                    <input value={opt} onChange={e => updateOption(oi, e.target.value)} placeholder={`Opción ${ANS_LABELS[oi]}`} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit' }} />
                    <button onClick={() => updateQ('correctIndex', oi)} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: `2px solid ${q.correctIndex === oi ? ANS_COLORS[oi] : 'rgba(255,255,255,.25)'}`, background: q.correctIndex === oi ? ANS_COLORS[oi] : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>
                      {q.correctIndex === oi ? '✓' : ''}
                    </button>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--sq-muted)', textAlign: 'center', margin: 0 }}>Hacé click en el círculo para marcar la correcta</p>
            </>
          )}

          {(q.type ?? 'quiz') === 'truefalse' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[{ label: '✅ Verdadero', color: '#3ECFA3', bg: 'rgba(62,207,163,.2)', idx: 0 }, { label: '❌ Falso', color: '#E84530', bg: 'rgba(232,69,48,.2)', idx: 1 }].map(({ label, color, bg, idx }) => (
                  <div key={idx} onClick={() => updateQ('correctIndex', idx)} style={{ background: bg, border: `2px solid ${q.correctIndex === idx ? color : 'rgba(255,255,255,.08)'}`, borderRadius: 14, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}>
                    <p style={{ fontSize: 20, fontWeight: 900, color, margin: 0 }}>{label}</p>
                    {q.correctIndex === idx && <p style={{ fontSize: 12, color, margin: '6px 0 0', fontWeight: 600 }}>✓ Respuesta correcta</p>}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--sq-muted)', textAlign: 'center', margin: 0 }}>Hacé click en la respuesta correcta</p>
            </>
          )}

          {(q.type ?? 'quiz') === 'wordcloud' && (
            <div style={{ background: 'rgba(92,107,192,.15)', border: '1.5px dashed rgba(92,107,192,.4)', borderRadius: 14, padding: '28px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 32, margin: '0 0 10px' }}>☁️</p>
              <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>Nube de palabras</p>
              <p style={{ color: 'var(--sq-muted)', fontSize: 13, margin: 0 }}>Los alumnos escriben una palabra libre. Las más repetidas aparecen más grandes en el proyector.</p>
            </div>
          )}

          {(q.type ?? 'quiz') === 'sort' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--sq-muted)', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  🔢 Orden correcto (de 1ro a 4to)
                </p>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ background: ANS_BG[oi], border: `1.5px solid ${ANS_COLORS[oi]}44`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: ANS_COLORS[oi], width: 28, textAlign: 'center', flexShrink: 0 }}>{oi + 1}</span>
                    <input value={opt} onChange={e => updateOption(oi, e.target.value)} placeholder={`Elemento ${oi + 1}`} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit' }} />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--sq-muted)', textAlign: 'center', margin: 0 }}>Los alumnos los verán mezclados y deberán ordenarlos</p>
            </>
          )}

          {/* Importar desde texto */}
          <ImportarTexto onImport={(qs) => {
            setQuestions(prev => {
              const current = prev.filter(q => q.text.trim())
              const merged = [...current, ...qs]
              setTimeout(() => setActive(current.length), 0)
              return merged
            })
          }} />
        </div>
      </main>
    </div>
  )
}

function ImportarTexto({ onImport }: { onImport: (qs: Question[]) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  function parse() {
    const blocks = text.trim().split(/\n\s*\n/)
    const parsed: Question[] = []
    for (const block of blocks) {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 5) continue
      const q: Question = {
        text: lines[0],
        type: 'quiz',
        options: ['', '', '', ''] as unknown as [string, string, string, string],
        correctIndex: 0,
        timeLimit: 20,
      }
      let cIdx = 0
      let oCount = 0
      for (let i = 1; i < lines.length && oCount < 4; i++) {
        const isCorrect = lines[i].startsWith('*')
        const opt = lines[i].replace(/^\*/, '').trim()
        q.options[oCount] = opt
        if (isCorrect) cIdx = oCount
        oCount++
      }
      q.correctIndex = cIdx as 0 | 1 | 2 | 3
      parsed.push(q)
    }
    if (parsed.length === 0) return alert('No se encontraron preguntas válidas. Revisá el formato.')
    onImport(parsed)
    setText('')
    setOpen(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ background: 'none', border: '0.5px dashed var(--sq-border)', color: 'var(--sq-muted)', fontSize: 12, padding: '8px', borderRadius: 10, cursor: 'pointer', width: '100%' }}>
      📥 Importar preguntas desde texto
    </button>
  )

  return (
    <div style={{ background: 'rgba(255,255,255,.04)', border: '0.5px solid var(--sq-border)', borderRadius: 14, padding: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px', color: 'var(--sq-green)' }}>📥 Importar desde texto</p>
      <p style={{ fontSize: 11, color: 'var(--sq-muted)', margin: '0 0 10px' }}>
        Formato: pregunta en la primera línea, opciones debajo. Marcá la correcta con <code style={{ color: 'var(--sq-orange)' }}>*</code>. Separar preguntas con una línea en blanco.
      </p>
      <pre style={{ fontSize: 10, color: 'var(--sq-muted)', background: 'rgba(0,0,0,.3)', borderRadius: 8, padding: 8, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{`¿Capital de Argentina?\nBuenos Aires\n*Córdoba\nMendoza\nRosario\n\n¿2+2?\n*4\n3\n5\n22`}</pre>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={8} placeholder="Pegá tus preguntas acá..." style={{ width: '100%', background: 'var(--sq-subtle)', border: '0.5px solid var(--sq-border)', borderRadius: 10, padding: 10, color: '#fff', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={parse} disabled={!text.trim()} style={{ flex: 2, background: 'var(--sq-green)', color: '#0D4A38', fontWeight: 700, fontSize: 13, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Importar</button>
        <button onClick={() => setOpen(false)} style={{ flex: 1, background: 'var(--sq-subtle)', border: '0.5px solid var(--sq-border)', color: 'var(--sq-muted)', fontSize: 13, padding: '10px', borderRadius: 10, cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  )
}

export default function CrearQuizPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--sq-muted)'}}>Cargando...</div>}>
      <EditorQuiz />
    </Suspense>
  )
}
