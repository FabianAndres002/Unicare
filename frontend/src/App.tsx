import { useEffect, useState } from 'react'
import { leggiStato, type Stato } from './comune/api'

// Settimana 1: una pagina di prova che legge /api/stato dal backend.
// Dalla settimana 2 qui arriveranno login e le tre aree (Senior, Famiglia, Badante),
// nelle cartelle src/senior, src/famiglia e src/badante.

type Caricamento =
  | { tipo: 'attesa' }
  | { tipo: 'ok'; stato: Stato }
  | { tipo: 'errore'; messaggio: string }

export default function App() {
  const [caricamento, setCaricamento] = useState<Caricamento>({ tipo: 'attesa' })

  useEffect(() => {
    leggiStato()
      .then((stato) => setCaricamento({ tipo: 'ok', stato }))
      .catch((e: Error) => setCaricamento({ tipo: 'errore', messaggio: e.message }))
  }, [])

  return (
    <main className="pagina">
      <img className="logo" src="/icone/icona-192.png" alt="" width={72} height={72} />
      <h1>Unicare</h1>
      <p className="sottotitolo">La famiglia unita intorno a chi ami</p>

      <section className="scheda" aria-live="polite">
        <h2>Stato del sistema</h2>
        {caricamento.tipo === 'attesa' && <p>Controllo in corso…</p>}
        {caricamento.tipo === 'ok' && (
          <p className="ok">
            Backend e database collegati. Tabelle create: {caricamento.stato.tabelle}.
          </p>
        )}
        {caricamento.tipo === 'errore' && (
          <p className="errore">
            Il backend non risponde ({caricamento.messaggio}). È avviato su localhost:8080?
          </p>
        )}
      </section>
    </main>
  )
}
