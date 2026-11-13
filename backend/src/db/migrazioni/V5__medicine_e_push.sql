-- Unicare, migrazione 5: notifiche sul telefono (push) e promemoria delle medicine.

-- Impostazioni del server che devono durare nel tempo (per esempio le chiavi delle notifiche push).
CREATE TABLE impostazione (
    chiave  VARCHAR(60) PRIMARY KEY,
    valore  TEXT        NOT NULL
);

-- Un telefono o un browser che ha accettato le notifiche.
-- Appartiene a un familiare/badante OPPURE al telefono dell'anziano.
CREATE TABLE iscrizione_push (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    utente_id       BIGINT       REFERENCES utente (id) ON DELETE CASCADE,
    dispositivo_id  BIGINT       REFERENCES dispositivo_anziano (id) ON DELETE CASCADE,
    endpoint        TEXT         NOT NULL UNIQUE,
    p256dh          TEXT         NOT NULL,
    auth            TEXT         NOT NULL,
    creata_il       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK ((utente_id IS NULL) <> (dispositivo_id IS NULL))
);

-- Un promemoria ricorrente: "Medicine del mattino" alle 8:00, tutti i giorni.
-- Il nome del farmaco NON si salva: è un dato sanitario e non deve finire nelle notifiche.
CREATE TABLE promemoria (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anziano_id  BIGINT       NOT NULL REFERENCES anziano (id) ON DELETE CASCADE,
    momento     VARCHAR(10)  NOT NULL CHECK (momento IN ('MATTINO', 'PRANZO', 'SERA')),
    ora         TIME         NOT NULL,
    attivo      BOOLEAN      NOT NULL DEFAULT true,
    creato_da   BIGINT       REFERENCES utente (id) ON DELETE SET NULL,
    creato_il   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- Ultima modifica (ora o attivo): gli orari già passati prima di questo momento non contano.
    modificato_il TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Un solo promemoria per momento della giornata.
    UNIQUE (anziano_id, momento)
);
CREATE INDEX promemoria_anziano_idx ON promemoria (anziano_id);

-- Ogni volta che il promemoria "scatta": oggi alle 8:00, domani alle 8:00...
--   IN_ATTESA        notificato (o da notificare), l'anziano non ha ancora risposto
--   FATTO            l'anziano ha toccato "Fatto"
--   NON_CONFERMATO   è passata un'ora senza risposta: la famiglia è stata avvisata
CREATE TABLE occorrenza (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    promemoria_id     BIGINT       NOT NULL REFERENCES promemoria (id) ON DELETE CASCADE,
    previsto_il       TIMESTAMPTZ  NOT NULL,
    stato             VARCHAR(20)  NOT NULL DEFAULT 'IN_ATTESA'
                      CHECK (stato IN ('IN_ATTESA', 'FATTO', 'NON_CONFERMATO')),
    -- Quando mandare la prossima notifica all'anziano (NULL = già mandata).
    avvisare_il       TIMESTAMPTZ,
    rimandi           INT          NOT NULL DEFAULT 0,
    confermato_il     TIMESTAMPTZ,
    famiglia_avvisata_il TIMESTAMPTZ,
    UNIQUE (promemoria_id, previsto_il)
);
CREATE INDEX occorrenza_avvisare_idx ON occorrenza (avvisare_il) WHERE avvisare_il IS NOT NULL;
CREATE INDEX occorrenza_attesa_idx ON occorrenza (stato, previsto_il) WHERE stato = 'IN_ATTESA';
