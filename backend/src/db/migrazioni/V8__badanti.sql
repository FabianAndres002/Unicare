-- Unicare, migrazione 8: le badanti si propongono, le famiglie le cercano e le contattano.

-- Il profilo professionale di una badante (un utente di tipo BADANTE).
-- Le famiglie lo vedono solo quando "visibile" è acceso ("Mi propongo").
CREATE TABLE profilo_badante (
    utente_id                 BIGINT        PRIMARY KEY REFERENCES utente (id) ON DELETE CASCADE,
    presentazione             VARCHAR(1500) NOT NULL DEFAULT '',
    provincia                 CHAR(2)       NOT NULL,
    comune                    VARCHAR(80)   NOT NULL,
    -- Dove è disposta a lavorare, in parole sue: "Caserta e dintorni, fino a Napoli".
    zone                      VARCHAR(200),
    anni_esperienza           INT           NOT NULL DEFAULT 0 CHECK (anni_esperienza BETWEEN 0 AND 60),
    lingue                    VARCHAR(200),
    -- COMPAGNIA, IGIENE, PASTI, PULIZIE, SPESA, ACCOMPAGNAMENTO, FARMACI, NOTTE (controllati dal server)
    servizi                   TEXT[]        NOT NULL DEFAULT '{}',
    -- CONVIVENTE, A_ORE, NOTTE, WEEKEND
    disponibilita             TEXT[]        NOT NULL DEFAULT '{}',
    tariffa_oraria_centesimi  INT           CHECK (tariffa_oraria_centesimi BETWEEN 0 AND 100000),
    automunita                BOOLEAN       NOT NULL DEFAULT false,
    visibile                  BOOLEAN       NOT NULL DEFAULT false,
    aggiornato_il             TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX profilo_badante_ricerca_idx ON profilo_badante (provincia) WHERE visibile;

-- Una conversazione tra una famiglia (chi ha scritto per primo) e una badante.
CREATE TABLE contatto (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    badante_id           BIGINT       NOT NULL REFERENCES utente (id) ON DELETE CASCADE,
    familiare_id         BIGINT       NOT NULL REFERENCES utente (id) ON DELETE CASCADE,
    creato_il            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    ultimo_messaggio_il  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- La badante può chiudere la conversazione: la famiglia non può più scriverle.
    bloccato_il          TIMESTAMPTZ,
    UNIQUE (badante_id, familiare_id)
);
CREATE INDEX contatto_badante_idx ON contatto (badante_id, ultimo_messaggio_il DESC);
CREATE INDEX contatto_familiare_idx ON contatto (familiare_id, ultimo_messaggio_il DESC);

CREATE TABLE messaggio_contatto (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contatto_id BIGINT        NOT NULL REFERENCES contatto (id) ON DELETE CASCADE,
    autore_id   BIGINT        NOT NULL REFERENCES utente (id) ON DELETE CASCADE,
    testo       VARCHAR(2000) NOT NULL,
    creato_il   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    letto_il    TIMESTAMPTZ
);
CREATE INDEX messaggio_contatto_idx ON messaggio_contatto (contatto_id, creato_il);
