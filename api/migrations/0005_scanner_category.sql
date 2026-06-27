-- Catégorie de billets acceptée par une porte/scanner.
-- NULL = la porte accepte toutes les catégories.
ALTER TABLE scanners ADD COLUMN category TEXT;
