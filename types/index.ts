export type QuestionType = 'quiz' | 'truefalse' | 'wordcloud' | 'sort'

export interface Question {
  text: string
  type?: QuestionType
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  timeLimit: number
  imageUrl?: string
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
  team?: string
  lastAnswer?: {
    index: number
    correct: boolean
    points: number
    answeredAt: number
    sortAnswer?: number[]
  }
}

export interface TeamScore {
  name: string
  avg: number
  total: number
  count: number
}

export interface GameHistory {
  id: string
  quizId: string
  quizTitle: string
  teacherId: string
  date: number
  playerCount: number
  players: { name: string; emoji: string; team?: string; score: number; position: number }[]
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
  teamsMode?: boolean
  teams?: string[]
  openAnswerEnabled?: boolean
  quiz?: Quiz
}
