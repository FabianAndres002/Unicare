// La badante compila il suo profilo e accende "Mi propongo": così le famiglie la trovano.

import { useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, Megaphone } from 'lucide-react'
import { api, messaggioErrore, type DatiProfiloBadante, type Disponibilita, type Profilo, type Servizio } from '../comune/api'
import { useCarica } from '../comune/useCarica'
import { Collegamento } from '../comune/router'
import CartaBadante from './CartaBadante'
import { DISPONIBILITA, PROVINCE, SERVIZI } from './aspetto'

const VUOTO: DatiProfiloBadante = {
  presentazione: '', provincia: '', comune: '', zone: '', anniEsperienza: 0, lingue: 'Italiano',
  servizi: [], disponibilita: [], tariffaOrariaCentesimi: null, automunita: false, visibile: true,
}

function Modulo({ nome, cognome, iniziale, onSalvato }: { nome: string; cognome: string; iniziale: DatiProfiloBadante; onSalvato: () => void }) {
  const [d, setD] = useState(iniziale)
  const [tariffa, setTariffa] = useState(iniziale.tariffaOrariaCentesimi === null ? '' : String(iniziale.tariffaOrariaCentesimi / 100).replace('.', ','))
  const [errore, setErrore] = useState<string | null>(null)
  const [fatto, setFatto] = useState(false)
  const [invio, setInvio] = useState(false)
  const cambia = <K extends keyof DatiProfiloBadante>(k: K, v: DatiProfiloBadante[K]) => { setD({ ...d, [k]: v }); setFatto(false) }
  const alterna = <T extends string>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v])

  async function salva(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    const euro = tariffa.trim() ? Math.round(Number(tariffa.replace(',', '.')) * 100) : null
    try {
      await api.salvaProfiloBadante({ ...d, tariffaOrariaCentesimi: euro !== null && Number.isFinite(euro) ? euro : null })
      setFatto(true)
      onSalvato()
    } catch (err) {
      setErrore(messaggioErrore(err))
    }
    setInvio(false)
  }

  return (
    <form className="modulo" onSubmit={salva}>
      <label className={`scheda interruttore-riga mi-propongo ${d.visibile ? 'acceso' : ''}`}>
        <span className="funzione-icona arancio"><Megaphone size={22} /></span>
        <span className="riga-testo">
          <strong>Mi propongo alle famiglie</strong>
          <span>{d.visibile ? 'Le famiglie possono trovarti e scriverti' : 'Ti vedono solo le famiglie a cui ti proponi'}</span>
        </span>
        <input type="checkbox" role="switch" className="interruttore" checked={d.visibile} onChange={(e) => cambia('visibile', e.target.checked)} />
      </label>

      <div className="scheda modulo">
        <label>Presentati in poche righe
          <textarea rows={4} maxLength={1500} value={d.presentazione} onChange={(e) => cambia('presentazione', e.target.value)}
            placeholder="Es. Lavoro con anziani da 8 anni, sono paziente e mi piace cucinare. Ho seguito una signora con l’Alzheimer per 3 anni." />
        </label>
        <div className="due-colonne">
          <label>Provincia
            <select className="campo" value={d.provincia} onChange={(e) => cambia('provincia', e.target.value)} required>
              <option value="">Scegli…</option>
              {PROVINCE.map(([s, n]) => <option key={s} value={s}>{n}</option>)}
            </select>
          </label>
          <label>Comune<input value={d.comune} onChange={(e) => cambia('comune', e.target.value)} required minLength={2} maxLength={80} placeholder="Es. Caserta" /></label>
        </div>
        <label><span>Dove puoi lavorare <span className="nota">facoltativo</span></span>
          <input value={d.zone ?? ''} onChange={(e) => cambia('zone', e.target.value)} maxLength={200} placeholder="Es. Caserta e dintorni, fino a Napoli" />
        </label>
        <div className="due-colonne">
          <label>Anni di esperienza<input type="number" min={0} max={60} value={d.anniEsperienza} onChange={(e) => cambia('anniEsperienza', Number(e.target.value) || 0)} /></label>
          <label><span>Tariffa <span className="nota">€ all’ora, facoltativa</span></span>
            <input inputMode="decimal" value={tariffa} onChange={(e) => { setTariffa(e.target.value); setFatto(false) }} placeholder="Es. 10" />
          </label>
        </div>
        <label><span>Lingue <span className="nota">facoltativo</span></span>
          <input value={d.lingue ?? ''} onChange={(e) => cambia('lingue', e.target.value)} maxLength={200} placeholder="Es. Italiano, rumeno" />
        </label>
      </div>

      <fieldset className="scheda scelte-multiple">
        <legend>Quando sei disponibile</legend>
        {(Object.keys(DISPONIBILITA) as Disponibilita[]).map((k) => (
          <label key={k} className={d.disponibilita.includes(k) ? 'attiva' : ''}>
            <input type="checkbox" className="sr-only" checked={d.disponibilita.includes(k)} onChange={() => cambia('disponibilita', alterna(d.disponibilita, k))} />
            {DISPONIBILITA[k]}
          </label>
        ))}
      </fieldset>

      <fieldset className="scheda scelte-multiple">
        <legend>Cosa sai fare</legend>
        {(Object.keys(SERVIZI) as Servizio[]).map((k) => (
          <label key={k} className={d.servizi.includes(k) ? 'attiva' : ''}>
            <input type="checkbox" className="sr-only" checked={d.servizi.includes(k)} onChange={() => cambia('servizi', alterna(d.servizi, k))} />
            {SERVIZI[k]}
          </label>
        ))}
        <label className={`larga ${d.automunita ? 'attiva' : ''}`}>
          <input type="checkbox" className="sr-only" checked={d.automunita} onChange={(e) => cambia('automunita', e.target.checked)} />
          Ho l’auto
        </label>
      </fieldset>

      {errore && <p className="errore" role="alert">{errore}</p>}
      {fatto && <p className="avviso-ok" role="status">{d.visibile ? 'Salvato! Le famiglie ora possono trovarti.' : 'Salvato. Il profilo resta nascosto.'}</p>}
      <button className="pulsante" disabled={invio}>{invio ? 'Salvo…' : 'Salva il profilo'}</button>

      {d.provincia && d.comune && (
        <section>
          <div className="titolo-sezione"><h2>{d.visibile ? <Eye size={18} className="icona-inline" /> : <EyeOff size={18} className="icona-inline" />} Così ti vedono le famiglie</h2></div>
          <div className="scheda"><CartaBadante nome={nome} cognome={cognome}
            p={{ ...d, tariffaOrariaCentesimi: tariffa.trim() ? Math.round(Number(tariffa.replace(',', '.')) * 100) || null : null, aggiornatoIl: '' }} /></div>
          <p className="nota">Le famiglie vedono il tuo nome e l’iniziale del cognome. Email e telefono no: ti scrivono qui, e decidi tu se dare il tuo numero.</p>
        </section>
      )}
    </form>
  )
}

export default function IlMioProfilo({ profilo }: { profilo: Profilo }) {
  const { dati, errore, ricarica } = useCarica(() => api.mioProfiloBadante(), profilo.id, 3600)
  return (
    <div className="pagina-app entra">
      <Collegamento a="/lavoro" className="indietro"><ArrowLeft size={18} /> Lavoro</Collegamento>
      <header className="intestazione-pagina">
        <h1>Il mio profilo</h1>
        <p className="sottotitolo">Le famiglie lo vedono quando ti proponi per una ricerca. Con “Mi propongo” acceso ti trovano anche nella lista delle badanti.</p>
      </header>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}
      {dati && <Modulo nome={dati.nome} cognome={dati.cognome} iniziale={dati.profilo ? { ...dati.profilo } : VUOTO} onSalvato={ricarica} />}
    </div>
  )
}
