// Nuova richiesta: per chi (se ci sono più anziani), che tipo di aiuto, due righe di dettaglio.

import { useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { api, messaggioErrore, type Categoria, type Cerchio } from '../comune/api'
import { Collegamento, naviga } from '../comune/router'
import { CATEGORIE } from './aspetto'

export default function NuovaRichiesta({ cerchio }: { cerchio: Cerchio }) {
  const [anzianoId, setAnzianoId] = useState(cerchio.anziani[0]?.id ?? 0)
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  if (cerchio.anziani.length === 0) {
    return <div className="pagina-app"><p className="nota">Prima crea la scheda della persona assistita.</p></div>
  }

  async function invia(e: FormEvent) {
    e.preventDefault()
    if (!categoria) return
    setErrore(null)
    setInvio(true)
    try {
      const r = await api.nuovaRichiesta(cerchio.id, anzianoId, categoria, testo)
      naviga(`/richieste/${r.id}`, true)
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <div className="pagina-app entra">
      <Collegamento a="/richieste" className="indietro"><ArrowLeft size={18} /> Richieste</Collegamento>
      <header className="intestazione-pagina">
        <h1>Nuova richiesta</h1>
        <p className="sottotitolo">Tutto il cerchio la vede e chi può se ne occupa.</p>
      </header>

      <form className="modulo" onSubmit={invia}>
        {cerchio.anziani.length > 1 && (
          <fieldset className="scelta">
            <legend>Per chi?</legend>
            {cerchio.anziani.map((a) => (
              <label key={a.id} className={anzianoId === a.id ? 'attiva' : ''}>
                <input type="radio" name="anziano" checked={anzianoId === a.id} onChange={() => setAnzianoId(a.id)} />
                {a.nome}
              </label>
            ))}
          </fieldset>
        )}

        <fieldset className="categorie">
          <legend>Di cosa c'è bisogno?</legend>
          {(Object.keys(CATEGORIE) as Categoria[]).map((c) => {
            const { etichetta, esempio, Icona, colore } = CATEGORIE[c]
            return (
              <label key={c} className={categoria === c ? 'attiva' : ''}>
                <input type="radio" name="categoria" checked={categoria === c} onChange={() => setCategoria(c)} />
                <span className={`funzione-icona ${colore}`}><Icona size={22} /></span>
                <strong>{etichetta}</strong>
                <span>{esempio}</span>
              </label>
            )
          })}
        </fieldset>

        {categoria && (
          <label className="entra">
            <span>Dettagli {categoria !== 'ALTRO' && <span className="nota">facoltativi</span>}</span>
            <textarea rows={3} maxLength={500} required={categoria === 'ALTRO'} value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder={categoria === 'SPESA' ? 'Latte, pane e due mele' : 'Scrivi qui…'} />
          </label>
        )}

        {errore && <p className="errore" role="alert">{errore}</p>}
        <button className="pulsante" type="submit" disabled={!categoria || invio}>{invio ? 'Invio…' : 'Chiedi aiuto al cerchio'}</button>
      </form>
    </div>
  )
}
