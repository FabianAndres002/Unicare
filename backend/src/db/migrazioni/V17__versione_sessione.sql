-- "Esci dagli altri telefoni": ogni accesso porta il numero di versione dell'utente.
-- Aumentandolo, tutti i cookie di accesso già dati smettono di valere.
ALTER TABLE utente ADD COLUMN sessione_versione INTEGER NOT NULL DEFAULT 0;
