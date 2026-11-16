-- Unicare, migrazione 11: foto profilo di familiari, badanti e della persona assistita.
-- Una foto appartiene a UN utente oppure a UN anziano, e sparisce con lui.
-- La chiave è casuale e lunga: l'indirizzo della foto lo conosce solo chi la può vedere.

CREATE TABLE foto (
    chiave      VARCHAR(40)  PRIMARY KEY,
    utente_id   BIGINT UNIQUE REFERENCES utente (id) ON DELETE CASCADE,
    anziano_id  BIGINT UNIQUE REFERENCES anziano (id) ON DELETE CASCADE,
    tipo        VARCHAR(20)  NOT NULL CHECK (tipo IN ('image/jpeg', 'image/png', 'image/webp')),
    dati        BYTEA        NOT NULL,
    creata_il   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK ((utente_id IS NULL) <> (anziano_id IS NULL))
);
