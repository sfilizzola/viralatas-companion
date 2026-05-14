-- Add is_pinned column to announcements
-- Only one message can be pinned at a time (enforced in app logic).
-- Godlike and manager roles can update this field.

ALTER TABLE announcements ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Allow godlike and manager roles to update is_pinned on announcements.
-- Regular users cannot update any announcement field.
CREATE POLICY "privileged_pin_announcement" ON announcements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('godlike', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('godlike', 'manager')
    )
  );
