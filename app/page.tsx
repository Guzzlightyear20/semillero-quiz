import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs flex flex-col items-center gap-8">

        <div className="text-center flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Semillero Digital"
            width={200}
            height={80}
            style={{objectFit:'contain',marginBottom:20,filter:'none'}}
            priority
          />
          <h1 style={{fontSize:48,fontWeight:900,lineHeight:1.05,margin:'0 0 8px',letterSpacing:'-1px'}}>
            <span style={{color:'var(--sq-green)'}}>Quiz</span>
          </h1>
          <p style={{color:'var(--sq-muted)',fontSize:15,margin:0}}>Aprendé jugando en clase</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Link href="/unirse" className="sq-btn-primary" style={{textAlign:'center',display:'block',textDecoration:'none'}}>
            Unirme a una partida
          </Link>
          <Link href="/admin" className="sq-btn-ghost" style={{textAlign:'center',display:'block',textDecoration:'none'}}>
            Soy profe
          </Link>
        </div>

      </div>
    </main>
  )
}
