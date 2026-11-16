-- Unicare, migrazione 10: i promemoria hanno i nomi delle medicine, e se ne possono mettere
-- più di uno nello stesso momento della giornata (per esempio alle 8:00 e alle 10:00).
--
-- I nomi sono dati sanitari: si vedono solo dentro l'app (famiglia, badante, anziano),
-- MAI nel testo delle notifiche, che compare anche sul telefono bloccato.

ALTER TABLE promemoria DROP CONSTRAINT promemoria_anziano_id_momento_key;
ALTER TABLE promemoria ADD CONSTRAINT promemoria_anziano_ora_key UNIQUE (anziano_id, ora);
-- Per esempio {"Cardioaspirina 100 mg", "Eutirox 1 compressa"}.
ALTER TABLE promemoria ADD COLUMN medicine TEXT[] NOT NULL DEFAULT '{}';
