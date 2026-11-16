// Nuova richiesta: per chi (se ci sono più anziani), che tipo di aiuto, due righe di dettaglio.
// In alto il palco viola con i tre passi; le categorie sono tessere colorate che si "accendono";
// scelta la categoria compaiono i suggerimenti rapidi da toccare.

import { useState, type CSSProperties, type FormEvent } from 'react'
import { ArrowLeft, Check, Send } from 'lucide-react'
import { api, messaggioErrore, type Categoria, type Cerchio } from '../comune/api'
import { Collegamento, naviga } from '../comune/router'
import Avatar from '../comune/Avatar'
import { CATEGORIE } from './aspetto'

/** Parole pronte da toccare, per scrivere meno. */
const SUGGERIMENTI: Record<Categoria, string[]> = {
  SPESA: ['Latte', 'Pane', 'Frutta', 'Acqua', 'Pasta', 'Verdura'],
  FARMACIA: ['Ritirare la ricetta', 'Medicine finite', 'Pannoloni', 'Misurare la pressione'],
  ACCOMPAGNAMENTO: ['Dal medico', 'In posta', 'In banca', 'Al mercato'],
  COMPAGNIA: ['Un caffè insieme', 'Una passeggiata', 'Una telefonata', 'Giocare a carte'],
  CASA: ['Cambiare una lampadina', 'La caldaia', 'Pulizie', 'Un rubinetto che perde'],
  ALTRO: [],
}

export default function NuovaRichiesta({ cerchio }: { cerchio: Cerchio }) {
  const [anzianoId, setAnzianoId] = useState(cerchio.anziani[0]?.id ?? 0)
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  if (cerchio.anziani.length === 0) {
    return <div className="pagina-app"><p className="nota">Prima crea la scheda della persona assistita.</p></div>
  }
  const anziano = cerchio.anziani.find((a) => a.id === anzianoId) ?? cerchio.anziani[0]!
  const passo = !categoria ? 1 : testo.trim() ? 3 : 2

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

  function aggiungi(parola: string) {
    setTesto((t) => {
      const pulito = t.trim()
      if (pulito.toLowerCase().includes(parola.toLowerCase())) return t
      return (pulito ? `${pulito.replace(/[,.]$/, '')}, ${parola.toLowerCase()}` : parola).slice(0, 500)
    })
  }

  const scelta = categoria ? CATEGORIE[categoria] : null

  return (
    <div className="pagina-app entra">
      <Collegamento a="/richieste" className="indietro"><ArrowLeft size={18} /> Richieste</Collegamento>

      <header className="richiesta-palco">
        <span className="rete-stella s1" aria-hidden="true" />
        <span className="rete-stella s2" aria-hidden="true" />
        <div className="richiesta-palco-alto">
          <Avatar nome={anziano.nome} cognome={anziano.cognome} foto={anziano.foto} className="richiesta-palco-avatar" />
          <div>
            <span className="richiesta-palco-etichetta">Nuova richiesta per</span>
            <h1>{anziano.nome}</h1>
          </div>
        </div>
        <p>Tutto il cerchio la vede e chi può se ne occupa.</p>
        <ol className="richiesta-passi" aria-label={`Passo ${passo} di 3`}>
          {['Cosa', 'Dettagli', 'Invia'].map((nome, i) => (
            <li key={nome} className={i + 1 < passo ? 'fatto' : i + 1 === passo ? 'attuale' : ''}>
              <span>{i + 1 < passo ? <Check size={14} /> : i + 1}</span>{nome}
            </li>
          ))}
        </ol>
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

        <fieldset className="categorie tessere">
          <legend>Di cosa c'è bisogno?</legend>
          {(Object.keys(CATEGORIE) as Categoria[]).map((c, i) => {
            const { etichetta, esempio, Icona } = CATEGORIE[c]
            return (
              <label key={c} className={`tessera cat-${c.toLowerCase()} ${categoria === c ? 'attiva' : ''} ${categoria && categoria !== c ? 'spenta' : ''}`}
                style={{ '--ritardo': `${0.05 * i}s` } as CSSProperties}>
                <input type="radio" name="categoria" checked={categoria === c} onChange={() => setCategoria(c)} />
                <span className="tessera-icona"><Icona size={26} /></span>
                <strong>{etichetta}</strong>
                <span className="tessera-esempio">{esempio}</span>
                {categoria === c && <span className="tessera-spunta" aria-hidden="true"><Check size={14} /></span>}
              </label>
            )
          })}
        </fieldset>

        {categoria && scelta && (
          <div key={categoria} className={`richiesta-dettagli cat-${categoria.toLowerCase()}`}>
            <label>
              <span>Dettagli {categoria !== 'ALTRO' && <span className="nota">facoltativi</span>}</span>
              <textarea rows={3} maxLength={500} required={categoria === 'ALTRO'} value={testo}
                onChange={(e) => setTesto(e.target.value)}
                placeholder={categoria === 'SPESA' ? 'Latte, pane e due mele' : categoria === 'ALTRO' ? 'Scrivi di cosa c’è bisogno…' : 'Scrivi qui…'} />
            </label>
            {SUGGERIMENTI[categoria].length > 0 && (
              <div className="richiesta-suggerimenti" role="group" aria-label="Suggerimenti">
                {SUGGERIMENTI[categoria].map((p) => (
                  <button key={p} type="button" className={`chip-suggerimento ${testo.toLowerCase().includes(p.toLowerCase()) ? 'usato' : ''}`} onClick={() => aggiungi(p)}>
                    + {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {errore && <p className="errore" role="alert">{errore}</p>}
        <div className={`richiesta-invia ${categoria ? 'pronto' : ''}`}>
          <button className={`pulsante richiesta-pulsante ${categoria ? 'pronto' : ''}`} type="submit" disabled={!categoria || invio}>
            {invio ? 'Invio…' : <><Send size={20} /> {scelta ? `Chiedi aiuto: ${scelta.etichetta.toLowerCase()}` : 'Scegli di cosa c’è bisogno'}</>}
          </button>
        </div>
      </form>
    </div>
  )
}
