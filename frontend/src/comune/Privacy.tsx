// Informativa privacy, in parole semplici. Si apre anche senza login (/privacy).
// Testo di partenza: prima della messa online va fatto rivedere (titolare, contatti, DPO).

import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Collegamento } from './router'
import { t } from './lingua'

export default function Privacy({ indietro = '/' }: { indietro?: string }) {
  return (
    <div className="pagina-app pagina-testo entra">
      <Collegamento a={indietro} className="indietro"><ArrowLeft size={18} />{' '}{t('Indietro')}</Collegamento>
      <header className="palco-pagina cat-spesa">
        <span className="palco-icona"><ShieldCheck size={26} /></span>
        <div className="palco-testi">
          <h1>{t('La tua privacy su Unicare')}</h1>
          <p className="sottotitolo">{t('Cosa salviamo, perché, chi lo vede e come cancellarlo. Versione di novembre 2026.')}</p>
        </div>
      </header>

      <section>
        <h2>{t('Cosa salviamo')}</h2>
        <ul>
          <li><strong>{t('Di familiari e badanti:')}</strong>{' '}{t('nome, cognome, email e password (salvata in modo che nessuno, nemmeno noi, possa leggerla).')}</li>
          <li><strong>{t('Della persona assistita:')}</strong>{' '}{t('nome, cognome e, se li inserite, data di nascita e comune.')}</li>
          <li><strong>{t('Quello che fate nell’app:')}</strong>{' '}{t('richieste di aiuto, appuntamenti, orari dei promemoria delle medicine e le conferme “Fatto”, messaggi vocali.')}</li>
          <li><strong>{t('Documenti sanitari')}</strong>{' '}{t('(ricette, analisi, ecografie, ricevute), solo se li caricate voi.')}</li>
        </ul>
        <p>{t('Il')}{' '}<strong>{t('nome delle medicine non si salva mai')}</strong>{t(': i promemoria dicono solo “Medicine del mattino”.')}</p>
      </section>

      <section>
        <h2>{t('Perché')}</h2>
        <p>{t('Solo per aiutare la famiglia a organizzarsi. Non vendiamo i dati, non li usiamo per pubblicità e non li diamo a nessuno.')}</p>
      </section>

      <section>
        <h2>{t('Il consenso della persona assistita')}</h2>
        <p>
          {t('Prima di creare la scheda, di attivare i promemoria delle medicine e di caricare documenti sanitari chiediamo che la persona assistita sia d’accordo. Lo registriamo con la data e con il nome di chi l’ha confermato. I documenti sanitari e le medicine sono “categorie particolari” di dati (art. 9 del GDPR): per questo servono consensi a parte.')}
        </p>
      </section>

      <section>
        <h2>{t('Chi vede cosa')}</h2>
        <ul>
          <li>{t('Ogni cerchio è separato: chi non ne fa parte non vede nulla, nemmeno che esiste.')}</li>
          <li><strong>{t('Familiari:')}</strong>{' '}{t('tutto quello del loro cerchio.')}</li>
          <li><strong>{t('Badante:')}</strong>{' '}{t('richieste, appuntamenti, promemoria e messaggi.')}{' '}<strong>{t('Non vede i documenti sanitari.')}</strong></li>
          <li><strong>{t('Il telefono della persona assistita')}</strong>{' '}{t('vede solo le sue richieste, i suoi appuntamenti, le sue medicine e i suoi messaggi.')}</li>
        </ul>
      </section>

      <section>
        <h2>{t('Per quanto tempo')}</h2>
        <ul>
          <li>{t('I messaggi vocali si cancellano da soli dopo 30 giorni.')}</li>
          <li>{t('Tutto il resto resta finché non lo cancellate voi: un documento, la scheda della persona assistita o il vostro account.')}</li>
        </ul>
      </section>

      <section>
        <h2>{t('I tuoi diritti')}</h2>
        <p>{t('Dal tuo')}{' '}<strong>{t('Profilo')}</strong>{t(', in qualsiasi momento, puoi:')}</p>
        <ul>
          <li><strong>{t('scaricare i tuoi dati')}</strong>{' '}{t('in un file;')}</li>
          <li><strong>{t('cancellare il tuo account')}</strong>{t('. Se eri l’unico familiare di un cerchio, il cerchio viene cancellato con tutti i suoi dati.')}</li>
        </ul>
        <p>{t('L’amministratore del cerchio può cancellare la scheda della persona assistita, con tutti i suoi dati e documenti.')}</p>
      </section>

      <section>
        <h2>{t('Sicurezza')}</h2>
        <p>
          {t('L’accesso è protetto da password, con un blocco dopo troppi tentativi sbagliati. Una volta online, tutto viaggerà cifrato (https) e i dati staranno su server in Europa.')}
        </p>
      </section>
    </div>
  )
}
