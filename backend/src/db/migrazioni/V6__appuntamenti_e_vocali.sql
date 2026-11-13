-- Unicare, migrazione 6: calendario degli appuntamenti e messaggi vocali.

-- Un appuntamento dell'anziano: una visita, un esame, il parrucchiere...
-- Promemoria automatici: la sera prima (alle 18) e due ore prima, all'anziano e al cerchio.
CREATE TABLE appuntamento (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anziano_id      BIGINT        NOT NULL REFERENCES anziano (id) ON DELETE CASCADE,
    titolo          VARCHAR(120)  NOT NULL,
    quando          TIMESTAMPTZ   NOT NULL,
    luogo           VARCHAR(200),
    note            VARCHAR(500),
    -- Chi ha detto "Lo accompagno io" (NULL = nessuno, ancora).
    accompagna_id   BIGINT        REFERENCES utente (id) ON DELETE SET NULL,
    creato_da       BIGINT        REFERENCES utente (id) ON DELETE SET NULL,
    creato_il       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- Ultimo cambio di data o ora: i promemoria già "scaduti" prima di questo momento non partono.
    modificato_il   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    avvisato_sera_prima_il  TIMESTAMPTZ,
    avvisato_ore_prima_il   TIMESTAMPTZ
);
CREATE INDEX appuntamento_anziano_idx ON appuntamento (anziano_id, quando);
CREATE INDEX appuntamento_da_avvisare_idx ON appuntamento (quando) WHERE avvisato_ore_prima_il IS NULL;

-- Un messaggio vocale: dall'anziano al cerchio, oppure da un familiare all'anziano.
-- Si cancella da solo dopo 30 giorni.
CREATE TABLE messaggio_vocale (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anziano_id      BIGINT        NOT NULL REFERENCES anziano (id) ON DELETE CASCADE,
    -- NULL = l'ha registrato l'anziano dal suo telefono.
    autore_id       BIGINT        REFERENCES utente (id) ON DELETE CASCADE,
    dall_anziano    BOOLEAN       NOT NULL,
    audio           BYTEA         NOT NULL,
    tipo_audio      VARCHAR(80)   NOT NULL,
    durata_secondi  INT           NOT NULL CHECK (durata_secondi BETWEEN 1 AND 120),
    creato_il       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- Primo ascolto: chi l'ha ascoltato (familiare) o quando (anziano).
    ascoltato_da    BIGINT        REFERENCES utente (id) ON DELETE SET NULL,
    ascoltato_il    TIMESTAMPTZ,
    CHECK (dall_anziano = (autore_id IS NULL))
);
CREATE INDEX messaggio_vocale_anziano_idx ON messaggio_vocale (anziano_id, creato_il DESC);
