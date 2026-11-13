# Unicare

App per cellulare che unisce anziani, familiari e badanti: richieste di aiuto, promemoria, calendario, documenti sanitari.
Stack: **React + TypeScript** (PWA) · **Node.js + TypeScript + Express** · **PostgreSQL**.

Stato: **Fase 4, settimana 8**: registrazione e login, cerchio familiare, scheda della persona
assistita con consenso privacy, inviti, richieste di aiuto, avvisi via email, **Senior App** su
`/senior`, promemoria delle medicine, notifiche push, calendario degli appuntamenti, messaggi vocali.
Novità della settimana 8:

- **Documenti sanitari**: ricette e prescrizioni, analisi, ecografie e lastre, referti, ricevute.
  Si fa una foto (rimpicciolita automaticamente) o si carica un PDF, fino a 10 MB. Filtri per tipo,
  ricerca, totale delle **spese mediche dell'anno** dalle ricevute (utile per il 730). Li vedono solo
  familiari e amministratore, non la badante; la prima volta serve il consenso dell'anziano.
  Il server accetta solo JPEG, PNG, WEBP, HEIC e PDF, controllando i primi byte del file;
- **privacy**: informativa su `/privacy`; nel Profilo "Scarica i miei dati" e "Cancella il mio
  account" (con la password); l'amministratore può cancellare la scheda dell'anziano con tutti i
  dati; dopo 10 password sbagliate il login si blocca per 15 minuti; intestazioni di sicurezza.

La messa online è rimandata alla fine del progetto. I file dei documenti sono nel database:
online, con molti utenti, andranno spostati in uno spazio file a parte.

90 test automatici.

### Le email in sviluppo

Finché non è impostato un servizio di posta, **nessuna email viene spedita**: ognuna viene salvata
come pagina nella cartella `backend/.posta-locale` (aprila con un doppio clic) e nel terminale del
backend compare una riga `✉ Email a ...`. Così si vede com'è senza rischiare di scrivere a nessuno.

### Provare la Senior App sul computer

1. Entra come familiare, apri la scheda dell'anziano dalla Home e tocca **Collega il telefono**.
2. Apri una finestra in incognito (Ctrl+Shift+N) su `http://localhost:5173/senior`.
3. Scrivi il codice. Per vederla "da telefono": F12, poi l'icona del telefono in alto a sinistra.

### Provare le notifiche

1. Profilo → **Attiva le notifiche** (il browser chiede il permesso).
2. Nella Senior App tocca **Sì, attiva le notifiche**.
3. Nella pagina Medicine metti un orario tra un paio di minuti: entro un minuto arriva la notifica.

Sull'**iPhone** le notifiche arrivano solo se Unicare è aggiunta alla schermata Home (Condividi →
"Aggiungi alla schermata Home") e con iOS 16.4 o più recente. Su Android basta Chrome.

## Struttura

```
unicare/
  backend/     Node.js + Express in TypeScript. Codice in src/
                 src/accesso/   registrazione, login, logout
                 src/cerchio/   cerchi, membri, scheda dell'anziano, inviti, permessi
                 src/richieste/ richieste di aiuto e i loro stati
                 src/db/        collegamento al database e migrazioni (src/db/migrazioni/V1__...sql)
               Test in test/
  frontend/    React + TypeScript con Vite. Installabile come app (PWA)
  .vscode/     Comandi per avviare tutto da VS Code
```

## Cosa installare (una volta sola)

- **Node.js** versione LTS (22 o più recente): https://nodejs.org
- **VS Code**

Basta questo: niente Java, niente Docker, niente PostgreSQL da installare.
Il backend avvia da solo un **PostgreSQL integrato** (PGlite, gira dentro Node).
I dati restano nella cartella `backend/.database-locale`
(per ripartire da zero: ferma il backend e cancella quella cartella).

## Avviare tutto da VS Code

1. In VS Code: **File → Open Folder…** e scegli la cartella del progetto.
2. Premi **Ctrl+Shift+B**: parte **Avvia Unicare**, che apre due terminali in ordine:
   - **1. Backend**: è pronto quando compare `Unicare backend in ascolto su http://localhost:8080`
   - **2. Frontend**: è pronto quando compare `ready in ...` e `Local: http://localhost:5173/`
3. Apri http://localhost:5173 nel browser.

Il primo avvio richiede un minuto: installa le librerie di backend e frontend (`npm install`).

Il backend si riavvia da solo quando modifichi un file, il frontend si aggiorna da solo nel browser.

