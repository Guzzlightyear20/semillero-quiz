import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  getDocs,
  addDoc,
} from 'firebase/firestore'
import { db, storage } from './firebase'
import { ref, deleteObject } from 'firebase/storage'
import type { Room, Player, Quiz, Question } from '@/types'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createQuiz(
  title: string,
  questions: Question[],
  hostId: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'quizzes'), {
    title,
    questions,
    createdBy: hostId,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function getQuizById(quizId: string): Promise<Quiz | null> {
  const snap = await getDoc(doc(db, 'quizzes', quizId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Quiz
}

export async function updateQuiz(quizId: string, title: string, questions: Question[]): Promise<void> {
  await updateDoc(doc(db, 'quizzes', quizId), { title, questions })
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const quiz = await getQuizById(quizId)
  if (quiz) {
    const imageUrls = quiz.questions
      .map(q => q.imageUrl)
      .filter((url): url is string => !!url && url.includes('firebasestorage.googleapis.com'))

    await Promise.allSettled(
      imageUrls.map(url => deleteObject(ref(storage, url)))
    )
  }
  await deleteDoc(doc(db, 'quizzes', quizId))
}

export async function getQuizzesByHost(hostId: string): Promise<Quiz[]> {
  const q = query(collection(db, 'quizzes'), where('createdBy', '==', hostId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quiz))
}

async function cleanupFinishedRooms(hostId: string): Promise<void> {
  const finished = await getDocs(
    query(collection(db, 'rooms'), where('hostId', '==', hostId), where('status', '==', 'finished'))
  )
  await Promise.allSettled(
    finished.docs.map(async (roomDoc) => {
      const players = await getDocs(collection(db, 'rooms', roomDoc.id, 'players'))
      const wordResponses = await getDocs(collection(db, 'rooms', roomDoc.id, 'wordResponses'))
      const batch = writeBatch(db)
      players.docs.forEach(p => batch.delete(p.ref))
      wordResponses.docs.forEach(w => batch.delete(w.ref))
      batch.delete(roomDoc.ref)
      await batch.commit()
    })
  )
}

export async function createRoom(quizId: string, hostId: string, teams?: string[]): Promise<string> {
  cleanupFinishedRooms(hostId).catch(() => {}) // fire and forget, don't block launch

  let code = generateCode()

  const existing = await getDocs(query(collection(db, 'rooms'), where('code', '==', code)))
  if (!existing.empty) code = generateCode()

  const data: Record<string, unknown> = {
    quizId, code, status: 'waiting',
    currentQuestion: 0, questionStartedAt: null, hostId,
    teamsMode: !!(teams && teams.length > 0),
    teams: teams ?? [],
  }

  const roomRef = await addDoc(collection(db, 'rooms'), data)
  return roomRef.id
}

export async function getRoomByCode(code: string): Promise<{ id: string; data: Room } | null> {
  const q = query(collection(db, 'rooms'), where('code', '==', code.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, data: { id: d.id, ...d.data() } as Room }
}

export async function joinRoom(roomId: string, player: Omit<Player, 'score' | 'lastAnswer'>): Promise<void> {
  await setDoc(doc(db, 'rooms', roomId, 'players', player.id), {
    name: player.name,
    emoji: player.emoji,
    score: 0,
    ...(player.team ? { team: player.team } : {}),
  })
}

export async function submitAnswer(
  roomId: string,
  playerId: string,
  answerIndex: number,
  questionStartedAt: number,
  timeLimit: number
): Promise<void> {
  const now = Date.now()
  const elapsed = (now - questionStartedAt) / 1000
  const maxPoints = 1000
  const points = Math.max(0, Math.round(maxPoints * (1 - elapsed / timeLimit)))

  await updateDoc(doc(db, 'rooms', roomId, 'players', playerId), {
    lastAnswer: {
      index: answerIndex,
      answeredAt: now,
      pendingPoints: points,
    },
  })
}

export function subscribeRoom(roomId: string, cb: (room: Room) => void) {
  return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as Room)
  })
}

export function subscribePlayers(roomId: string, cb: (players: Player[]) => void) {
  return onSnapshot(collection(db, 'rooms', roomId, 'players'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player)))
  })
}

export async function advanceToQuestion(roomId: string, questionIndex: number): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomId), {
    status: 'question',
    currentQuestion: questionIndex,
    questionStartedAt: Date.now(),
  })
}

