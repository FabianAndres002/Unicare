// Solo per l'amministratore: cancella la scheda della persona assistita e TUTTI i suoi dati.
// Per sicurezza bisogna riscrivere il nome.

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api, messaggioErrore, type Anziano } from '../comune/api'
import { t } from '../comune/lingua'

export default function EliminaScheda({ anziano, onEliminata }: { anziano: Anziano; onEliminata: () => void }) {
  const [apri, setApri] = useState(false)
  const [nome, setNome] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const giusto = nome.trim().toLowerCase() === anziano.nome.trim().toLowerCase()

  async function elimina() {
    setInvio(true)
    setErrore(null)
    try {
      await api.eliminaAnziano(anziano.id)
      onEliminata()
    } catch (e) {
      setErrore(messaggioErrore(e))
      setInvio(false)
    }
  }

  if (!apri) {
    return <button className="link tenue con-icona-piccola" onClick={() => setApri(true)}><Trash2 size={15} />{' '}{t('Cancella la scheda di {0} e tutti i suoi dati', anziano.nome)}</button>
  }
  return (
    <div className="modulo scheda pericolo entra">
      <p className="senza-margine">
        {t('Cancelliamo per sempre la scheda di {0} con', anziano.nome)}{' '}<strong>{t('documenti, appuntamenti, promemoria, richieste, messaggi')}</strong>{' '}{t('e il collegamento del suo telefono. Non si torna indietro.')}
      </p>
      <label>{t('Per confermare, scrivi “{0}”', anziano.nome)}
        <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" />
      </label>
      {errore && <p className="errore" role="alert">{errore}</p>}
      <div className="riga-pulsanti">
        <button className="pulsante fantasma" onClick={() => setApri(false)}>{t('Annulla')}</button>
        <button className="pulsante pericolo" disabled={!giusto || invio} onClick={elimina}>{invio ? t('Cancello…') : t('Cancella per sempre')}</button>
      </div>
    </div>
  )
}
