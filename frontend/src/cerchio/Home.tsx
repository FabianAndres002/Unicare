// Dashboard della famiglia: la scheda della persona assistita, le funzioni in arrivo e il cerchio.

import { Cake, CalendarDays, ChevronRight, Languages, MapPin, Pencil, Plus, Receipt, Smartphone, UserPlus, UserSearch, Watch } from 'lucide-react'
import { api, type Cerchio, type Profilo } from '../comune/api'
import { useCarica } from '../comune/useCarica'
import { useDiretta } from '../comune/diretta'
import SchedaRichiesta from '../richieste/SchedaRichiesta'
import { Collegamento } from '../comune/router'
import MedicineOggi from '../medicine/MedicineOggi'
import ProssimaVisita from '../appuntamenti/ProssimaVisita'
import MessaggiFunzione from '../vocali/MessaggiFunzione'
import Avatar from '../comune/Avatar'
import { dataEstesa, eta, saluto } from '../comune/utili'
import { t } from '../comune/lingua'


export default function Home({ profilo, cerchio }: { profilo: Profilo; cerchio: Cerchio }) {
  const puoModificare = cerchio.mioRuolo !== 'BADANTE'
  const { dati: richieste, ricarica } = useCarica(() => api.richieste(cerchio.id, 'attive'), cerchio.id)
  useDiretta('/api/diretta', 'richiesta', ricarica)
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
                <Avatar nome={a.nome} cognome={a.cognome} foto={a.foto} grande className="avatar-chiaro" />
                <div>
                  <p className="etichetta-chiara">{t('La persona che assistete')}</p>
                  <h2>{a.nome} {a.cognome}</h2>
                  <div className="dettagli">
                    {anni !== null && <span><Cake size={16} />{' '}{t('{0} anni', anni)}</span>}
                    {a.comune && <span><MapPin size={16} /> {a.comune}</span>}
                  </div>
                </div>
                {puoModificare && (
                  <Collegamento a={`/anziano/${a.id}`} className="pulsante-icona" aria-current={undefined}>
                    <Pencil size={18} /><span className="sr-only">{t('Modifica la scheda')}</span>
                  </Collegamento>
                )}
              </div>
              <div className="scheda-anziano-basso">
                <MedicineOggi anzianoId={a.id} />
                <ProssimaVisita anzianoId={a.id} />
                {(() => {
                  const n = richieste?.filter((r) => r.anziano.id === a.id).length
                  return <div><span className="numero">{n ?? '—'}</span><span>{n === 1 ? t('richiesta attiva') : t('richieste attive')}</span></div>
                })()}
              </div>
              {puoModificare && (
                <Collegamento a={`/anziano/${a.id}`} className="scheda-anziano-telefono">
                  <Smartphone size={20} /> <span>{t('Il telefono di {0} e la Senior App', a.nome)}</span> <ChevronRight size={20} />
                </Collegamento>
              )}
            </article>
          )
        })}
        {cerchio.anziani.length === 0 && (
          puoModificare ? (
            <Collegamento a="/anziano/nuovo" className="scheda-vuota">
              <Plus size={28} />
              <span><strong>{t('Aggiungi la persona che assistete')}</strong><br />{t('Serve per promemoria e appuntamenti.')}</span>
            </Collegamento>
          ) : (
            <div className="scheda-vuota"><span>{t('La famiglia non ha ancora creato la scheda della persona assistita.')}</span></div>
          )
        )}
      </section>

      {cerchio.anziani.length > 0 && (
        <section>
          <div className="titolo-sezione">
            <h2>{t('Richieste di aiuto')}</h2>
            {daFare > 0 && <span className="distintivo urgente">{t('{0} da fare', daFare)}</span>}
            <Collegamento a="/richieste" className="link-sezione">{t('Vedi tutte')}</Collegamento>
          </div>
          {richieste && richieste.length === 0 && (
            <p className="nota">{t('Nessuna richiesta in sospeso. Tutto tranquillo!')}</p>
          )}
          {richieste && richieste.length > 0 && (
            <div className="elenco-richieste">
              {richieste.slice(0, 3).map((r, i) => <SchedaRichiesta key={r.id} richiesta={r} indice={i} mioId={profilo.id} onCambiata={ricarica} />)}
            </div>
          )}
          <Collegamento a="/richieste/nuova" className="chiedi-aiuto"><span className="chiedi-aiuto-piu"><Plus size={22} /></span><span><strong>{t('Chiedi aiuto al cerchio')}</strong><small>{t('Spesa, farmacia, un passaggio…')}</small></span><ChevronRight size={20} /></Collegamento>
        </section>
      )}

      <section>
        <div className="titolo-sezione"><h2>{t('Funzioni')}</h2></div>
        <div className="griglia-funzioni">
          {cerchio.anziani[0] && (
            <>
              <Collegamento a={`/anziano/${cerchio.anziani[0].id}/appuntamenti`} className="funzione cat-accompagnamento">
                <span className="funzione-icona blu"><CalendarDays size={22} /></span>
                <strong>{t('Appuntamenti')}</strong>
                <span>{t('Visite ed esami')}</span>
              </Collegamento>
              <MessaggiFunzione anziano={cerchio.anziani[0]} />
            </>
          )}
          {profilo.tipo === 'FAMILIARE' && (
            <Collegamento a="/badanti" className="funzione cat-compagnia">
              <span className="funzione-icona viola"><UserSearch size={22} /></span>
              <strong>{t('Trova una badante')}</strong>
              <span>{t('Chi si propone nella tua zona')}</span>
            </Collegamento>
          )}
          {cerchio.anziani[0] && puoModificare && (
            <Collegamento a={`/anziano/${cerchio.anziani[0].id}/documenti`} className="funzione cat-spesa">
              <span className="funzione-icona verde"><Receipt size={22} /></span>
              <strong>{t('Documenti')}</strong>
              <span>{t('Ricette, analisi, ecografie, ricevute')}</span>
            </Collegamento>
          )}
          <Collegamento a="/interprete" className="funzione cat-casa">
            <span className="funzione-icona arancio"><Languages size={22} /></span>
            <strong>{t('Interprete')}</strong>
            <span>{profilo.tipo === 'BADANTE' ? t('Parla con la famiglia nella tua lingua') : t('Parla con la badante nella sua lingua')}</span>
          </Collegamento>
        </div>
      </section>

      <section>
        <div className="titolo-sezione"><h2>{t('Il cerchio')}</h2></div>
        <Collegamento a="/cerchio" className="riga-cerchio scheda">
          <span className="avatar-impilati">
            {cerchio.membri.slice(0, 4).map((m) => <Avatar key={m.id} nome={m.nome} cognome={m.cognome} foto={m.foto} />)}
          </span>
          <span className="riga-testo">
            <strong>{cerchio.membri.length === 1 ? t('Solo tu, per ora') : t('{0} persone', cerchio.membri.length)}</strong>
            <span>{cerchio.membri.map((m) => m.nome).join(', ')}</span>
          </span>
          <ChevronRight size={20} />
        </Collegamento>
        {cerchio.mioRuolo === 'ADMIN' && cerchio.membri.length === 1 && (
          <Collegamento a="/invita" className="invito-banner">
            <UserPlus size={22} />
            <span><strong>{t('Invita familiari e badante')}</strong><br />{t('Così tutti vedono promemoria e appuntamenti.')}</span>
            <ChevronRight size={20} />
          </Collegamento>
        )}
      </section>

      <div className="scheda smartwatch">
        <span className="funzione-icona grigio"><Watch size={22} /></span>
        <span className="riga-testo">
          <strong>{t('Dallo smartwatch')}</strong>
          <span>{t('Battito, passi e sonno della persona assistita. Arriverà dopo la prima versione.')}</span>
        </span>
      </div>
    </div>
  )
}
