import { useEffect, useState, type FormEvent } from 'react'
import { HeartHandshake, KeyRound, Users } from 'lucide-react'
import { api, messaggioErrore, type DatiRegistrazione, type Profilo, type TipoUtente } from '../comune/api'
import { lingua, t } from '../comune/lingua'

type Props = {
  onEntrato: (profilo: Profilo) => void
  /** Dall'invito: email e tipo sono già decisi. */
  emailIniziale?: string
  tipoFisso?: TipoUtente
  /** Il token del link d'invito: vale al posto del codice segreto. */
  invito?: string
}

export default function ModuloRegistrati({ onEntrato, emailIniziale = '', tipoFisso, invito }: Props) {
  const [dati, setDati] = useState<DatiRegistrazione>({
    email: emailIniziale, password: '', nome: '', cognome: '', tipo: tipoFisso ?? 'FAMILIARE',
  })
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  // Durante la prova in famiglia il server può chiedere un codice segreto (non a chi ha un invito).
  const [serveCodice, setServeCodice] = useState(false)
  const [codice, setCodice] = useState('')
  useEffect(() => {
    if (!invito) api.registrazione().then((r) => setServeCodice(r.serveCodice), () => {})
  }, [invito])

  const cambia = (campo: keyof DatiRegistrazione) => (valore: string) => setDati((d) => ({ ...d, [campo]: valore }))

  async function invia(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    if (dati.password.length < 8) {
      setErrore(t('La password deve avere almeno 8 caratteri.'))
      return
    }
    setInvio(true)
    try {
      onEntrato(await api.registrati({ ...dati, lingua: lingua(), ...(invito ? { invito } : {}), ...(serveCodice ? { codice } : {}) }))
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="modulo" onSubmit={invia}>
      {!tipoFisso && (
        <fieldset className="scelta">
          <legend>{t('Chi sei?')}</legend>
          <label className={dati.tipo === 'FAMILIARE' ? 'attiva' : ''}>
            <input type="radio" name="tipo" checked={dati.tipo === 'FAMILIARE'} onChange={() => cambia('tipo')('FAMILIARE')} />
            <Users size={22} />{' '}{t('Un familiare')}
          </label>
          <label className={dati.tipo === 'BADANTE' ? 'attiva' : ''}>
            <input type="radio" name="tipo" checked={dati.tipo === 'BADANTE'} onChange={() => cambia('tipo')('BADANTE')} />
            <HeartHandshake size={22} />{' '}{t('Una badante')}
          </label>
        </fieldset>
      )}
      <div className="due-colonne">
        <label>
          {t('Nome')}
          <input autoComplete="given-name" required value={dati.nome} onChange={(e) => cambia('nome')(e.target.value)} />
        </label>
        <label>
          {t('Cognome')}
          <input autoComplete="family-name" required value={dati.cognome} onChange={(e) => cambia('cognome')(e.target.value)} />
        </label>
      </div>
      <label>
        {t('Email')}
        <input type="email" autoComplete="email" required value={dati.email} readOnly={!!emailIniziale}
          onChange={(e) => cambia('email')(e.target.value)} />
      </label>
      <label>
        <span>{t('Password')}{' '}<span className="nota">{t('almeno 8 caratteri')}</span></span>
        <input type="password" autoComplete="new-password" required value={dati.password}
          onChange={(e) => cambia('password')(e.target.value)} />
      </label>
      {serveCodice && (
        <label>
          <span><KeyRound size={16} />{' '}{t('Codice di invito')}{' '}<span className="nota">{t('è nel messaggio di chi ti ha invitato')}</span></span>
          <input autoComplete="off" autoCapitalize="none" required value={codice} onChange={(e) => setCodice(e.target.value)} />
        </label>
      )}
      {errore && <p className="errore" role="alert">{errore}</p>}
      <button className="pulsante" type="submit" disabled={invio}>{invio ? t('Creazione…') : t('Crea account')}</button>
    </form>
  )
}
