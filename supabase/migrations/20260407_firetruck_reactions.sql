-- Table des réactions aux clics firetruck (feed style chat)
CREATE TABLE IF NOT EXISTS firetruck_click_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  click_id UUID NOT NULL REFERENCES firetruck_clicks(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  pompier_user_id UUID REFERENCES pompier_users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT firetruck_reaction_one_user CHECK (
    (member_id IS NOT NULL AND pompier_user_id IS NULL) OR
    (member_id IS NULL AND pompier_user_id IS NOT NULL)
  )
);

-- Index partiel unique : un seul emoji par utilisateur par clic
CREATE UNIQUE INDEX firetruck_reaction_member_unique
  ON firetruck_click_reactions (click_id, member_id, emoji)
  WHERE member_id IS NOT NULL;

CREATE UNIQUE INDEX firetruck_reaction_pompier_unique
  ON firetruck_click_reactions (click_id, pompier_user_id, emoji)
  WHERE pompier_user_id IS NOT NULL;

ALTER TABLE firetruck_click_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firetruck_reactions_select" ON firetruck_click_reactions FOR SELECT
  USING (
    click_id IN (
      SELECT id FROM firetruck_clicks
      WHERE colocation_id IN (SELECT get_user_colocation_ids(auth.uid()))
    )
  );

CREATE POLICY "firetruck_reactions_insert" ON firetruck_click_reactions FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR pompier_user_id IN (SELECT id FROM pompier_users WHERE user_id = auth.uid())
  );

CREATE POLICY "firetruck_reactions_delete" ON firetruck_click_reactions FOR DELETE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR pompier_user_id IN (SELECT id FROM pompier_users WHERE user_id = auth.uid())
  );

-- Realtime pour le feed
ALTER PUBLICATION supabase_realtime ADD TABLE firetruck_clicks;
ALTER PUBLICATION supabase_realtime ADD TABLE firetruck_click_reactions;
