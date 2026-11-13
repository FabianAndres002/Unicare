-- Unicare, migrazione 7: documenti sanitari e cancellazione dell'account.

-- Chi cancella il proprio account non deve bloccare il cerchio che ha creato,
-- né lasciare inviti a suo nome.
ALTER TABLE cerchio ALTER COLUMN creato_da DROP NOT NULL;
ALTER TABLE cerchio DROP CONSTRAINT cerchio_creato_da_fkey;
ALTER TABLE cerchio ADD CONSTRAINT cerchio_creato_da_fkey FOREIGN KEY (creato_da) REFERENCES utente (id) ON DELETE SET NULL;
ALTER TABLE invito DROP CONSTRAINT invito_invitato_da_fkey;
ALTER TABLE invito ADD CONSTRAINT invito_invitato_da_fkey FOREIGN KEY (invitato_da) REFERENCES utente (id) ON DELETE CASCADE;

-- Un documento sanitario dell'anziano: una foto o un PDF.
-- Sono dati sanitari (art. 9 GDPR): li vedono solo familiari e amministratore,
-- e serve il consenso DOCUMENTI_SANITARI prima del primo caricamento.
CREATE TABLE documento (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anziano_id         BIGINT        NOT NULL REFERENCES anziano (id) ON DELETE CASCADE,
    categoria          VARCHAR(20)   NOT NULL
                       CHECK (categoria IN ('PRESCRIZIONE', 'ANALISI', 'IMMAGINI', 'REFERTO', 'RICEVUTA', 'ALTRO')),
    titolo             VARCHAR(120)  NOT NULL,
    -- La data scritta sul documento (non quella del caricamento).
    data_documento     DATE          NOT NULL,
    note               VARCHAR(500),
    -- Solo per le ricevute: quanto si è speso, in centesimi (serve per il 730).
    importo_centesimi  INT           CHECK (importo_centesimi >= 0),
    file               BYTEA         NOT NULL,
    tipo_file          VARCHAR(40)   NOT NULL,
    nome_file          VARCHAR(200)  NOT NULL,
    dimensione         INT           NOT NULL,
    caricato_da        BIGINT        REFERENCES utente (id) ON DELETE SET NULL,
    caricato_il        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX documento_anziano_idx ON documento (anziano_id, data_documento DESC);
