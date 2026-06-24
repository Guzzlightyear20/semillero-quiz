import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs flex flex-col items-center gap-8">

        <div className="text-center">
          <div className="sq-chip mb-5" style={{color:'var(--sq-green)'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'var(--sq-green)',display:'inline-block'}}/>
            Semillero Digital
          </div>
          <h1 style={{fontSize:52,fontWeight:900,lineHeight:1.05,margin:'0 0 10px',letterSpacing:'-1px'}}>
            Semillero<br/>
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
