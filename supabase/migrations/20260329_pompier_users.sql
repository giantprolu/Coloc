-- ============================================================
-- Pompier users : table séparée des members
-- ============================================================

-- 1. Table pompier_users (utilisateurs externes pompier)
CREATE TABLE IF NOT EXISTS pompier_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  colocation_id UUID NOT NULL REFERENCES colocations(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, colocation_id)
);

ALTER TABLE pompier_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pompier_users_select" ON pompier_users FOR SELECT
  USING (
    colocation_id IN (SELECT get_user_colocation_ids(auth.uid()))
  );

CREATE POLICY "pompier_users_insert" ON pompier_users FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 2. Étendre get_user_colocation_ids pour inclure pompier_users
--    Cela fait fonctionner TOUTES les policies RLS existantes pour les pompiers
CREATE OR REPLACE FUNCTION get_user_colocation_ids(uid uuid)
RETURNS SETOF uuid AS $$
  SELECT colocation_id FROM members WHERE user_id = uid
  UNION
  SELECT colocation_id FROM pompier_users WHERE user_id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Modifier firetruck_clicks : member_id nullable + pompier_user_id
ALTER TABLE firetruck_clicks
  ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE firetruck_clicks
  ADD COLUMN pompier_user_id UUID REFERENCES pompier_users(id) ON DELETE CASCADE;

ALTER TABLE firetruck_clicks
  ADD CONSTRAINT firetruck_clicks_one_user CHECK (
    (member_id IS NOT NULL AND pompier_user_id IS NULL) OR
    (member_id IS NULL AND pompier_user_id IS NOT NULL)
  );

-- Mettre à jour les policies firetruck_clicks pour supporter les pompiers
DROP POLICY IF EXISTS "firetruck_clicks_insert" ON firetruck_clicks;
CREATE POLICY "firetruck_clicks_insert" ON firetruck_clicks FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR pompier_user_id IN (SELECT id FROM pompier_users WHERE user_id = auth.uid())
  );

-- 4. Push subscriptions : ajouter pompier_user_id
ALTER TABLE push_subscriptions
  ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE push_subscriptions
  ADD COLUMN pompier_user_id UUID REFERENCES pompier_users(id) ON DELETE CASCADE;

-- 5. Revert members role constraint (plus besoin de "pompier")
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
ALTER TABLE members ADD CONSTRAINT members_role_check CHECK (role IN ('admin', 'member'));
