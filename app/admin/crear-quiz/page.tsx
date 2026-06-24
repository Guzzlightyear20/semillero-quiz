'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createQuiz } from '@/lib/rooms'
import type { Question } from '@/types'

const ADMIN_ID = 'semillero-admin'

const ANS_COLORS = ['#E84530', '#3B82F6', '#F5921E', '#3ECFA3']
const ANS_BG = ['rgba(232,69,48,.25)', 'rgba(59,130,246,.25)', 'rgba(245,146,30,.25)', 'rgba(62,207,163,.25)']
const ANS_LABELS = ['A', 'B', 'C', 'D']
const ANS_SHAPES = ['▲', '◆', '●', '■']

function emptyQuestion(): Question {
  return { text: '', options: ['', '', '', ''], correctIndex: 0, timeLimit: 20 }
}

export default function CrearQuizPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])
  const [active, setActive] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('admin_authed') !== 'true') router.push('/admin')
  }, [router])

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

  function addQuestion() {
    setQuestions(qs => [...qs, emptyQuestion()])
    setActive(questions.length)
  }

  function removeQuestion(i: number) {
    if (questions.length === 1) return
    const next = questions.filter((_, idx) => idx !== i)
    setQuestions(next)
    setActive(Math.min(active, next.length - 1))
  }

  async function handleSave() {
    if (!title.trim()) return alert('Poné un título al quiz.')
    const valid = questions.every(q => q.text.trim() && q.options.every(o => o.trim()))
    if (!valid) return alert('Completá todas las preguntas y opciones.')
    setSaving(true)
    await createQuiz(title.trim(), questions, ADMIN_ID)
    router.push('/admin')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: '#0A0C0F',
        borderRight: '0.5px solid var(--sq-border)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '14px 12px', borderBottom: '0.5px solid var(--sq-border)' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título del quiz"
            style={{
              background: 'var(--sq-subtle)', border: '0.5px solid var(--sq-border)',
              borderRadius: 8, padding: '8px 10px', color: '#fff',
              fontSize: 13, fontWeight: 700, width: '100%', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {questions.map((q, i) => (
            <div
              key={i}
              onClick={() => setActive(i)}
              style={{
                background: active === i ? 'rgba(62,207,163,.12)' : 'var(--sq-subtle)',
                border: `1px solid ${active === i ? 'var(--sq-green)' : 'var(--sq-border)'}`,
                borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                display: 'flex', alignItems: 'flex-start', gap: 8
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: active === i ? 'var(--sq-green)' : 'var(--sq-muted)', minWidth: 16, paddingTop: 1 }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 12, fontWeight: 600, color: '#fff', margin: '0 0 4px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {q.text || 'Sin pregunta'}
                </p>
                <span style={{ fontSize: 11, color: 'var(--sq-muted)' }}>{q.timeLimit}s</span>
              </div>
              {questions.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); removeQuestion(i) }}
                  style={{ background: 'none', border: 'none', color: 'var(--sq-muted)', cursor: 'pointer', fontSize: 14, padding: '0 0 0 4px', lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: 10, borderTop: '0.5px solid var(--sq-border)' }}>
          <button
            onClick={addQuestion}
            style={{
              width: '100%', background: 'var(--sq-green)', color: '#0D4A38',
              fontWeight: 800, fontSize: 13, padding: '10px', borderRadius: 10,
              border: 'none', cursor: 'pointer'
            }}
          >
            + Agregar pregunta
          </button>
        </div>
      </aside>

      {/* MAIN EDITOR */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderBottom: '0.5px solid var(--sq-border)',
          background: '#0A0C0F'
        }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', color: 'var(--sq-muted)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            ← Volver
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sq-muted)' }}>
            Pregunta {active + 1} de {questions.length}
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
            {saving ? 'Guardando...' : '💾 Guardar quiz'}
          </button>
        </div>

        {/* Question area */}
        <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>

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

          {/* Answer options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {q.options.map((opt, oi) => (
              <div
                key={oi}
                style={{
                  background: ANS_BG[oi],
                  border: `2px solid ${q.correctIndex === oi ? ANS_COLORS[oi] : 'rgba(255,255,255,.08)'}`,
                  borderRadius: 14, padding: '16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'border-color .15s'
                }}
              >
                <span style={{
                  fontSize: 18, color: ANS_COLORS[oi], fontWeight: 900,
                  width: 28, textAlign: 'center', flexShrink: 0
                }}>
                  {ANS_SHAPES[oi]}
                </span>
                <input
                  value={opt}
                  onChange={e => updateOption(oi, e.target.value)}
                  placeholder={`Opción ${ANS_LABELS[oi]}`}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: '#fff', fontSize: 15, fontWeight: 600,
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  onClick={() => updateQ('correctIndex', oi)}
                  title="Marcar como correcta"
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${q.correctIndex === oi ? ANS_COLORS[oi] : 'rgba(255,255,255,.25)'}`,
                    background: q.correctIndex === oi ? ANS_COLORS[oi] : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: '#fff', transition: 'all .15s'
                  }}
                >
                  {q.correctIndex === oi ? '✓' : ''}
                </button>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'var(--sq-muted)', textAlign: 'center', margin: 0 }}>
            Hacé click en el círculo de la derecha para marcar la respuesta correcta
          </p>
        </div>
      </main>
    </div>
  )
}
