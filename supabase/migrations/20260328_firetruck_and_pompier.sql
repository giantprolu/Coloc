-- 1. Étendre le rôle des membres pour inclure "pompier"
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
ALTER TABLE members ADD CONSTRAINT members_role_check CHECK (role IN ('admin', 'member', 'pompier'));

-- 2. Table des clics camion de pompier avec notation
CREATE TABLE IF NOT EXISTS firetruck_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  colocation_id UUID NOT NULL REFERENCES colocations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  clicked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_firetruck_clicks_coloc_month ON firetruck_clicks (colocation_id, clicked_at);

ALTER TABLE firetruck_clicks ENABLE ROW LEVEL SECURITY;

-- Membres de la coloc peuvent voir les clics
CREATE POLICY "firetruck_clicks_select" ON firetruck_clicks FOR SELECT
  USING (
    colocation_id IN (SELECT get_user_colocation_ids(auth.uid()))
  );

-- Membre peut insérer pour lui-même
CREATE POLICY "firetruck_clicks_insert" ON firetruck_clicks FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );
