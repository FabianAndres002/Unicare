// "Collega il telefono" (schermata C1): il familiare genera un codice di 6 cifre
// e lo scrive sul telefono dell'anziano. Qui si vede anche quali telefoni sono collegati.

import { useState } from 'react'
import { Copy, MessageCircle, Smartphone, Unlink } from 'lucide-react'
import { api, messaggioErrore, type Anziano } from '../comune/api'
import { useCarica } from '../comune/useCarica'
import { tempoFa } from '../comune/utili'
import { locale, t } from '../comune/lingua'

type Props = { anziano: Anziano }

const ora = (iso: string) => new Date(iso).toLocaleString(locale(), { weekday: 'long', hour: '2-digit', minute: '2-digit' })

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
    ? t('Ciao {0}! Apri {1} sul tuo telefono e scrivi questo codice: {2}', anziano.nome, indirizzo, codice.codice)
    : ''

  return (
    <section>
      <div className="titolo-sezione"><h2>{t('Il telefono di {0}', anziano.nome)}</h2></div>

      {errore && <p className="errore">{errore}</p>}

      {dati?.collegati.map((tel) => (
        <div key={tel.id} className="scheda telefono-riga">
          <span className="funzione-icona verde"><Smartphone size={22} /></span>
          <span className="riga-testo">
            <strong>{t('Telefono collegato')}</strong>
            <span>{t('Dal {0} ·', new Date(tel.collegatoIl).toLocaleDateString(locale()))}{' '}{tel.ultimoUsoIl ? t('usato {0}', tempoFa(tel.ultimoUsoIl)) : t('mai usato')}</span>
          </span>
          <button className="pulsante-icona tenue" onClick={() => scollega(tel.id)} aria-label={t('Scollega questo telefono')} title={t('Scollega')}>
            <Unlink size={20} />
          </button>
        </div>
      ))}

      {codice ? (
        <div className="scheda codice-box entra">
          <p className="nota">{t('Sul telefono di {0} apri', anziano.nome)}{' '}<strong>{indirizzo}</strong>{' '}{t('e scrivi:')}</p>
          <p className="codice-grande" aria-label={t('Codice {0}', codice.codice.split('').join(' '))}>
            {codice.codice.slice(0, 3)}<span> </span>{codice.codice.slice(3)}
          </p>
          <p className="nota">{t('Vale fino a {0} e si usa una volta sola.', ora(codice.scadeIl))}</p>
          <div className="due-colonne">
            <a className="pulsante whatsapp con-icona" href={`https://wa.me/?text=${encodeURIComponent(messaggio)}`} target="_blank" rel="noreferrer">
              <MessageCircle size={20} />{' '}WhatsApp
            </a>
            <button className="pulsante secondario con-icona" onClick={() => navigator.clipboard?.writeText(messaggio)}>
              <Copy size={20} />{' '}{t('Copia')}
            </button>
          </div>
        </div>
      ) : (
        <div className="scheda pila">
          <p className="nota senza-margine">
            {dati?.collegati.length
              ? t('Puoi collegare anche un altro telefono, per esempio un tablet.')
              : t('{0} non ha bisogno di email né password: basta un codice di 6 cifre, da scrivere una volta sul suo telefono.', anziano.nome)}
            {dati?.codiceScadeIl && t(' C’è già un codice in attesa: generandone uno nuovo, il vecchio smette di valere.')}
          </p>
          <button className="pulsante con-icona" onClick={genera} disabled={invio}>
            <Smartphone size={20} /> {invio ? t('Un momento…') : t('Collega il telefono')}
          </button>
        </div>
      )}
      {problema && <p className="errore">{problema}</p>}
    </section>
  )
}
