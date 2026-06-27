-- Catégories de billets proposées à l'inscription publique (liste CSV).
-- Ex: "Standard,VIP,Presse". NULL/vide = pas de choix (catégorie 'standard').
ALTER TABLE events ADD COLUMN categories TEXT;
