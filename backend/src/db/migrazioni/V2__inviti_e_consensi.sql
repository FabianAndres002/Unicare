-- Unicare, migrazione 2: chi ha accettato o revocato un invito, chi ha dato un consenso.

ALTER TABLE invito ADD COLUMN accettato_da BIGINT REFERENCES utente (id) ON DELETE SET NULL;
ALTER TABLE invito ADD COLUMN revocato_il TIMESTAMPTZ;
CREATE INDEX invito_cerchio_idx ON invito (cerchio_id);

-- Il consenso per l'anziano lo dà un familiare: ci ricordiamo chi.
ALTER TABLE consenso ADD COLUMN dato_da BIGINT REFERENCES utente (id) ON DELETE SET NULL;
