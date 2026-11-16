-- Unicare, migrazione 12: in alternativa alla foto si può scegliere un disegno (avatar).
-- Si salva solo il nome del disegno; i disegni sono file dell'app (frontend/public/avatar).
ALTER TABLE utente  ADD COLUMN avatar VARCHAR(30);
ALTER TABLE anziano ADD COLUMN avatar VARCHAR(30);
