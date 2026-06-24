export interface Question {
  text: string
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  timeLimit: number
}

export interface Quiz {
  id: string
  title: string
  createdBy: string
  createdAt: number
  questions: Question[]
}

export interface Player {
  id: string
  name: string
  emoji: string
  score: number
  lastAnswer?: {
    index: number
    correct: boolean
    points: number
    answeredAt: number
  }
}

export type RoomStatus = 'waiting' | 'question' | 'answer' | 'leaderboard' | 'finished'

export interface Room {
  id: string
  quizId: string
  code: string
  status: RoomStatus
  currentQuestion: number
  questionStartedAt: number | null
  hostId: string
  quiz?: Quiz
}
