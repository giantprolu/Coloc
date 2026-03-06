-- 1. Emergency button permissions table
CREATE TABLE IF NOT EXISTS emergency_button_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  colocation_id UUID NOT NULL REFERENCES colocations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(colocation_id, member_id)
);
ALTER TABLE emergency_button_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view emergency permissions for their coloc"
  ON emergency_button_permissions FOR SELECT
  USING (
    colocation_id IN (
      SELECT colocation_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert emergency permissions"
  ON emergency_button_permissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
        AND colocation_id = emergency_button_permissions.colocation_id
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete emergency permissions"
  ON emergency_button_permissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
        AND colocation_id = emergency_button_permissions.colocation_id
        AND role = 'admin'
    )
  );

-- 2. Chat last read table (for unread badge)
CREATE TABLE IF NOT EXISTS chat_last_read (
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (member_id, channel_id)
);
ALTER TABLE chat_last_read ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own last read"
  ON chat_last_read FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can upsert their own last read"
  ON chat_last_read FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their own last read"
  ON chat_last_read FOR UPDATE
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- 3. Mentions column on chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';

-- 4. Dev permissions table
CREATE TABLE IF NOT EXISTS dev_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  colocation_id UUID NOT NULL REFERENCES colocations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(colocation_id, member_id)
);
ALTER TABLE dev_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view dev permissions for their coloc"
  ON dev_permissions FOR SELECT
  USING (
    colocation_id IN (
      SELECT colocation_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert dev permissions"
  ON dev_permissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
        AND colocation_id = dev_permissions.colocation_id
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete dev permissions"
  ON dev_permissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
        AND colocation_id = dev_permissions.colocation_id
        AND role = 'admin'
    )
  );
