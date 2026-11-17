// Il mio numero di telefono: chi lo lascia compare nella Senior App con il pulsante "Chiama".

import { useState, type FormEvent } from 'react'
import { Check, Phone } from 'lucide-react'
import { api, messaggioErrore, type Profilo } from '../comune/api'
import { t } from '../comune/lingua'

export default function TelefonoProfilo({ profilo, onProfilo }: { profilo: Profilo; onProfilo: (p: Profilo) => void }) {
  const [numero, setNumero] = useState(profilo.telefono ?? '')
  const [invio, setInvio] = useState(false)
  const [salvato, setSalvato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function salva(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      const aggiornato = await api.preferenze({ telefono: numero })
      onProfilo(aggiornato)
      setNumero(aggiornato.telefono ?? '')
      setSalvato(true)
      setTimeout(() => setSalvato(false), 2500)
    } catch (err) {
      setErrore(messaggioErrore(err))
    }
    setInvio(false)
  }

  return (
    <form className="scheda telefono-profilo" onSubmit={salva}>
      <div className="telefono-profilo-testa">
        <span className="funzione-icona verde"><Phone size={22} /></span>
        <span className="riga-testo">
          <strong>{t('Il tuo numero di telefono')}</strong>
          <span>{t('Nella Senior App compare il pulsante grande “Chiama {0}”. Lo vede solo il telefono della persona assistita.', profilo.nome)}</span>
        </span>
      </div>
      <div className="telefono-profilo-riga">
        <input className="campo" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder={t('Es. 333 123 4567')}
          value={numero} onChange={(e) => setNumero(e.target.value)} aria-label={t('Numero di telefono')} />
        <button className="pulsante piccolo" disabled={invio || numero.replace(/ /g, '') === (profilo.telefono ?? '')}>
          {salvato ? <><Check size={18} />{' '}{t('Salvato')}</> : t('Salva')}
        </button>
      </div>
      {errore && <p className="errore" role="alert">{errore}</p>}
    </form>
  )
}
