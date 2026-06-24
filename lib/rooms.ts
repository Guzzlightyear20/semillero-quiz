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
import { db } from './firebase'
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
  await deleteDoc(doc(db, 'quizzes', quizId))
}

export async function getQuizzesByHost(hostId: string): Promise<Quiz[]> {
  const q = query(collection(db, 'quizzes'), where('createdBy', '==', hostId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quiz))
}

export async function createRoom(quizId: string, hostId: string): Promise<string> {
  let code = generateCode()

  const existing = await getDocs(query(collection(db, 'rooms'), where('code', '==', code)))
  if (!existing.empty) code = generateCode()

  const ref = await addDoc(collection(db, 'rooms'), {
    quizId,
    code,
    status: 'waiting',
    currentQuestion: 0,
    questionStartedAt: null,
    hostId,
  })
  return ref.id
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

export async function showAnswers(roomId: string, correctIndex: number, players: Player[]): Promise<void> {
  // Firestore batch limit = 500 ops. Split players into chunks of 499
  // to leave 1 slot for the room status update in the last batch.
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

    // Include the room status update in the last batch — 1 round trip instead of 2
    if (isLast) {
      batch.update(doc(db, 'rooms', roomId), { status: 'answer' })
    }

    await batch.commit()
  }

  // Edge case: no players at all
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
