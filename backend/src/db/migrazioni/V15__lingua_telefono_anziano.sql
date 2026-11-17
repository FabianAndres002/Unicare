-- La lingua scelta sul telefono dell'anziano: le sue notifiche arrivano in quella lingua.
ALTER TABLE dispositivo_anziano ADD COLUMN lingua VARCHAR(5) NOT NULL DEFAULT 'it';
