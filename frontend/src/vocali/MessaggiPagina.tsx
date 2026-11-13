// I messaggi vocali tra l'anziano e il cerchio (lato famiglia):
// quelli che ha mandato lui o lei, e le risposte della famiglia.

import { ArrowLeft, Check, CheckCheck, Mic } from 'lucide-react'
import { api, type Anziano, type Vocale } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import Riproduci from '../comune/Riproduci'
import RegistraVocale from '../comune/RegistraVocale'
import { tempoFa } from '../comune/utili'

function Fumetto({ v, nomeAnziano, onAscoltato }: { v: Vocale; nomeAnziano: string; onAscoltato: () => void }) {
  const ascoltato = v.dallAnziano
    ? v.ascoltatoDa ? `Ascoltato da ${v.ascoltatoDa}` : 'Nessuno l’ha ancora ascoltato'
    : v.ascoltatoIl ? `${nomeAnziano} l’ha ascoltato` : `${nomeAnziano} non l’ha ancora ascoltato`
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
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} /> Home</Collegamento>
      <header className="intestazione-pagina">
        <h1>Messaggi vocali</h1>
        <p className="sottotitolo">
          {anziano.nome} può lasciarvi un messaggio dal suo telefono, senza scrivere. Potete rispondere con la voce: lo ascolta con un tocco.
        </p>
      </header>

      <div className="scheda">
        <RegistraVocale invito={`Rispondi a ${anziano.nome} con la voce`} inviato={`Mandato! Arriva sul telefono di ${anziano.nome}.`}
          onInvia={async (audio, durata) => { await api.inviaVocale(anziano.id, audio, durata); await ricarica() }} />
      </div>

      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}
      {dati && dati.length === 0 && (
        <div className="scheda vuoto"><Mic size={28} /><p>Ancora nessun messaggio. Quando {anziano.nome} ne manda uno, ti arriva una notifica.</p></div>
      )}
      {dati && dati.length > 0 && (
        <ul className="fumetti">
          {dati.map((v) => <Fumetto key={v.id} v={v} nomeAnziano={anziano.nome} onAscoltato={() => setTimeout(ricarica, 800)} />)}
        </ul>
      )}
      <p className="nota">I messaggi si cancellano da soli dopo 30 giorni.</p>
    </div>
  )
}
