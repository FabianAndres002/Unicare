-- Unicare, migrazione 4: avvisi via email e richieste fatte dall'anziano (Senior App).

-- Ogni utente può spegnere gli avvisi via email dal suo profilo.
ALTER TABLE utente ADD COLUMN email_avvisi BOOLEAN NOT NULL DEFAULT true;

-- Una richiesta può partire dal telefono dell'anziano: in quel caso creata_da resta NULL.
ALTER TABLE richiesta ADD COLUMN creata_dall_anziano BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE richiesta_evento ADD COLUMN dall_anziano BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX richiesta_anziano_idx ON richiesta (anziano_id, stato);

-- Un codice a 6 cifre si cerca per hash: deve essere unico finché è valido.
CREATE INDEX dispositivo_codice_idx ON dispositivo_anziano (codice_hash) WHERE codice_hash IS NOT NULL;
