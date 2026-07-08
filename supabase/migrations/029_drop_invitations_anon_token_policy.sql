-- Remove the dead invitations_select_by_token RLS policy.
--
-- 014_invitations.sql added this anon-readable SELECT policy "for safety" in
-- case the invite-accept flow ever switched to the anon key. It never did — the
-- auth callback and accept flow use the service-role client (which bypasses
-- RLS), so the policy grants nothing legitimate. What it DOES allow is any
-- holder of the public anon key to read pending invitations' token, email, and
-- role, then accept the invite and self-assign that role. Drop it; if an
-- anon-key read path is ever needed, add a scoped route instead.

DROP POLICY IF EXISTS invitations_select_by_token ON invitations;
