-- Unicare, migrazione 3: richieste di aiuto e il loro storico.
--
-- Stati:  APERTA → PRESA_IN_CARICO → COMPLETATA
--         PRESA_IN_CARICO → APERTA     (chi l'aveva presa non può più)
--         APERTA o PRESA_IN_CARICO → ANNULLATA

CREATE TABLE richiesta (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cerchio_id      BIGINT       NOT NULL REFERENCES cerchio (id) ON DELETE CASCADE,
    anziano_id      BIGINT       NOT NULL REFERENCES anziano (id) ON DELETE CASCADE,
    categoria       VARCHAR(20)  NOT NULL CHECK (categoria IN ('SPESA', 'FARMACIA', 'ACCOMPAGNAMENTO', 'COMPAGNIA', 'CASA', 'ALTRO')),
    testo           VARCHAR(500),
    stato           VARCHAR(20)  NOT NULL DEFAULT 'APERTA'
                    CHECK (stato IN ('APERTA', 'PRESA_IN_CARICO', 'COMPLETATA', 'ANNULLATA')),
    -- Chi l'ha creata: un membro del cerchio (dal web). Dalla Senior App sarà l'anziano stesso (NULL qui).
    creata_da       BIGINT       REFERENCES utente (id) ON DELETE SET NULL,
    creata_il       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    presa_da        BIGINT       REFERENCES utente (id) ON DELETE SET NULL,
    presa_il        TIMESTAMPTZ,
    chiusa_il       TIMESTAMPTZ,  -- completata o annullata
    -- Una richiesta presa in carico ha sempre qualcuno che se ne occupa.
    CHECK (stato <> 'PRESA_IN_CARICO' OR presa_da IS NOT NULL)
);
CREATE INDEX richiesta_cerchio_stato_idx ON richiesta (cerchio_id, stato);

-- Ogni passaggio di stato, per mostrare la storia della richiesta.
CREATE TABLE richiesta_evento (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    richiesta_id  BIGINT       NOT NULL REFERENCES richiesta (id) ON DELETE CASCADE,
    tipo          VARCHAR(20)  NOT NULL CHECK (tipo IN ('CREATA', 'PRESA', 'RILASCIATA', 'COMPLETATA', 'ANNULLATA')),
    utente_id     BIGINT       REFERENCES utente (id) ON DELETE SET NULL,
    nota          VARCHAR(300),
    il            TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX richiesta_evento_idx ON richiesta_evento (richiesta_id);
