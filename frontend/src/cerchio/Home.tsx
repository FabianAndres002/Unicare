// Dashboard della famiglia: la scheda della persona assistita, le funzioni in arrivo e il cerchio.

import { CalendarDays, Cake, ChevronRight, MapPin, Pencil, Pill, Plus, Receipt, UserPlus, Watch } from 'lucide-react'
import { api, type Cerchio, type Profilo } from '../comune/api'
import { useCarica } from '../comune/useCarica'
import SchedaRichiesta from '../richieste/SchedaRichiesta'
import { Collegamento } from '../comune/router'
import Avatar from '../comune/Avatar'
import { dataEstesa, eta, saluto } from '../comune/utili'

const IN_ARRIVO = [
  { Icona: Pill, titolo: 'Medicine', testo: 'Promemoria con “Fatto”', colore: 'arancio' },
  { Icona: CalendarDays, titolo: 'Appuntamenti', testo: 'Visite ed esami', colore: 'blu' },
  { Icona: Receipt, titolo: 'Ricevute e spese', testo: 'Mai più fogli persi', colore: 'verde' },
]

export default function Home({ profilo, cerchio }: { profilo: Profilo; cerchio: Cerchio }) {
  const puoModificare = cerchio.mioRuolo !== 'BADANTE'
  const { dati: richieste, ricarica } = useCarica(() => api.richieste(cerchio.id, 'attive'), cerchio.id)
  const daFare = richieste?.filter((r) => r.stato === 'APERTA').length ?? 0
  return (
    <div className="pagina-app entra">
      <header className="saluto">
        <p className="data-oggi">{dataEstesa(new Date())}</p>
        <h1>{saluto()}, {profilo.nome}</h1>
      </header>

      <section className="anziani">
        {cerchio.anziani.map((a) => {
          const anni = eta(a.dataNascita)
          return (
            <article key={a.id} className="scheda-anziano">
              <div className="scheda-anziano-alto">
                <Avatar nome={a.nome} cognome={a.cognome} grande className="avatar-chiaro" />
                <div>
                  <p className="etichetta-chiara">La persona che assistete</p>
                  <h2>{a.nome} {a.cognome}</h2>
                  <div className="dettagli">
                    {anni !== null && <span><Cake size={16} /> {anni} anni</span>}
                    {a.comune && <span><MapPin size={16} /> {a.comune}</span>}
                  </div>
                </div>
                {puoModificare && (
                  <Collegamento a={`/anziano/${a.id}`} className="pulsante-icona" aria-current={undefined}>
                    <Pencil size={18} /><span className="sr-only">Modifica la scheda</span>
                  </Collegamento>
                )}
              </div>
              <div className="scheda-anziano-basso">
                <div><span className="numero">—</span><span>medicine oggi</span></div>
                <div><span className="numero">—</span><span>prossima visita</span></div>
                {(() => {
                  const n = richieste?.filter((r) => r.anziano.id === a.id).length
                  return <div><span className="numero">{n ?? '—'}</span><span>{n === 1 ? 'richiesta attiva' : 'richieste attive'}</span></div>
                })()}
              </div>
            </article>
          )
        })}
        {cerchio.anziani.length === 0 && (
          puoModificare ? (
            <Collegamento a="/anziano/nuovo" className="scheda-vuota">
              <Plus size={28} />
              <span><strong>Aggiungi la persona che assistete</strong><br />Serve per promemoria e appuntamenti.</span>
            </Collegamento>
          ) : (
            <div className="scheda-vuota"><span>La famiglia non ha ancora creato la scheda della persona assistita.</span></div>
          )
        )}
      </section>

      {cerchio.anziani.length > 0 && (
        <section>
          <div className="titolo-sezione">
            <h2>Richieste di aiuto</h2>
            {daFare > 0 && <span className="distintivo urgente">{daFare} da fare</span>}
            <Collegamento a="/richieste" className="link-sezione">Vedi tutte</Collegamento>
          </div>
          {richieste && richieste.length === 0 && (
            <p className="nota">Nessuna richiesta in sospeso. Tutto tranquillo!</p>
          )}
          {richieste && richieste.length > 0 && (
            <div className="elenco-richieste">
              {richieste.slice(0, 3).map((r) => <SchedaRichiesta key={r.id} richiesta={r} mioId={profilo.id} onCambiata={ricarica} />)}
            </div>
          )}
          <Collegamento a="/richieste/nuova" className="pulsante secondario con-icona"><Plus size={20} /> Chiedi aiuto al cerchio</Collegamento>
        </section>
      )}

      <section>
        <div className="titolo-sezione"><h2>Funzioni</h2><span className="distintivo">in arrivo</span></div>
        <div className="griglia-funzioni">
          {IN_ARRIVO.map(({ Icona, titolo, testo, colore }) => (
            <div key={titolo} className="funzione" aria-disabled="true">
              <span className={`funzione-icona ${colore}`}><Icona size={22} /></span>
              <strong>{titolo}</strong>
              <span>{testo}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="titolo-sezione"><h2>Il cerchio</h2></div>
        <Collegamento a="/cerchio" className="riga-cerchio scheda">
          <span className="avatar-impilati">
            {cerchio.membri.slice(0, 4).map((m) => <Avatar key={m.id} nome={m.nome} cognome={m.cognome} />)}
          </span>
          <span className="riga-testo">
            <strong>{cerchio.membri.length === 1 ? 'Solo tu, per ora' : `${cerchio.membri.length} persone`}</strong>
            <span>{cerchio.membri.map((m) => m.nome).join(', ')}</span>
          </span>
          <ChevronRight size={20} />
        </Collegamento>
        {cerchio.mioRuolo === 'ADMIN' && cerchio.membri.length === 1 && (
          <Collegamento a="/invita" className="invito-banner">
            <UserPlus size={22} />
            <span><strong>Invita familiari e badante</strong><br />Così tutti vedono promemoria e appuntamenti.</span>
            <ChevronRight size={20} />
          </Collegamento>
        )}
      </section>

      <div className="scheda smartwatch">
        <span className="funzione-icona grigio"><Watch size={22} /></span>
        <span className="riga-testo">
          <strong>Dallo smartwatch</strong>
          <span>Battito, passi e sonno della persona assistita. Arriverà dopo la prima versione.</span>
        </span>
      </div>
    </div>
  )
}
