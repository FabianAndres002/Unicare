# Unicare

App che unisce anziani, familiari e badanti: richieste di aiuto, promemoria, calendario, ricevute.
Stack: **React + TypeScript** (PWA) · **Java 21 + Spring Boot 4** · **PostgreSQL 16**.

Stato: **Fase 4, settimana 2**: registrazione, login e logout di familiari e badanti (Spring Security, password BCrypt, sessione con cookie, protezione CSRF), con 9 test automatici.

## Struttura

```
unicare/
  backend/     Spring Boot (Maven). Codice in src/main/java/it/unicare/
               Migrazioni del database in src/main/resources/db/migration/
  frontend/    React + TypeScript con Vite. Installabile come app (PWA)
  .vscode/     Comandi per avviare tutto da VS Code
```

## Cosa installare (una volta sola)

- **Java 21** (per esempio Eclipse Temurin 21, con l'opzione "Set JAVA_HOME")
- **Node.js** versione LTS
- **VS Code**

Non servono né Maven né PostgreSQL né Docker:
il backend ha il suo `mvnw` che scarica Maven, e avvia da solo un **PostgreSQL integrato**.
I dati del database restano nella cartella `backend/.database-locale`
(per ripartire da zero: ferma il backend e cancella quella cartella).

## Avviare tutto da VS Code

1. In VS Code: **File → Open Folder…** e scegli la cartella del progetto.
   Accetta di installare le estensioni consigliate (Java, Spring Boot).
2. Premi **Ctrl+Shift+B**: parte **Avvia Unicare**, che apre due terminali in ordine:
   - **1. Backend**: avvia database e backend; è pronto quando compare `Started UnicareApplication`
   - **2. Frontend**: è pronto quando compare `Local: http://localhost:5173/`
3. Apri http://localhost:5173 nel browser.

Il primo avvio è lento (qualche minuto): scarica Maven, le librerie Java e quelle del frontend.

**Per fermare:** clicca nel terminale del backend e premi **Ctrl+C**, poi lo stesso nel terminale del frontend.
Usa sempre Ctrl+C sul backend: così anche il database si chiude bene.

**Test automatici:** Ctrl+Shift+P → "Tasks: Run Task" → **Test del backend**.
I test usano un database integrato separato, quindi funzionano anche con il backend acceso.

## Avviare tutto a mano (dal terminale)

```bash
cd backend
./mvnw spring-boot:run        # su Windows: mvnw.cmd spring-boot:run
```

In un secondo terminale:

```bash
cd frontend
npm install                   # solo la prima volta
npm run dev
```

Prova: http://localhost:8080/api/stato deve rispondere `{"app":"Unicare","database":"ok","tabelle":7}`,
e su http://localhost:5173 compare la schermata di accesso.

## Usare un PostgreSQL vero (per esempio in produzione)

Imposta queste variabili d'ambiente prima di avviare il backend:
`UNICARE_DATABASE_INTEGRATO=false`, `DB_URL`, `DB_USER`, `DB_PASSWORD`.

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
