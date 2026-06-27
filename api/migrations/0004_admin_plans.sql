-- Rôle, statut de validation et offre (plan) des organisateurs.
ALTER TABLE organizers ADD COLUMN role   TEXT NOT NULL DEFAULT 'organizer'; -- 'organizer' | 'admin'
ALTER TABLE organizers ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';   -- 'pending' | 'approved' | 'suspended'
ALTER TABLE organizers ADD COLUMN plan   TEXT;                              -- 'discovery' | 'pro' | 'business'

-- Comptes existants : on les valide (grandfathering) avec l'offre la plus large.
UPDATE organizers SET status = 'approved', plan = 'business' WHERE status = 'pending';
