-- Unicare, migrazione 1: persone, cerchio, anziano, consensi.
-- Una migrazione non si modifica mai dopo essere stata eseguita:
-- per cambiare qualcosa si crea V2__..., V3__... e così via.

-- Familiari e badanti (l'anziano NON è un utente con password).
CREATE TABLE utente (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email          VARCHAR(254) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    nome           VARCHAR(80)  NOT NULL,
    cognome        VARCHAR(80)  NOT NULL,
    tipo           VARCHAR(20)  NOT NULL CHECK (tipo IN ('FAMILIARE', 'BADANTE')),
    creato_il      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Email unica senza distinguere maiuscole e minuscole.
CREATE UNIQUE INDEX utente_email_uk ON utente (lower(email));

-- Il gruppo che si prende cura di uno o più anziani ("Famiglia Rossi").
CREATE TABLE cerchio (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    creato_da  BIGINT       NOT NULL REFERENCES utente (id),
    creato_il  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Chi fa parte di quale cerchio, e con che ruolo. Decide i permessi.
CREATE TABLE membro_cerchio (
    cerchio_id  BIGINT      NOT NULL REFERENCES cerchio (id) ON DELETE CASCADE,
    utente_id   BIGINT      NOT NULL REFERENCES utente (id) ON DELETE CASCADE,
    ruolo       VARCHAR(20) NOT NULL CHECK (ruolo IN ('ADMIN', 'FAMILIARE', 'BADANTE')),
    entrato_il  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (cerchio_id, utente_id)
);
CREATE INDEX membro_cerchio_utente_idx ON membro_cerchio (utente_id);

-- Link d'invito monouso. Si salva solo l'hash del token, mai il token.
CREATE TABLE invito (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cerchio_id    BIGINT       NOT NULL REFERENCES cerchio (id) ON DELETE CASCADE,
    email         VARCHAR(254) NOT NULL,
    ruolo         VARCHAR(20)  NOT NULL CHECK (ruolo IN ('ADMIN', 'FAMILIARE', 'BADANTE')),
    token_hash    VARCHAR(100) NOT NULL UNIQUE,
    invitato_da   BIGINT       NOT NULL REFERENCES utente (id),
    scade_il      TIMESTAMPTZ  NOT NULL,
    accettato_il  TIMESTAMPTZ
);

-- La persona assistita. Più anziani per cerchio (es. due coniugi).
CREATE TABLE anziano (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cerchio_id         BIGINT      NOT NULL REFERENCES cerchio (id) ON DELETE CASCADE,
    nome               VARCHAR(80) NOT NULL,
    cognome            VARCHAR(80) NOT NULL,
    data_nascita       DATE,
    comune             VARCHAR(100),
    foto_key           VARCHAR(200),
    creato_il          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX anziano_cerchio_idx ON anziano (cerchio_id);

-- Il telefono dell'anziano: codice a 6 cifre (24 ore, monouso) scambiato con un token.
CREATE TABLE dispositivo_anziano (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anziano_id         BIGINT      NOT NULL REFERENCES anziano (id) ON DELETE CASCADE,
    codice_hash        VARCHAR(100),
    codice_scade_il    TIMESTAMPTZ,
    tentativi_falliti  INT         NOT NULL DEFAULT 0,
    bloccato_fino_al   TIMESTAMPTZ,
    token_hash         VARCHAR(100) UNIQUE,
    attivato_il        TIMESTAMPTZ,
    ultimo_accesso_il  TIMESTAMPTZ,
    revocato_il        TIMESTAMPTZ
);
CREATE INDEX dispositivo_anziano_idx ON dispositivo_anziano (anziano_id);

-- Consensi privacy, con la versione del testo accettato.
-- Riguarda un anziano OPPURE un utente, mai entrambi.
CREATE TABLE consenso (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anziano_id      BIGINT REFERENCES anziano (id) ON DELETE CASCADE,
    utente_id       BIGINT REFERENCES utente (id) ON DELETE CASCADE,
    tipo            VARCHAR(40) NOT NULL,   -- es. 'PRIVACY', 'PROMEMORIA_MEDICINE'
    versione_testo  VARCHAR(20) NOT NULL,
    dato_il         TIMESTAMPTZ NOT NULL DEFAULT now(),
    revocato_il     TIMESTAMPTZ,
    CHECK ((anziano_id IS NULL) <> (utente_id IS NULL))
);
