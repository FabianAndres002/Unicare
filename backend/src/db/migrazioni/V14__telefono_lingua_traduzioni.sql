-- Numero di telefono (facoltativo): l'anziano può chiamare con un tocco dalla Senior App.
ALTER TABLE utente ADD COLUMN telefono VARCHAR(20);

-- La lingua dell'app scelta dalla persona. Serve anche a tradurre la chat con la badante.
ALTER TABLE utente ADD COLUMN lingua VARCHAR(5) NOT NULL DEFAULT 'it';

-- Traduzioni dei messaggi della chat, così ogni messaggio si traduce una volta sola per lingua.
CREATE TABLE traduzione_messaggio (
    messaggio_id BIGINT        NOT NULL REFERENCES messaggio_contatto (id) ON DELETE CASCADE,
    lingua       VARCHAR(5)    NOT NULL,
    testo        VARCHAR(4000) NOT NULL,
    PRIMARY KEY (messaggio_id, lingua)
);
