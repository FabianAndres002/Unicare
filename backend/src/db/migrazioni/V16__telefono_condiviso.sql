-- Unicare, migrazione 16: due nonni sullo stesso telefono.
-- Lo stesso telefono (stessa iscrizione alle notifiche) può ora ricevere gli avvisi di più
-- persone assistite: una riga per ogni persona collegata. Per gli utenti resta una riga sola.
ALTER TABLE iscrizione_push DROP CONSTRAINT iscrizione_push_endpoint_key;
CREATE UNIQUE INDEX iscrizione_push_utente_endpoint ON iscrizione_push (endpoint) WHERE utente_id IS NOT NULL;
CREATE UNIQUE INDEX iscrizione_push_dispositivo_endpoint ON iscrizione_push (endpoint, dispositivo_id) WHERE dispositivo_id IS NOT NULL;