**Per fermare:** clicca nel terminale del backend e premi **Ctrl+C**, poi lo stesso nel terminale del frontend.
Usa sempre Ctrl+C sul backend: così anche il database si chiude bene.

**Test automatici:** Ctrl+Shift+P → "Tasks: Run Task" → **Test del backend**.
Ogni test usa un database in memoria tutto suo: i tuoi dati non si toccano.

## Avviare tutto a mano (dal terminale)

```bash
cd backend
npm install                   # solo la prima volta
npm run dev
```

In un secondo terminale:

```bash
cd frontend
npm install                   # solo la prima volta
npm run dev
```

Prova: http://localhost:8080/api/stato deve rispondere `{"app":"Unicare","database":"ok","tabelle":7}`,
e su http://localhost:5173 compare la schermata di accesso.

Altri comandi del backend: `npm test` (test automatici), `npm run controlla` (controllo dei tipi TypeScript).

## Usare un PostgreSQL vero (per esempio in produzione)

Imposta queste variabili d'ambiente prima di avviare il backend:

- `DATABASE_URL`, per esempio `postgres://utente:password@host:5432/unicare`
- `JWT_SECRET`, una frase segreta lunga e casuale (in produzione è obbligatoria)
- `NODE_ENV=production` (il cookie di accesso viaggia solo su HTTPS)
- `URL_APP`, l'indirizzo pubblico dell'app (serve per i link nelle email)
- per spedire davvero le email (per esempio con Brevo): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASSWORD`, `SMTP_FROM`
- per le notifiche push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (per esempio
  `mailto:...`). Se mancano, il backend genera le chiavi una volta e le salva nel database.
- `FUSO_ORARIO` (predefinito `Europe/Rome`), per gli orari dei promemoria

## API disponibili

| Metodo | Indirizzo | Cosa fa | Serve il login? |
|---|---|---|---|
| GET | `/api/stato` | Controlla backend e database | No |
| POST | `/api/auth/registrati` | Crea l'account e fa entrare | No |
| POST | `/api/auth/login` | Accesso con email e password | No |
| POST | `/api/auth/logout` | Esce | Sì |
| GET | `/api/auth/io` | Dice chi è l'utente collegato | Sì |
| GET | `/api/cerchi` | I miei cerchi | Sì |
| POST | `/api/cerchi` | Crea un cerchio (solo familiari) | Sì |
| GET | `/api/cerchi/:id` | Anziani, membri, inviti in attesa | Sì, membro |
| PATCH | `/api/cerchi/:id` | Rinomina il cerchio | Amministratore |
| DELETE | `/api/cerchi/:id/membri/:utenteId` | Toglie una persona dal cerchio | Amministratore |
| POST | `/api/cerchi/:id/anziani` | Aggiunge la persona assistita (con consenso) | Amministratore, familiare |
| PUT | `/api/anziani/:id` | Modifica la scheda | Amministratore, familiare |
| POST | `/api/cerchi/:id/inviti` | Crea un link d'invito (7 giorni, monouso) | Amministratore |
| DELETE | `/api/inviti/:id` | Annulla un invito | Amministratore |
| GET | `/api/inviti/token/:token` | Anteprima dell'invito | No |
| POST | `/api/inviti/token/:token/accetta` | Entra nel cerchio | Sì |
| GET | `/api/cerchi/:id/richieste?vista=attive\|concluse` | Richieste di aiuto del cerchio | Sì, membro |
| POST | `/api/cerchi/:id/richieste` | Nuova richiesta | Sì, membro |
| GET | `/api/richieste/:id` | Dettaglio con lo storico | Sì, membro |
| POST | `/api/richieste/:id/prendi` | "Me ne occupo io" | Sì, membro |
| POST | `/api/richieste/:id/rilascia` | "Non riesco più" | Chi l'ha presa |
| POST | `/api/richieste/:id/completa` | "Fatto" (nota facoltativa) | Chi l'ha presa, amministratore |
| POST | `/api/richieste/:id/annulla` | "Non serve più" | Chi l'ha creata, amministratore |
| PATCH | `/api/auth/io` | Accende o spegne gli avvisi via email | Sì |
| GET | `/api/anziani/:id/telefono` | Telefoni collegati e codice in attesa | Amministratore, familiare |
| POST | `/api/anziani/:id/telefono/codice` | Nuovo codice di 6 cifre (24 ore, monouso) | Amministratore, familiare |
| DELETE | `/api/anziani/:id/telefono/:dispositivoId` | Scollega un telefono | Amministratore, familiare |
| POST | `/api/senior/collega` | Il telefono dell'anziano scambia il codice (5 errori → 15 minuti di attesa) | No |
| GET | `/api/senior/io` | Nome, famiglia e richieste dell'anziano | Telefono collegato |
| POST | `/api/senior/richieste` | "Chiedi aiuto" | Telefono collegato |
| POST | `/api/senior/richieste/:id/annulla` | "Non serve più" | Telefono collegato |
| POST | `/api/senior/esci` | Scollega questo telefono | Telefono collegato |
| POST | `/api/senior/medicine/:id/fatto` | "Fatto, le ho prese" | Telefono collegato |
| POST | `/api/senior/medicine/:id/rimanda` | "Ricordamelo tra 15 minuti" | Telefono collegato |
| POST | `/api/senior/push` | Il telefono dell'anziano riceve le notifiche | Telefono collegato |
| POST | `/api/senior/vocali?durata=12` | Messaggio vocale al cerchio (il corpo è l'audio) | Telefono collegato |
| GET | `/api/senior/vocali/:id/audio` | Ascolta un messaggio | Telefono collegato |
| GET | `/api/anziani/:id/appuntamenti` | Appuntamenti in programma e passati | Sì, membro |
| POST | `/api/anziani/:id/appuntamenti` | Nuovo appuntamento | Amministratore, familiare |
| PATCH | `/api/appuntamenti/:id` | Cambia un appuntamento | Amministratore, familiare |
| DELETE | `/api/appuntamenti/:id` | Toglie un appuntamento | Amministratore, familiare |
| POST | `/api/appuntamenti/:id/accompagno` | "Ci vado io" | Sì, membro |
| DELETE | `/api/appuntamenti/:id/accompagno` | "Non riesco più" | Chi ci va |
| GET | `/api/anziani/:id/documenti` | Documenti, consenso, spese dell'anno | Amministratore, familiare |
| POST | `/api/anziani/:id/documenti?categoria=&titolo=&data=` | Carica un documento (il corpo è il file) | Amministratore, familiare |
| GET | `/api/documenti/:id/file` | Il file | Amministratore, familiare |
| PATCH | `/api/documenti/:id` | Cambia nome, tipo, data, note, importo | Amministratore, familiare |
| DELETE | `/api/documenti/:id` | Toglie un documento | Amministratore, familiare |
| GET | `/api/auth/io/dati` | Scarica tutti i miei dati | Sì |
| DELETE | `/api/auth/io` | Cancella il mio account (con la password) | Sì |
| DELETE | `/api/anziani/:id` | Cancella la scheda e tutti i suoi dati | Amministratore |
| GET | `/api/anziani/:id/vocali` | Messaggi vocali degli ultimi 30 giorni | Sì, membro |
| POST | `/api/anziani/:id/vocali?durata=12` | Vocale all'anziano (il corpo è l'audio) | Sì, membro |
| GET | `/api/vocali/:id/audio` | Ascolta un messaggio | Sì, membro |
| GET | `/api/anziani/:id/medicine` | Promemoria, medicine di oggi, consenso | Sì, membro |
| POST | `/api/anziani/:id/promemoria` | Nuovo promemoria (mattino, pranzo o sera) | Amministratore, familiare |
| PATCH | `/api/promemoria/:id` | Cambia orario o lo spegne | Amministratore, familiare |
| DELETE | `/api/promemoria/:id` | Toglie il promemoria | Amministratore, familiare |
| GET | `/api/push/chiave` | Chiave pubblica per le notifiche | No |
| POST | `/api/push/iscrizione` | Questo browser riceve le notifiche | Sì |
| DELETE | `/api/push/iscrizione` | Non più | Sì |

## Regole del progetto

- **Le tabelle si cambiano solo con una nuova migrazione** (`V2__descrizione.sql`, `V3__...`).
  Una migrazione già eseguita non si modifica mai.
- **I permessi si controllano sempre nel backend**, mai solo nascondendo pulsanti.
- **Codici, token e password non si salvano mai in chiaro**: solo il loro hash.
- **Importi in centesimi** (intero), date in `timestamptz`.

## Documenti di progetto

- Fase 1, analisi: https://claude.ai/artifact/A9NGwPCeMk7WG9GnsnTioi
- Fase 2, schermate: https://claude.ai/artifact/59ZR5UoDvihfQSdeE8nVio
- Fase 3, architettura e dati: https://claude.ai/artifact/7ADxeC7dqRNJJemsacaFDH
