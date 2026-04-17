-- Ajout du lieu et de la description optionnelle sur les clics firetruck
ALTER TABLE firetruck_clicks
  ADD COLUMN IF NOT EXISTS location_type TEXT CHECK (location_type IN ('domicile', 'exterieur')),
  ADD COLUMN IF NOT EXISTS description TEXT;
