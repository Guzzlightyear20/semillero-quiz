import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🌱</div>
        <h1 className="text-5xl font-black tracking-tight text-white mb-2">Semillero Quiz</h1>
        <p className="text-gray-400 text-lg">Aprendé jugando</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/unirse"
          className="flex-1 bg-violet-600 hover:bg-violet-500 transition-colors text-white font-bold text-xl py-5 rounded-2xl text-center"
        >
          🎮 Unirse a partida
        </Link>
        <Link
          href="/admin"
          className="flex-1 bg-gray-800 hover:bg-gray-700 transition-colors text-white font-bold text-xl py-5 rounded-2xl text-center"
        >
          👨‍🏫 Soy profe
        </Link>
      </div>
    </main>
  )
}
