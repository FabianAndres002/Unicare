# Unicare

App per cellulare che unisce anziani, familiari e badanti: richieste di aiuto, promemoria, calendario, documenti sanitari.
Stack: **React + TypeScript** (PWA) · **Node.js + TypeScript + Express** · **PostgreSQL**.

Stato: **Fase 4, settimana 5**: registrazione e login, cerchio familiare, scheda della persona
assistita con consenso privacy, inviti con link monouso, richieste di aiuto con il loro ciclo
(da fare → in corso → fatta, oppure annullata) e lo storico. Novità della settimana 5:

- **avvisi via email** quando una richiesta nasce, viene presa, lasciata, completata o annullata
  (si spengono dal profilo);
- **Senior App** su `/senior`: il telefono dell'anziano si collega con un **codice di 6 cifre**
  generato dalla sua scheda; poi un pulsante enorme "Chiedi aiuto", 5 scelte, la conferma, e lo
  stato ("Se ne occupa Maria"). Il pulsante del 112 è sempre in fondo allo schermo.

60 test automatici.

### Le email in sviluppo

Finché non è impostato un servizio di posta, **nessuna email viene spedita**: ognuna viene salvata
come pagina nella cartella `backend/.posta-locale` (aprila con un doppio clic) e nel terminale del
backend compare una riga `✉ Email a ...`. Così si vede com'è senza rischiare di scrivere a nessuno.

### Provare la Senior App sul computer

1. Entra come familiare, apri la scheda dell'anziano dalla Home e tocca **Collega il telefono**.
2. Apri una finestra in incognito (Ctrl+Shift+N) su `http://localhost:5173/senior`.
3. Scrivi il codice. Per vederla "da telefono": F12, poi l'icona del telefono in alto a sinistra.

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
