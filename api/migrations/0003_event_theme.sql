-- Thème visuel de l'événement (slug parmi une liste : concert, conference, …).
-- NULL = thème par défaut (Standard).
ALTER TABLE events ADD COLUMN theme TEXT;
