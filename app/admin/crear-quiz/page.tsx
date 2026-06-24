'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createQuiz } from '@/lib/rooms'
import type { Question } from '@/types'

const ADMIN_ID = 'semillero-admin'

const EMPTY_QUESTION: Question = {
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  timeLimit: 20,
}

export default function CrearQuizPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Question[]>([{ ...EMPTY_QUESTION, options: ['', '', '', ''] }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('admin_authed') !== 'true') router.push('/admin')
  }, [router])

  function updateQuestion(i: number, field: keyof Question, value: unknown) {
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, [field]: value } : q))
  }

  function updateOption(qi: number, oi: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, idx) =>
        idx === qi
          ? { ...q, options: q.options.map((o, oIdx) => oIdx === oi ? value : o) as Question['options'] }
          : q
      )
    )
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, { ...EMPTY_QUESTION, options: ['', '', '', ''] }])
  }

  function removeQuestion(i: number) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const valid = questions.every((q) => q.text.trim() && q.options.every((o) => o.trim()))
    if (!valid) return alert('Completá todas las preguntas y opciones.')
    setSaving(true)
    await createQuiz(title.trim(), questions, ADMIN_ID)
    router.push('/admin')
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-gray-400 hover:text-white mb-6 inline-block">
        ← Volver
      </button>
      <h1 className="text-2xl font-black mb-6">Nuevo quiz</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del quiz"
          className="bg-gray-800 rounded-xl px-4 py-3 text-xl font-bold outline-none focus:ring-2 focus:ring-violet-500"
        />

        {questions.map((q, qi) => (
          <div key={qi} className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-violet-400">Pregunta {qi + 1}</span>
              {questions.length > 1 && (
                <button type="button" onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-300 text-sm">
                  Eliminar
                </button>
              )}
            </div>

            <input
              value={q.text}
              onChange={(e) => updateQuestion(qi, 'text', e.target.value)}
              placeholder="¿Cuál es la pregunta?"
              className="bg-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500"
            />

            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuestion(qi, 'correctIndex', oi)}
                    className={`w-8 h-8 rounded-full font-bold text-sm flex-shrink-0 transition-colors ${
                      q.correctIndex === oi ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {['A','B','C','D'][oi]}
                  </button>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Opción ${['A','B','C','D'][oi]}`}
                    className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Tiempo:</label>
              {[10, 20, 30, 60].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateQuestion(qi, 'timeLimit', t)}
                  className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
                    q.timeLimit === t ? 'bg-violet-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="border-2 border-dashed border-gray-600 hover:border-violet-500 transition-colors rounded-2xl py-4 text-gray-400 hover:text-violet-400 font-bold"
        >
          + Agregar pregunta
        </button>

        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-colors font-bold text-lg py-4 rounded-xl"
        >
          {saving ? 'Guardando...' : '💾 Guardar quiz'}
        </button>
      </form>
    </main>
  )
}
