-- Conferma dell'email e "password dimenticata": un codice di 6 numeri mandato per email.
-- email_confermata_il resta vuoto finché la persona non scrive il codice ricevuto.
ALTER TABLE utente ADD COLUMN email_confermata_il TIMESTAMPTZ;

CREATE TABLE codice_email (
    utente_id    BIGINT      NOT NULL REFERENCES utente (id) ON DELETE CASCADE,
    scopo        TEXT        NOT NULL CHECK (scopo IN ('CONFERMA', 'PASSWORD')),
    codice_hash  TEXT        NOT NULL,
    scade_il     TIMESTAMPTZ NOT NULL,
    tentativi    INTEGER     NOT NULL DEFAULT 0,
    creato_il    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (utente_id, scopo)
);
