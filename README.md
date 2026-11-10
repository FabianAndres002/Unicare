# Unicare

App che unisce anziani, familiari e badanti: richieste di aiuto, promemoria, calendario, ricevute.
Stack: **React + TypeScript** (PWA) · **Java 21 + Spring Boot 4** · **PostgreSQL 16**.

Stato: **Fase 4, settimana 1**: scheletro del progetto, prime 7 tabelle, un endpoint di prova letto dal frontend.

## Struttura

```
unicare/
  backend/     Spring Boot (Maven). Codice in src/main/java/it/unicare/
               Migrazioni del database in src/main/resources/db/migration/
  frontend/    React + TypeScript con Vite. Installabile come app (PWA)
  docker-compose.yml   PostgreSQL per lo sviluppo
```

## Cosa installare (una volta sola)

- **Java 21** (per esempio Eclipse Temurin 21)
- **Node.js 22** o più recente
- **Docker Desktop** (per il database)

Maven non serve: il backend ha il suo `mvnw` che lo scarica da solo.

## Avviare tutto in locale

Servono tre terminali, aperti nella cartella `unicare`.

**1. Database**

```bash
docker compose up -d
```

**2. Backend** (su http://localhost:8080)

```bash
cd backend
./mvnw spring-boot:run        # su Windows: mvnw.cmd spring-boot:run
```

Al primo avvio Flyway crea le tabelle. Nel log cerca `Successfully applied 1 migration`.
Prova: apri http://localhost:8080/api/stato e dovresti vedere
`{"app":"Unicare","database":"ok","tabelle":7}`.

**3. Frontend** (su http://localhost:5173)

```bash
cd frontend
npm install                   # solo la prima volta
npm run dev
```

Apri http://localhost:5173: deve comparire "Backend e database collegati. Tabelle create: 7."

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
