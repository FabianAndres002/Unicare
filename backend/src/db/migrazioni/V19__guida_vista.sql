-- La visita guidata si ricorda per account (non per telefono): un account nuovo la vede sempre.
ALTER TABLE utente ADD COLUMN guida_vista_il TIMESTAMPTZ;
