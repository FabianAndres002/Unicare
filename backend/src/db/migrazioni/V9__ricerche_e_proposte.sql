-- Unicare, migrazione 9: le famiglie scrivono "cerco una badante", le badanti si propongono.

-- Cosa serve a una famiglia. Le badanti vedono solo comune, orari, servizi e descrizione:
-- mai il nome della famiglia né quello della persona assistita.
CREATE TABLE ricerca_badante (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cerchio_id     BIGINT        NOT NULL REFERENCES cerchio (id) ON DELETE CASCADE,
    creata_da      BIGINT        REFERENCES utente (id) ON DELETE SET NULL,
    provincia      CHAR(2)       NOT NULL,
    comune         VARCHAR(80)   NOT NULL,
    descrizione    VARCHAR(1000) NOT NULL,
    -- In parole: "dal lunedì al venerdì, 9-13".
    orario         VARCHAR(120),
    servizi        TEXT[]        NOT NULL DEFAULT '{}',
    disponibilita  TEXT[]        NOT NULL DEFAULT '{}',
    creata_il      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- Chiusa quando la famiglia ha trovato o non cerca più.
    chiusa_il      TIMESTAMPTZ
);
CREATE INDEX ricerca_badante_aperte_idx ON ricerca_badante (provincia, creata_il DESC) WHERE chiusa_il IS NULL;

-- Una badante si propone per una ricerca.
--   INVIATA     la famiglia non ha ancora deciso
--   SCELTA      la famiglia le ha scritto: si apre la conversazione
--   NON_SCELTA  la famiglia ha detto "No, grazie" (o ha chiuso la ricerca)
--   RITIRATA    la badante ci ha ripensato
CREATE TABLE proposta (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ricerca_id   BIGINT        NOT NULL REFERENCES ricerca_badante (id) ON DELETE CASCADE,
    badante_id   BIGINT        NOT NULL REFERENCES utente (id) ON DELETE CASCADE,
    messaggio    VARCHAR(1000) NOT NULL,
    stato        VARCHAR(12)   NOT NULL DEFAULT 'INVIATA'
                 CHECK (stato IN ('INVIATA', 'SCELTA', 'NON_SCELTA', 'RITIRATA')),
    creata_il    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    contatto_id  BIGINT        REFERENCES contatto (id) ON DELETE SET NULL,
    UNIQUE (ricerca_id, badante_id)
);
CREATE INDEX proposta_badante_idx ON proposta (badante_id, creata_il DESC);
