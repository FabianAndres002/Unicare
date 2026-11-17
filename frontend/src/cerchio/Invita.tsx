// L'amministratore crea un link d'invito e lo manda come preferisce (WhatsApp, copia, condividi).

import { useState, type FormEvent } from 'react'
import { Check, Copy, HeartHandshake, MessageCircle, Share2, UserPlus, Users } from 'lucide-react'
import { api, messaggioErrore, type Cerchio, type InvitoCreato } from '../comune/api'
import { Collegamento } from '../comune/router'
import { nomeRuolo } from '../comune/utili'
import { t } from '../comune/lingua'

export default function Invita({ cerchio, onCambiato }: { cerchio: Cerchio; onCambiato: () => void }) {
  const [email, setEmail] = useState('')
  const [ruolo, setRuolo] = useState<'FAMILIARE' | 'BADANTE'>('FAMILIARE')
  const [creato, setCreato] = useState<InvitoCreato | null>(null)
  const [copiato, setCopiato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  if (cerchio.mioRuolo !== 'ADMIN') {
    return <div className="pagina-app"><p className="nota">{t('Solo l\'amministratore del cerchio può invitare.')}</p></div>
  }

  async function invia(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setInvio(true)
    try {
      setCreato(await api.invita(cerchio.id, email, ruolo))
      onCambiato()
    } catch (err) {
      setErrore(messaggioErrore(err))
    } finally {
      setInvio(false)
    }
  }

  if (creato) {
    const link = `${location.origin}/invito/${creato.token}`
    const messaggio = t('Ciao! Ti invito nel cerchio "{0}" su Unicare, per prenderci cura insieme. Apri il link: {1}', cerchio.nome, link)
    async function copia() {
      await navigator.clipboard.writeText(link)
      setCopiato(true)
    }
    return (
      <div className="pagina-app entra">
        <header className="palco-pagina centrato cat-spesa">
          <span className="palco-icona"><Check size={26} /></span>
          <div className="palco-testi">
            <h1>{t('Invito pronto')}</h1>
            <p className="sottotitolo">{t('Manda questo link a')}{' '}<strong>{creato.email}</strong> ({nomeRuolo[creato.ruolo].toLowerCase()}).</p>
          </div>
        </header>
        <div className="scheda pila">
          <div className="link-invito">{link}</div>
          <a className="pulsante con-icona whatsapp" href={`https://wa.me/?text=${encodeURIComponent(messaggio)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={20} />{' '}{t('Invia su WhatsApp')}
          </a>
          <button className="pulsante secondario con-icona" onClick={copia}>
            {copiato ? <><Check size={20} />{' '}{t('Copiato')}</> : <><Copy size={20} />{' '}{t('Copia il link')}</>}
          </button>
          {'share' in navigator && (
            <button className="pulsante fantasma con-icona" onClick={() => navigator.share({ title: t('Invito Unicare'), text: messaggio }).catch(() => {})}>
              <Share2 size={20} />{' '}{t('Altre app')}
            </button>
          )}
        </div>
        <p className="nota centrato">{t('Il link vale 7 giorni e si può usare una volta sola.')}</p>
        <div className="pila">
          <button className="pulsante fantasma" onClick={() => { setCreato(null); setEmail(''); setCopiato(false) }}>{t('Invita un\'altra persona')}</button>
          <Collegamento a="/cerchio" className="pulsante fantasma">{t('Vedi il cerchio')}</Collegamento>
        </div>
      </div>
    )
  }

  return (
    <div className="pagina-app entra">
      <header className="palco-pagina cat-compagnia">
        <span className="palco-icona"><UserPlus size={26} /></span>
        <div className="palco-testi">
          <h1>{t('Invita nel cerchio')}</h1>
          <p className="sottotitolo">{t('Riceverà un link per entrare in')}{' '}<strong>{cerchio.nome}</strong>.</p>
        </div>
      </header>
      <form className="modulo scheda" onSubmit={invia}>
        <fieldset className="scelta">
          <legend>{t('Chi inviti?')}</legend>
          <label className={ruolo === 'FAMILIARE' ? 'attiva' : ''}>
            <input type="radio" name="ruolo" checked={ruolo === 'FAMILIARE'} onChange={() => setRuolo('FAMILIARE')} />
            <Users size={22} />{' '}{t('Un familiare')}
          </label>
          <label className={ruolo === 'BADANTE' ? 'attiva' : ''}>
            <input type="radio" name="ruolo" checked={ruolo === 'BADANTE'} onChange={() => setRuolo('BADANTE')} />
            <HeartHandshake size={22} />{' '}{t('La badante')}
          </label>
        </fieldset>
        <p className="nota">
          {ruolo === 'FAMILIARE'
            ? t('Un familiare vede tutto e può modificare la scheda e i promemoria.')
            : t('La badante vede la scheda, i promemoria e gli appuntamenti, ma non i documenti e non può modificare i promemoria.')}
        </p>
        <label>
          {t('La sua email')}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" />
        </label>
        {errore && <p className="errore" role="alert">{errore}</p>}
        <button className="pulsante" type="submit" disabled={invio}>{invio ? t('Creazione…') : t('Crea il link d’invito')}</button>
      </form>
    </div>
  )
}
