-- Unicare, migrazione 13: i disegni sono cambiati (nuovi avatar, file .webp).
-- Chi aveva scelto un disegno che non c'è più torna alle iniziali.
UPDATE utente  SET avatar = NULL WHERE avatar IN ('girasole', 'sole', 'albero', 'uccellino');
UPDATE anziano SET avatar = NULL WHERE avatar IN ('girasole', 'sole', 'albero', 'uccellino');
