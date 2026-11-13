// "Collega il telefono" (schermata C1): il familiare genera un codice di 6 cifre
// e lo scrive sul telefono dell'anziano. Qui si vede anche quali telefoni sono collegati.

import { useState } from 'react'
import { Copy, MessageCircle, Smartphone, Unlink } from 'lucide-react'
import { api, messaggioErrore, type Anziano } from '../comune/api'
import { useCarica } from '../comune/useCarica'
import { tempoFa } from '../comune/utili'

type Props = { anziano: Anziano }

const ora = (iso: string) => new Date(iso).toLocaleString('it-IT', { weekday: 'long', hour: '2-digit', minute: '2-digit' })

export default function TelefonoAnziano({ anziano }: Props) {
  const { dati, errore, ricarica } = useCarica(() => api.statoTelefono(anziano.id), anziano.id)
  const [codice, setCodice] = useState<{ codice: string; scadeIl: string } | null>(null)
  const [invio, setInvio] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)

  const indirizzo = `${window.location.origin}/senior`

  async function genera() {
    setInvio(true)
    setProblema(null)
    try {
      setCodice(await api.nuovoCodice(anziano.id))
      ricarica()
    } catch (e) {
      setProblema(messaggioErrore(e))
    }
    setInvio(false)
  }

  async function scollega(id: number) {
    try {
      await api.scollegaTelefono(anziano.id, id)
      ricarica()
    } catch (e) {
      setProblema(messaggioErrore(e))
    }
  }

  const messaggio = codice
    ? `Ciao ${anziano.nome}! Apri ${indirizzo} sul tuo telefono e scrivi questo codice: ${codice.codice}`
    : ''

  return (
    <section>
      <div className="titolo-sezione"><h2>Il telefono di {anziano.nome}</h2></div>

      {errore && <p className="errore">{errore}</p>}

      {dati?.collegati.map((t) => (
        <div key={t.id} className="scheda telefono-riga">
          <span className="funzione-icona verde"><Smartphone size={22} /></span>
          <span className="riga-testo">
            <strong>Telefono collegato</strong>
            <span>Dal {new Date(t.collegatoIl).toLocaleDateString('it-IT')} · {t.ultimoUsoIl ? `usato ${tempoFa(t.ultimoUsoIl)}` : 'mai usato'}</span>
          </span>
          <button className="pulsante-icona tenue" onClick={() => scollega(t.id)} aria-label="Scollega questo telefono" title="Scollega">
            <Unlink size={20} />
          </button>
        </div>
      ))}

      {codice ? (
        <div className="scheda codice-box entra">
          <p className="nota">Sul telefono di {anziano.nome} apri <strong>{indirizzo}</strong> e scrivi:</p>
          <p className="codice-grande" aria-label={`Codice ${codice.codice.split('').join(' ')}`}>
            {codice.codice.slice(0, 3)}<span> </span>{codice.codice.slice(3)}
          </p>
          <p className="nota">Vale fino a {ora(codice.scadeIl)} e si usa una volta sola.</p>
          <div className="due-colonne">
            <a className="pulsante whatsapp con-icona" href={`https://wa.me/?text=${encodeURIComponent(messaggio)}`} target="_blank" rel="noreferrer">
              <MessageCircle size={20} /> WhatsApp
            </a>
            <button className="pulsante secondario con-icona" onClick={() => navigator.clipboard?.writeText(messaggio)}>
              <Copy size={20} /> Copia
            </button>
          </div>
        </div>
      ) : (
        <div className="scheda pila">
          <p className="nota senza-margine">
            {dati?.collegati.length
              ? `Puoi collegare anche un altro telefono, per esempio un tablet.`
              : `${anziano.nome} non ha bisogno di email né password: basta un codice di 6 cifre, da scrivere una volta sul suo telefono.`}
            {dati?.codiceScadeIl && ' C’è già un codice in attesa: generandone uno nuovo, il vecchio smette di valere.'}
          </p>
          <button className="pulsante con-icona" onClick={genera} disabled={invio}>
            <Smartphone size={20} /> {invio ? 'Un momento…' : 'Collega il telefono'}
          </button>
        </div>
      )}
      {problema && <p className="errore">{problema}</p>}
    </section>
  )
}
