// I messaggi vocali tra l'anziano e il cerchio (lato famiglia):
// quelli che ha mandato lui o lei, e le risposte della famiglia.

import { ArrowLeft, Check, CheckCheck, Mic } from 'lucide-react'
import { api, type Anziano, type Vocale } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import Riproduci from '../comune/Riproduci'
import RegistraVocale from '../comune/RegistraVocale'
import { tempoFa } from '../comune/utili'
import { t } from '../comune/lingua'

function Fumetto({ v, nomeAnziano, onAscoltato }: { v: Vocale; nomeAnziano: string; onAscoltato: () => void }) {
  const ascoltato = v.dallAnziano
    ? v.ascoltatoDa ? t('Ascoltato da {0}', v.ascoltatoDa) : t('Nessuno l’ha ancora ascoltato')
    : v.ascoltatoIl ? t('{0} l’ha ascoltato', nomeAnziano) : t('{0} non l’ha ancora ascoltato', nomeAnziano)
  return (
    <li className={`fumetto ${v.dallAnziano ? 'da-anziano' : 'da-famiglia'} ${v.dallAnziano && !v.ascoltatoDa ? 'nuovo' : ''}`}>
      <span className="fumetto-chi">{v.dallAnziano ? nomeAnziano : v.autore} · {tempoFa(v.creatoIl)}</span>
      <Riproduci sorgente={api.audioVocale(v.id)} durata={v.durataSecondi} onAscoltato={onAscoltato} />
      <span className="fumetto-letto">
        {(v.dallAnziano ? v.ascoltatoDa : v.ascoltatoIl) ? <CheckCheck size={14} /> : <Check size={14} />} {ascoltato}
      </span>
    </li>
  )
}

export default function MessaggiPagina({ anziano }: { anziano: Anziano }) {
  const { dati, errore, ricarica } = useCarica(() => api.vocali(anziano.id), anziano.id, 20)

  return (
    <div className="pagina-app entra">
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} />{' '}{t('Home')}</Collegamento>
      <header className="palco-pagina cat-farmacia">
        <span className="palco-icona"><Mic size={26} /></span>
        <div className="palco-testi">
          <h1>{t('Messaggi vocali')}</h1>
          <p className="sottotitolo">
            {t('{0} può lasciarvi un messaggio dal suo telefono, senza scrivere. Potete rispondere con la voce: lo ascolta con un tocco.', anziano.nome)}
          </p>
        </div>
      </header>

      <div className="scheda">
        <RegistraVocale invito={t('Rispondi a {0} con la voce', anziano.nome)} inviato={t('Mandato! Arriva sul telefono di {0}.', anziano.nome)}
          onInvia={async (audio, durata) => { await api.inviaVocale(anziano.id, audio, durata); await ricarica() }} />
      </div>

      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label={t('Caricamento')} />}
      {dati && dati.length === 0 && (
        <div className="scheda vuoto"><Mic size={28} /><p>{t('Ancora nessun messaggio. Quando {0} ne manda uno, ti arriva una notifica.', anziano.nome)}</p></div>
      )}
      {dati && dati.length > 0 && (
        <ul className="fumetti">
          {dati.map((v) => <Fumetto key={v.id} v={v} nomeAnziano={anziano.nome} onAscoltato={() => setTimeout(ricarica, 800)} />)}
        </ul>
      )}
      <p className="nota">{t('I messaggi si cancellano da soli dopo 30 giorni.')}</p>
    </div>
  )
}
