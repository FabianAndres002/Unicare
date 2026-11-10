# Unicare

App che unisce anziani, familiari e badanti: richieste di aiuto, promemoria, calendario, ricevute.
Stack: **React + TypeScript** (PWA) · **Node.js + TypeScript + Express** · **PostgreSQL**.

Stato: **Fase 4, settimana 2**: registrazione, login e logout di familiari e badanti
(password con bcrypt, accesso con cookie sicuro HttpOnly), con 13 test automatici.

## Struttura

```
unicare/
  backend/     Node.js + Express in TypeScript. Codice in src/
                 src/accesso/   registrazione, login, logout
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

## API disponibili

| Metodo | Indirizzo | Cosa fa | Serve il login? |
|---|---|---|---|
| GET | `/api/stato` | Controlla backend e database | No |
| POST | `/api/auth/registrati` | Crea l'account e fa entrare | No |
| POST | `/api/auth/login` | Accesso con email e password | No |
| POST | `/api/auth/logout` | Esce | Sì |
| GET | `/api/auth/io` | Dice chi è l'utente collegato | Sì |

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