export async function showAnswers(roomId: string, correctIndex: number): Promise<void> {
  // Always fetch fresh players from Firestore to avoid stale closure issues
  const snap = await getDocs(collection(db, 'rooms', roomId, 'players'))
  const players = snap.docs.map(d => ({ id: d.id, ...d.data() } as Player))

  const CHUNK = 499
  const chunks: Player[][] = []
  for (let i = 0; i < players.length; i += CHUNK) {
    chunks.push(players.slice(i, i + CHUNK))
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const batch = writeBatch(db)
    const isLast = ci === chunks.length - 1

    for (const p of chunks[ci]) {
      if (!p.lastAnswer) continue
      const correct = p.lastAnswer.index === correctIndex
      const points = correct ? (p.lastAnswer as any).pendingPoints ?? 0 : 0
      batch.update(doc(db, 'rooms', roomId, 'players', p.id), {
        score: (p.score ?? 0) + points,
        lastAnswer: { ...p.lastAnswer, correct, points },
      })
    }

    if (isLast) {
      batch.update(doc(db, 'rooms', roomId), { status: 'answer' })
    }

    await batch.commit()
  }

  if (players.length === 0) {
    await updateDoc(doc(db, 'rooms', roomId), { status: 'answer' })
  }
}

export async function showLeaderboard(roomId: string): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomId), { status: 'leaderboard' })
}

export async function submitWord(roomId: string, playerId: string, word: string, questionIndex: number): Promise<void> {
  await setDoc(doc(db, 'rooms', roomId, 'wordResponses', playerId), {
    word: word.trim().toLowerCase(),
    questionIndex,
  })
}

export function subscribeWordResponses(
  roomId: string,
  questionIndex: number,
  cb: (words: { word: string; count: number }[]) => void
) {
  return onSnapshot(collection(db, 'rooms', roomId, 'wordResponses'), (snap) => {
    const freq: Record<string, number> = {}
    snap.docs
      .filter(d => d.data().questionIndex === questionIndex)
      .forEach(d => {
        const w = d.data().word as string
        freq[w] = (freq[w] ?? 0) + 1
      })
    const sorted = Object.entries(freq)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
    cb(sorted)
  })
}

export async function finishRoom(roomId: string): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomId), { status: 'finished' })
}

export async function saveGameHistory(
  roomId: string,
  quizId: string,
  quizTitle: string,
  teacherId: string,
  players: Player[]
): Promise<void> {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  await setDoc(doc(db, 'gameHistory', roomId), {
    quizId,
    quizTitle,
    teacherId,
    date: Date.now(),
    playerCount: players.length,
    players: sorted.map((p, i) => ({
      name: p.name,
      emoji: p.emoji,
      team: p.team ?? null,
      score: p.score,
      position: i + 1,
    })),
  })
}

export async function getGameHistory(teacherId: string) {
  const q = query(
    collection(db, 'gameHistory'),
    where('teacherId', '==', teacherId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.date - a.date)
}

export async function getTeacherSettings(teacherId: string): Promise<{ openAnswerEnabled: boolean }> {
  const snap = await getDoc(doc(db, 'teacherSettings', teacherId))
  if (!snap.exists()) return { openAnswerEnabled: false }
  return snap.data() as { openAnswerEnabled: boolean }
}

export async function updateTeacherSettings(teacherId: string, settings: { openAnswerEnabled: boolean }): Promise<void> {
  await setDoc(doc(db, 'teacherSettings', teacherId), settings)
}

// ── Teacher management ──────────────────────────────────────────────────────

export interface Teacher {
  id: string
  name: string
  code: string
  createdAt: number
}

export async function getTeachers(): Promise<Teacher[]> {
  const snap = await getDocs(collection(db, 'teachers'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher))
}

export async function createTeacher(name: string, code: string): Promise<void> {
  const id = code.trim().toUpperCase()
  await setDoc(doc(db, 'teachers', id), {
    name: name.trim(),
    code: id,
    createdAt: Date.now(),
  })
}

export async function deleteTeacher(teacherId: string): Promise<void> {
  await deleteDoc(doc(db, 'teachers', teacherId))
}

export async function updateTeacherName(teacherId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'teachers', teacherId), { name: name.trim() })
}

export async function validateTeacherCode(code: string): Promise<Teacher | null> {
  const id = code.trim().toUpperCase()
  const snap = await getDoc(doc(db, 'teachers', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Teacher
}

export async function duplicateQuiz(quizId: string, hostId: string): Promise<string> {
  const quiz = await getQuizById(quizId)
  if (!quiz) throw new Error('Quiz not found')
  const ref = await addDoc(collection(db, 'quizzes'), {
    title: `${quiz.title} (copia)`,
    questions: quiz.questions,
    createdBy: hostId,
    createdAt: Date.now(),
  })
  return ref.id
}
