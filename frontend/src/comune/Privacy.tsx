// Informativa privacy, in parole semplici. Si apre anche senza login (/privacy).
// Testo di partenza: prima della messa online va fatto rivedere (titolare, contatti, DPO).

import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Collegamento } from './router'

export default function Privacy({ indietro = '/' }: { indietro?: string }) {
  return (
    <div className="pagina-app pagina-testo entra">
      <Collegamento a={indietro} className="indietro"><ArrowLeft size={18} /> Indietro</Collegamento>
      <header className="intestazione-pagina">
        <span className="funzione-icona verde"><ShieldCheck size={22} /></span>
        <h1>La tua privacy su Unicare</h1>
        <p className="sottotitolo">Cosa salviamo, perché, chi lo vede e come cancellarlo. Versione di novembre 2026.</p>
      </header>

      <section>
        <h2>Cosa salviamo</h2>
        <ul>
          <li><strong>Di familiari e badanti:</strong> nome, cognome, email e password (salvata in modo che nessuno, nemmeno noi, possa leggerla).</li>
          <li><strong>Della persona assistita:</strong> nome, cognome e, se li inserite, data di nascita e comune.</li>
          <li><strong>Quello che fate nell’app:</strong> richieste di aiuto, appuntamenti, orari dei promemoria delle medicine e le conferme “Fatto”, messaggi vocali.</li>
          <li><strong>Documenti sanitari</strong> (ricette, analisi, ecografie, ricevute), solo se li caricate voi.</li>
        </ul>
        <p>Il <strong>nome delle medicine non si salva mai</strong>: i promemoria dicono solo “Medicine del mattino”.</p>
      </section>

      <section>
        <h2>Perché</h2>
        <p>Solo per aiutare la famiglia a organizzarsi. Non vendiamo i dati, non li usiamo per pubblicità e non li diamo a nessuno.</p>
      </section>

      <section>
        <h2>Il consenso della persona assistita</h2>
        <p>
          Prima di creare la scheda, di attivare i promemoria delle medicine e di caricare documenti sanitari chiediamo che la persona
          assistita sia d’accordo. Lo registriamo con la data e con il nome di chi l’ha confermato. I documenti sanitari e le medicine
          sono “categorie particolari” di dati (art. 9 del GDPR): per questo servono consensi a parte.
        </p>
      </section>

      <section>
        <h2>Chi vede cosa</h2>
        <ul>
          <li>Ogni cerchio è separato: chi non ne fa parte non vede nulla, nemmeno che esiste.</li>
          <li><strong>Familiari:</strong> tutto quello del loro cerchio.</li>
          <li><strong>Badante:</strong> richieste, appuntamenti, promemoria e messaggi. <strong>Non vede i documenti sanitari.</strong></li>
          <li><strong>Il telefono della persona assistita</strong> vede solo le sue richieste, i suoi appuntamenti, le sue medicine e i suoi messaggi.</li>
        </ul>
      </section>

      <section>
        <h2>Per quanto tempo</h2>
        <ul>
          <li>I messaggi vocali si cancellano da soli dopo 30 giorni.</li>
          <li>Tutto il resto resta finché non lo cancellate voi: un documento, la scheda della persona assistita o il vostro account.</li>
        </ul>
      </section>

      <section>
        <h2>I tuoi diritti</h2>
        <p>Dal tuo <strong>Profilo</strong>, in qualsiasi momento, puoi:</p>
        <ul>
          <li><strong>scaricare i tuoi dati</strong> in un file;</li>
          <li><strong>cancellare il tuo account</strong>. Se eri l’unico familiare di un cerchio, il cerchio viene cancellato con tutti i suoi dati.</li>
        </ul>
        <p>L’amministratore del cerchio può cancellare la scheda della persona assistita, con tutti i suoi dati e documenti.</p>
      </section>

      <section>
        <h2>Sicurezza</h2>
        <p>
          L’accesso è protetto da password, con un blocco dopo troppi tentativi sbagliati. Una volta online, tutto viaggerà cifrato (https)
          e i dati staranno su server in Europa.
        </p>
      </section>
    </div>
  )
}
