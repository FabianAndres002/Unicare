// Messaggi vocali nella Senior App: "Manda un messaggio vocale" e quelli arrivati dalla famiglia.
// Niente da scrivere: si parla e si ascolta.

import { CheckCheck } from 'lucide-react'
import { api, type Vocale } from '../comune/api'
import Riproduci from '../comune/Riproduci'
import RegistraVocale from '../comune/RegistraVocale'
import { tempoFa } from '../comune/utili'
import { t } from '../comune/lingua'

function MessaggioRicevuto({ v, onAscoltato }: { v: Vocale; onAscoltato: () => void }) {
  const nuovo = !v.ascoltatoIl
  return (
    <li className={`senior-vocale ${nuovo ? 'nuovo' : ''}`}>
      <p><strong>{t('Messaggio da {0}', v.autore)}</strong> {nuovo && <span className="distintivo urgente">{t('Nuovo')}</span>}</p>
      <Riproduci sorgente={api.senior.audioVocale(v.id)} durata={v.durataSecondi} grande etichetta={t('Ascolta il messaggio di {0}', v.autore)} onAscoltato={onAscoltato} />
      <small>{tempoFa(v.creatoIl)}</small>
    </li>
  )
}

export default function MessaggiSenior({ vocali, onCambiata }: { vocali: Vocale[]; onCambiata: () => void }) {
  const ricevuti = vocali.filter((v) => !v.dallAnziano).slice(0, 5)
  const ultimoMio = vocali.find((v) => v.dallAnziano)
  return (
    <section>
      <h2>{t('Messaggi')}</h2>
      <div className="senior-messaggi">
        {ricevuti.some((v) => !v.ascoltatoIl) && (
          <ul className="senior-vocali-nuovi">
            {ricevuti.filter((v) => !v.ascoltatoIl).map((v) => <MessaggioRicevuto key={v.id} v={v} onAscoltato={() => setTimeout(onCambiata, 800)} />)}
          </ul>
        )}

        <RegistraVocale grande invito={t('Manda un messaggio vocale')} inviato={t('Mandato! Lo riceve tutta la famiglia.')}
          onInvia={async (audio, durata) => { await api.senior.inviaVocale(audio, durata); onCambiata() }} />

        {ultimoMio && (
          <p className="senior-nota-vocale">
            <CheckCheck size={20} />{' '}{t('Il tuo ultimo messaggio, {0}:', tempoFa(ultimoMio.creatoIl))} 
            {ultimoMio.ascoltatoDa ? <strong>{t('l’ha ascoltato {0}', ultimoMio.ascoltatoDa)}</strong> : t('non l’ha ancora ascoltato nessuno')}
          </p>
        )}

        {ricevuti.some((v) => v.ascoltatoIl) && (
          <ul className="senior-vocali-vecchi">
            {ricevuti.filter((v) => v.ascoltatoIl).map((v) => <MessaggioRicevuto key={v.id} v={v} onAscoltato={() => {}} />)}
          </ul>
        )}
      </div>
    </section>
  )
}
