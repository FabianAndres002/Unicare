// "I tuoi dati": informativa, scarica i miei dati, esci dagli altri telefoni, cancella l'account.

import { useState, type FormEvent } from 'react'
import { ChevronRight, Download, ShieldCheck, Smartphone, Trash2 } from 'lucide-react'
import { api, messaggioErrore } from '../comune/api'
import { Collegamento } from '../comune/router'
import { t } from '../comune/lingua'

export default function PrivacyProfilo({ onEliminato }: { onEliminato: () => void }) {
  const [apri, setApri] = useState(false)
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const [altri, setAltri] = useState<'chiuso' | 'conferma' | 'fatto'>('chiuso')
  const [erroreAltri, setErroreAltri] = useState<string | null>(null)

  async function esciAltri() {
    setErroreAltri(null)
    try {
      // Le notifiche di questo telefono restano: diciamo al server qual è la sua iscrizione.
      const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined)
      const iscrizione = await reg?.pushManager.getSubscription().catch(() => null)
      await api.esciOvunque(iscrizione?.endpoint)
      setAltri('fatto')
    } catch (err) {
      setErroreAltri(messaggioErrore(err))
    }
  }

  async function elimina(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      await api.eliminaAccount(password)
      onEliminato()
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <section>
      <div className="titolo-sezione"><h2>{t('I tuoi dati')}</h2></div>
      <ul className="elenco scheda">
        <li>
          <Collegamento a="/privacy" className="riga-scelta">
            <span className="funzione-icona verde"><ShieldCheck size={20} /></span>
            <span className="riga-testo"><strong>{t('Come trattiamo i dati')}</strong><span>{t('Cosa salviamo, chi lo vede, per quanto')}</span></span>
            <ChevronRight size={20} />
          </Collegamento>
        </li>
        <li>
          <a className="riga-scelta" href={api.datiPersonali} download="unicare-i-miei-dati.json">
            <span className="funzione-icona blu"><Download size={20} /></span>
            <span className="riga-testo"><strong>{t('Scarica i miei dati')}</strong><span>{t('Un file con tutto quello che riguarda te')}</span></span>
          </a>
        </li>
        <li>
          <button className="riga-scelta esci-altri" onClick={() => setAltri(altri === 'conferma' ? 'chiuso' : 'conferma')} aria-expanded={altri === 'conferma'}>
            <span className="funzione-icona arancio"><Smartphone size={20} /></span>
            <span className="riga-testo"><strong>{t('Esci dagli altri telefoni')}</strong><span>{t('Se hai perso il telefono o sei entrato da un telefono non tuo')}</span></span>
          </button>
        </li>
        <li>
          <button className="riga-scelta" onClick={() => setApri(!apri)} aria-expanded={apri}>
            <span className="funzione-icona rosso"><Trash2 size={20} /></span>
            <span className="riga-testo"><strong>{t('Cancella il mio account')}</strong><span>{t('Per sempre, non si torna indietro')}</span></span>
          </button>
        </li>
      </ul>
      {altri === 'conferma' && (
        <div className="modulo scheda entra">
          <p className="senza-margine">{t('Su tutti gli altri telefoni e computer Unicare si chiude e le notifiche smettono di arrivare. Per rientrare servono email e password. Su questo telefono resti dentro.')}</p>
          {erroreAltri && <p className="errore">{erroreAltri}</p>}
          <button type="button" className="pulsante" onClick={esciAltri}>{t('Sì, fai uscire gli altri')}</button>
          <button type="button" className="pulsante fantasma" onClick={() => setAltri('chiuso')}>{t('Annulla')}</button>
        </div>
      )}
      {altri === 'fatto' && <p className="avviso-ok entra">{t('Fatto: gli altri telefoni sono usciti.')}</p>}
      {apri && (
        <form className="modulo scheda pericolo entra" onSubmit={elimina}>
          <p className="senza-margine">
            {t('Cancelliamo il tuo account e i tuoi dati. Nei cerchi che amministri il ruolo passa a un altro familiare.')}
            <strong>{' '}{t('Se sei l’unico familiare, il cerchio viene cancellato con la scheda, i documenti e tutto il resto.')}</strong>
          </p>
          <label>{t('Scrivi la tua password per confermare')}
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {errore && <p className="errore" role="alert">{errore}</p>}
          <div className="riga-pulsanti">
            <button type="button" className="pulsante fantasma" onClick={() => setApri(false)}>{t('Annulla')}</button>
            <button className="pulsante pericolo" disabled={invio || !password}>{invio ? t('Cancello…') : t('Cancella per sempre')}</button>
          </div>
        </form>
      )}
    </section>
  )
}
